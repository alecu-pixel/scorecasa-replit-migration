export interface FairMarketRent {
  zipCode: string;
  countyName: string;
  stateCode: string;
  fiscalYear: number;
  efficiency: number;
  oneBedroom: number;
  twoBedroom: number;
  threeBedroom: number;
  fourBedroom: number;
  smallAreaFMR: boolean;
  metroPrimaryEstimate: boolean;
  source: 'hud_api' | 'fallback_estimate';
}

export interface FMRComparison {
  fmr: FairMarketRent;
  marketRent: number;
  fmrVsMarket: number;
  section8Viable: boolean;
  section8Insight: string;
  rentalStrategyRecommendation: string;
}

const HUD_API_BASE = 'https://www.huduser.gov/hudapi/public/fmr';

// HUD's API is keyed by county (entity id = 5-digit county FIPS + "99999"), not ZIP.
// In "small area" metros (e.g. Houston) the answer lists rents for every ZIP in the county;
// elsewhere it is one county/metro-wide set. Cached per county for a week (HUD updates yearly).
const countyCache = new Map<string, { at: number; data: any }>();

async function fetchCountyFMR(countyFips: string, hudToken: string): Promise<any | null> {
  const hit = countyCache.get(countyFips);
  if (hit && Date.now() - hit.at < 7 * 24 * 60 * 60 * 1000) return hit.data;
  const response = await fetch(`${HUD_API_BASE}/data/${countyFips}99999`, {
    headers: { 'Authorization': `Bearer ${hudToken}`, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HUD API returned ${response.status}`);
  const data = (await response.json())?.data ?? null;
  countyCache.set(countyFips, { at: Date.now(), data });
  return data;
}

async function fetchFromHUD(zipCode: string, countyFips?: string | null): Promise<FairMarketRent | null> {
  const hudToken = (process.env.HUD_API_KEY || process.env.HUD_TOKEN)?.trim();
  if (!hudToken) {
    console.log('[HUD] No API token configured');
    return null;
  }
  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    console.log(`[HUD] No county FIPS for ZIP ${zipCode}; cannot query HUD`);
    return null;
  }

  try {
    const data = await fetchCountyFMR(countyFips, hudToken);
    if (!data?.basicdata) {
      console.log('[HUD] Unexpected response format');
      return null;
    }
    const rows = Array.isArray(data.basicdata) ? data.basicdata : [data.basicdata];
    const smallArea = data.smallarea_status === '1';
    // ZIP-level row when HUD publishes Small Area FMRs, otherwise the area-wide row
    const row = rows.find((r: any) => r.zip_code === zipCode)
      || rows.find((r: any) => !r.zip_code || /msa/i.test(String(r.zip_code)))
      || rows[0];
    const usesZipRow = row?.zip_code === zipCode;
    const pick = (r: any, ...names: string[]) => { for (const n of names) if (Number(r?.[n]) > 0) return Number(r[n]); return 0; };

    console.log(`[HUD] FY${data.year} FMR for ZIP ${zipCode} (${usesZipRow ? 'ZIP level' : 'area level'}), ${data.county_name}`);
    return {
      zipCode,
      countyName: data.county_name || data.area_name || 'Unknown County',
      stateCode: '',
      fiscalYear: parseInt(data.year) || new Date().getFullYear(),
      efficiency: pick(row, 'Efficiency'),
      oneBedroom: pick(row, 'One-Bedroom', 'One_Bedroom'),
      twoBedroom: pick(row, 'Two-Bedroom', 'Two_Bedroom'),
      threeBedroom: pick(row, 'Three-Bedroom', 'Three_Bedroom'),
      fourBedroom: pick(row, 'Four-Bedroom', 'Four_Bedroom'),
      smallAreaFMR: smallArea && usesZipRow,
      metroPrimaryEstimate: data.metro_status === '1',
      source: 'hud_api'
    };
  } catch (error: any) {
    console.error('[HUD] API error:', error.message);
    return null;
  }
}

function estimateFMRFromCensus(
  zipCode: string,
  medianRent: number,
  stateCode: string
): FairMarketRent {
  const multiplier = 1.05;
  const baseFMR = Math.round(medianRent * multiplier);
  
  return {
    zipCode,
    countyName: 'Estimated',
    stateCode,
    fiscalYear: new Date().getFullYear(),
    efficiency: Math.round(baseFMR * 0.70),
    oneBedroom: Math.round(baseFMR * 0.85),
    twoBedroom: baseFMR,
    threeBedroom: Math.round(baseFMR * 1.25),
    fourBedroom: Math.round(baseFMR * 1.45),
    smallAreaFMR: false,
    metroPrimaryEstimate: false,
    source: 'fallback_estimate'
  };
}

export async function fetchFairMarketRent(
  zipCode: string,
  medianRentFallback: number,
  stateCode: string,
  countyFips?: string | null
): Promise<FairMarketRent> {
  const hudData = await fetchFromHUD(zipCode, countyFips);
  
  if (hudData) {
    return hudData;
  }
  
  console.log(`[HUD] Using fallback FMR estimate for ZIP ${zipCode}`);
  return estimateFMRFromCensus(zipCode, medianRentFallback, stateCode);
}

export function analyzeFMRComparison(
  fmr: FairMarketRent,
  marketRent: number,
  bedroomCount: number = 2
): FMRComparison {
  let fmrForUnit: number;
  
  switch (bedroomCount) {
    case 0:
      fmrForUnit = fmr.efficiency;
      break;
    case 1:
      fmrForUnit = fmr.oneBedroom;
      break;
    case 2:
      fmrForUnit = fmr.twoBedroom;
      break;
    case 3:
      fmrForUnit = fmr.threeBedroom;
      break;
    case 4:
    default:
      fmrForUnit = fmr.fourBedroom;
      break;
  }

  const fmrVsMarket = marketRent > 0 
    ? ((fmrForUnit - marketRent) / marketRent) * 100 
    : 0;

  const section8Viable = fmrForUnit >= marketRent * 0.90;

  let section8Insight: string;
  let rentalStrategyRecommendation: string;

  if (fmrVsMarket >= 10) {
    section8Insight = `FMR is ${fmrVsMarket.toFixed(0)}% above market rent. Excellent Section 8 opportunity - voucher covers full market rent with room to spare.`;
    rentalStrategyRecommendation = 'Section 8 tenants are highly viable. Consider marketing to voucher holders for guaranteed rent.';
  } else if (fmrVsMarket >= 0) {
    section8Insight = `FMR roughly matches market rent. Section 8 vouchers will cover typical rents in this area.`;
    rentalStrategyRecommendation = 'Mixed strategy - both market-rate and Section 8 tenants are viable options.';
  } else if (fmrVsMarket >= -10) {
    section8Insight = `FMR is ${Math.abs(fmrVsMarket).toFixed(0)}% below market rent. Section 8 may cover most but not all market rents.`;
    rentalStrategyRecommendation = 'Section 8 viable for units priced at or slightly below market. Consider rent adjustment.';
  } else {
    section8Insight = `FMR is significantly below market rent (${Math.abs(fmrVsMarket).toFixed(0)}% gap). Section 8 vouchers likely insufficient.`;
    rentalStrategyRecommendation = 'Focus on market-rate tenants. Section 8 not economically viable without significant rent reduction.';
  }

  return {
    fmr,
    marketRent,
    fmrVsMarket: parseFloat(fmrVsMarket.toFixed(1)),
    section8Viable,
    section8Insight,
    rentalStrategyRecommendation
  };
}
