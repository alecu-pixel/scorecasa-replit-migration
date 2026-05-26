import zlib from 'zlib';
import { db } from '../db';
import { jobsData, type JobsDataRecord } from '@shared/schema';
import type { JobsProximityData } from '@shared/schema';
import { eq } from 'drizzle-orm';

const LODES_DATA_YEAR = 2021;
const LODES_BASE = 'https://lehd.ces.census.gov/data/lodes/LODES8';

const STATE_FIPS_TO_ABBR: Record<string, string> = {
  '01': 'al', '02': 'ak', '04': 'az', '05': 'ar', '06': 'ca',
  '08': 'co', '09': 'ct', '10': 'de', '11': 'dc', '12': 'fl',
  '13': 'ga', '15': 'hi', '16': 'id', '17': 'il', '18': 'in',
  '19': 'ia', '20': 'ks', '21': 'ky', '22': 'la', '23': 'me',
  '24': 'md', '25': 'ma', '26': 'mi', '27': 'mn', '28': 'ms',
  '29': 'mo', '30': 'mt', '31': 'ne', '32': 'nv', '33': 'nh',
  '34': 'nj', '35': 'nm', '36': 'ny', '37': 'nc', '38': 'nd',
  '39': 'oh', '40': 'ok', '41': 'or', '42': 'pa', '44': 'ri',
  '45': 'sc', '46': 'sd', '47': 'tn', '48': 'tx', '49': 'ut',
  '50': 'vt', '51': 'va', '53': 'wa', '54': 'wv', '55': 'wi',
  '56': 'wy', '72': 'pr',
};

const SECTOR_NAMES: Record<string, string> = {
  CNS01: 'Agriculture & Forestry',
  CNS02: 'Mining & Extraction',
  CNS03: 'Utilities',
  CNS04: 'Construction',
  CNS05: 'Manufacturing',
  CNS06: 'Wholesale Trade',
  CNS07: 'Retail Trade',
  CNS08: 'Transportation & Warehousing',
  CNS09: 'Information & Technology',
  CNS10: 'Finance & Insurance',
  CNS11: 'Real Estate',
  CNS12: 'Professional & Technical Services',
  CNS13: 'Management',
  CNS14: 'Administrative & Waste Services',
  CNS15: 'Educational Services',
  CNS16: 'Healthcare & Social Assistance',
  CNS17: 'Arts & Entertainment',
  CNS18: 'Accommodation & Food Services',
  CNS19: 'Other Services',
  CNS20: 'Public Administration',
};

const SECTOR_COLUMNS = [
  'CNS01', 'CNS02', 'CNS03', 'CNS04', 'CNS05', 'CNS06', 'CNS07',
  'CNS08', 'CNS09', 'CNS10', 'CNS11', 'CNS12', 'CNS13', 'CNS14',
  'CNS15', 'CNS16', 'CNS17', 'CNS18', 'CNS19', 'CNS20',
];

const stateDownloadInProgress = new Set<string>();

function classifyJobDensity(totalJobs: number): JobsProximityData['jobDensity'] {
  if (totalJobs < 250) return 'very_low';
  if (totalJobs < 1500) return 'low';
  if (totalJobs < 8000) return 'moderate';
  if (totalJobs < 30000) return 'high';
  return 'very_high';
}

const JOB_DENSITY_LABELS: Record<string, string> = {
  very_low: 'Minimal Job Activity',
  low: 'Light Job Activity',
  moderate: 'Moderate Employment Center',
  high: 'High Employment Center',
  very_high: 'Major Employment Hub',
};

function buildInsight(totalJobs: number, density: string, topSectors: { name: string; jobs: number }[]): string {
  const top = topSectors.slice(0, 2).map(s => s.name).join(' and ');
  if (density === 'very_low') {
    return `This census tract has minimal job activity (${totalJobs.toLocaleString()} workplace jobs), indicating a primarily residential area. Commute access to employment centers is a key consideration.`;
  }
  if (density === 'low') {
    return `This tract has limited local employment (${totalJobs.toLocaleString()} jobs), with ${top || 'mixed sectors'} as the main activity. Most residents likely commute to larger employment hubs.`;
  }
  if (density === 'moderate') {
    return `This tract contains ${totalJobs.toLocaleString()} workplace jobs, led by ${top || 'mixed sectors'}. Moderate local employment reduces commute dependency — a positive factor for renters and buyers alike.`;
  }
  if (density === 'high') {
    return `Strong employment hub with ${totalJobs.toLocaleString()} jobs, primarily in ${top || 'diverse sectors'}. High job density supports strong rental demand, lower vacancy risk, and sustained property values.`;
  }
  return `Major employment center with ${totalJobs.toLocaleString()} workplace jobs — a significant economic anchor. Proximity to large employment hubs like this is a leading driver of long-term real estate appreciation and rental income stability.`;
}

async function downloadAndCacheState(stateAbbr: string, stateFips: string): Promise<void> {
  if (stateDownloadInProgress.has(stateAbbr)) {
    console.log(`[LODES] Download already in progress for ${stateAbbr}, skipping`);
    return;
  }

  stateDownloadInProgress.add(stateAbbr);
  const url = `${LODES_BASE}/${stateAbbr}/wac/${stateAbbr}_wac_S000_JT00_${LODES_DATA_YEAR}.csv.gz`;
  console.log(`[LODES] Downloading WAC file for ${stateAbbr.toUpperCase()} from ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ScoreCasa/1.0' },
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`LODES returned ${response.status} for ${stateAbbr}`);
    }

    const tractJobs: Map<string, { total: number; sectors: Record<string, number> }> = new Map();
    let header: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const gunzip = zlib.createGunzip();
      let buffer = '';
      let lineCount = 0;

      gunzip.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          lineCount++;

          if (lineCount === 1) {
            header = line.split(',');
            continue;
          }

          const cols = line.split(',');
          if (cols.length < 2) continue;

          const geocode = cols[0];
          if (!geocode || geocode.length < 11) continue;
          const tract = geocode.slice(0, 11);
          const totalJobs = parseInt(cols[1]) || 0;

          const entry = tractJobs.get(tract) || { total: 0, sectors: {} };
          entry.total += totalJobs;

          for (const sectorKey of SECTOR_COLUMNS) {
            const colIdx = header.indexOf(sectorKey);
            if (colIdx > 0) {
              const val = parseInt(cols[colIdx]) || 0;
              entry.sectors[sectorKey] = (entry.sectors[sectorKey] || 0) + val;
            }
          }

          tractJobs.set(tract, entry);
        }
      });

      gunzip.on('error', reject);
      gunzip.on('end', () => resolve());

      (async () => {
        try {
          const reader = (response.body as any).getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) { gunzip.end(); break; }
            gunzip.write(Buffer.from(value));
          }
        } catch (err) {
          reject(err);
        }
      })();
    });

    console.log(`[LODES] Parsed ${tractJobs.size} census tracts for ${stateAbbr.toUpperCase()}`);

    const inserts = Array.from(tractJobs.entries()).map(([tract, data]) => {
      const sectors = Object.entries(data.sectors)
        .map(([k, v]) => ({ key: k, jobs: v }))
        .sort((a, b) => b.jobs - a.jobs)
        .slice(0, 5);

      return {
        censusTract: tract,
        stateCode: stateFips,
        totalJobs: data.total,
        dataYear: LODES_DATA_YEAR,
        sectorsJson: JSON.stringify(sectors),
      };
    });

    const BATCH_SIZE = 500;
    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
      const batch = inserts.slice(i, i + BATCH_SIZE);
      await db.insert(jobsData).values(batch).onConflictDoNothing();
    }

    console.log(`[LODES] Cached ${inserts.length} tract records for ${stateAbbr.toUpperCase()}`);
  } catch (err: any) {
    console.error(`[LODES] Error downloading ${stateAbbr}:`, err.message);
  } finally {
    stateDownloadInProgress.delete(stateAbbr);
  }
}

export async function getJobsProximity(censusTract: string): Promise<JobsProximityData | null> {
  if (!censusTract || censusTract.length < 11) return null;

  const stateFips = censusTract.slice(0, 2);
  const stateAbbr = STATE_FIPS_TO_ABBR[stateFips];
  if (!stateAbbr) {
    console.log(`[LODES] Unknown state FIPS: ${stateFips}`);
    return null;
  }

  try {
    const existing = await db.select().from(jobsData).where(eq(jobsData.censusTract, censusTract)).limit(1);

    if (existing.length > 0) {
      return buildResult(existing[0]);
    }

    const stateHasData = await db.select({ ct: jobsData.censusTract })
      .from(jobsData)
      .where(eq(jobsData.stateCode, stateFips))
      .limit(1);

    if (stateHasData.length === 0) {
      downloadAndCacheState(stateAbbr, stateFips).catch(err =>
        console.error('[LODES] Background download error:', err.message)
      );

      console.log(`[LODES] Triggered background download for ${stateAbbr.toUpperCase()}, will be available on next request`);
      return null;
    }

    console.log(`[LODES] State ${stateAbbr.toUpperCase()} data exists but tract ${censusTract} not found (0 jobs)`);
    return buildZeroResult(censusTract);
  } catch (err: any) {
    console.error('[LODES] Lookup error:', err.message);
    return null;
  }
}

function buildResult(record: JobsDataRecord): JobsProximityData {
  const density = classifyJobDensity(record.totalJobs);
  let topSectors: { name: string; jobs: number }[] = [];

  try {
    const raw = JSON.parse(record.sectorsJson || '[]') as { key: string; jobs: number }[];
    topSectors = raw
      .filter(s => s.jobs > 0)
      .map(s => ({ name: SECTOR_NAMES[s.key] || s.key, jobs: s.jobs }))
      .slice(0, 5);
  } catch {}

  return {
    censusTract: record.censusTract,
    totalJobs: record.totalJobs,
    jobDensity: density,
    jobDensityLabel: JOB_DENSITY_LABELS[density],
    topSectors,
    insight: buildInsight(record.totalJobs, density, topSectors),
    dataSource: `Census LEHD/LODES ${record.dataYear}`,
    dataYear: record.dataYear,
  };
}

function buildZeroResult(censusTract: string): JobsProximityData {
  return {
    censusTract,
    totalJobs: 0,
    jobDensity: 'very_low',
    jobDensityLabel: JOB_DENSITY_LABELS['very_low'],
    topSectors: [],
    insight: 'No workplace jobs recorded in this census tract — this is likely a residential-only area. Commute access to nearby employment centers is an important consideration.',
    dataSource: `Census LEHD/LODES ${LODES_DATA_YEAR}`,
    dataYear: LODES_DATA_YEAR,
  };
}
