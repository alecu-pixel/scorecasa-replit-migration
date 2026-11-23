// Property-level figures (Rent Zestimate, Zestimate, list price, tax rate, beds/baths)
// from the Zillow data behind the "US Housing Market Data" RapidAPI subscription.
// Two calls per address: exact-address search -> zpid, then property details.

const HOST = 'us-housing-market-data1.p.rapidapi.com';
const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: PropertySnapshot | null }>();

export interface PropertySnapshot {
  zpid: number;
  rentEstimate: number | null;   // Zillow Rent Zestimate, $/month
  valueEstimate: number | null;  // Zillow Zestimate
  listPrice: number | null;      // only when the home is for sale
  homeStatus: string | null;     // e.g. FOR_SALE, SOLD, OTHER
  taxRate: number | null;        // % of value per year (county rate from Zillow)
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  yearBuilt: number | null;
  homeType: string | null;
  hoaMonthly: number | null;
  source: 'Zillow';
}

async function call(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': HOST },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const num = (v: any): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function fetchPropertySnapshot(address: string): Promise<PropertySnapshot | null> {
  const apiKey = process.env.RAPIDAPI_KEY?.trim();
  if (!apiKey || !address) return null;
  const key = address.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  let data: PropertySnapshot | null = null;
  try {
    // An exact address match returns just { zpid }; a vague one returns a list of homes, which we ignore.
    const search = await call(`/propertyExtendedSearch?${new URLSearchParams({ location: address })}`, apiKey);
    const zpid = num(search?.zpid);
    if (zpid) {
      const p = await call(`/property?zpid=${zpid}`, apiKey);
      const homeStatus = typeof p?.homeStatus === 'string' ? p.homeStatus : null;
      data = {
        zpid,
        rentEstimate: num(p?.rentZestimate),
        valueEstimate: num(p?.zestimate),
        listPrice: homeStatus === 'FOR_SALE' ? num(p?.price) : null,
        homeStatus,
        taxRate: num(p?.propertyTaxRate),
        bedrooms: num(p?.bedrooms),
        bathrooms: num(p?.bathrooms),
        livingArea: num(p?.livingArea),
        yearBuilt: num(p?.yearBuilt),
        homeType: typeof p?.homeType === 'string' ? p.homeType : null,
        hoaMonthly: num(p?.monthlyHoaFee),
        source: 'Zillow',
      };
      console.log(`[Property] ${address}: rent ${data.rentEstimate}, value ${data.valueEstimate}, list ${data.listPrice}, tax ${data.taxRate}%`);
    } else {
      console.log(`[Property] No exact Zillow match for ${address}`);
    }
  } catch (err: any) {
    console.warn('[Property] Zillow lookup failed:', err.message);
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}
