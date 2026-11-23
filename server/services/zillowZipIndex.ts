// ZIP-level rent and home value from Zillow Research's free public files:
//  - ZORI: Zillow Observed Rent Index (typical asking rent, all home types), ~10 MB
//  - ZHVI: Zillow Home Value Index (typical home value, mid tier), ~125 MB
// Both are monthly. They are streamed once a week and only the latest value per ZIP is kept,
// so memory use is tiny. Until loaded, lookups return null and callers fall back to Census.

const FILES = {
  rent: 'https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv',
  value: 'https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
} as const;
type Kind = keyof typeof FILES;

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const state: Record<Kind, { at: number; asOf: string | null; byZip: Map<string, number>; loading: Promise<void> | null }> = {
  rent: { at: 0, asOf: null, byZip: new Map(), loading: null },
  value: { at: 0, asOf: null, byZip: new Map(), loading: null },
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function load(kind: Kind): Promise<void> {
  const started = Date.now();
  const res = await fetch(FILES[kind], { signal: AbortSignal.timeout(180000) });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const byZip = new Map<string, number>();
  let header: string[] | null = null;
  let zipCol = -1;
  let firstDateCol = -1;
  let buffer = '';
  const decoder = new TextDecoder();

  const handle = (line: string) => {
    if (!line) return;
    const cols = splitCsvLine(line);
    if (!header) {
      header = cols;
      zipCol = cols.indexOf('RegionName');
      firstDateCol = cols.findIndex(c => /^\d{4}-\d{2}-\d{2}$/.test(c));
      return;
    }
    const zip = cols[zipCol]?.padStart(5, '0');
    // Latest non-empty month for this ZIP
    for (let i = cols.length - 1; i >= firstDateCol; i--) {
      const v = parseFloat(cols[i]);
      if (Number.isFinite(v) && v > 0) { byZip.set(zip, Math.round(v)); break; }
    }
  };

  const reader = (res.body as any).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      handle(buffer.slice(0, nl).replace(/\r$/, ''));
      buffer = buffer.slice(nl + 1);
    }
  }
  handle(buffer.replace(/\r$/, ''));

  const h = header as string[] | null;
  state[kind].byZip = byZip;
  state[kind].asOf = h ? h[h.length - 1] : null;
  state[kind].at = Date.now();
  console.log(`[ZillowZip] Loaded ${kind}: ${byZip.size} ZIPs as of ${state[kind].asOf} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

function ensure(kind: Kind): Promise<void> {
  const s = state[kind];
  if (s.loading) return s.loading;
  if (s.byZip.size && Date.now() - s.at < REFRESH_MS) return Promise.resolve();
  s.loading = load(kind)
    .catch(err => { console.warn(`[ZillowZip] ${kind} load failed:`, err.message); s.at = Date.now() - REFRESH_MS + 60 * 60 * 1000; })
    .finally(() => { s.loading = null; });
  return s.loading;
}

/** Start loading both files in the background (call at server start). */
export function warmZillowZipIndex(): void {
  ensure('rent');
  ensure('value');
}

export interface ZipMarketIndex {
  typicalRent: number | null;
  typicalHomeValue: number | null;
  rentAsOf: string | null;
  valueAsOf: string | null;
}

/** Latest Zillow ZIP figures. Waits at most `waitMs` for a load in progress. */
export async function getZillowZipIndex(zip: string, waitMs = 3000): Promise<ZipMarketIndex> {
  const pending = Promise.all([ensure('rent'), ensure('value')]);
  await Promise.race([pending, new Promise(r => setTimeout(r, waitMs))]);
  const z = zip.padStart(5, '0');
  return {
    typicalRent: state.rent.byZip.get(z) ?? null,
    typicalHomeValue: state.value.byZip.get(z) ?? null,
    rentAsOf: state.rent.asOf,
    valueAsOf: state.value.asOf,
  };
}
