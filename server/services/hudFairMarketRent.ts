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

async function fetchFromHUD(zipCode: string): Promise<FairMarketRent | null> {
  const hudToken = process.env.HUD_API_KEY || process.env.HUD_TOKEN;
  
  if (!hudToken) {
    console.log('[HUD] No API key configured');
    return null;
  }

  const currentYear = new Date().getFullYear();
  const fiscalYear = currentYear;
  
  try {
    const url = `${HUD_API_BASE}/data/${zipCode}?year=${fiscalYear}`;
    console.log(`[HUD] Fetching FMR for ZIP ${zipCode}, FY${fiscalYear}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${hudToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`[HUD] API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.data || !data.data.basicdata) {
      console.log('[HUD] Unexpected response format');
      return null;
    }

    const basicData = data.data.basicdata;
    
    return {
      zipCode,
      countyName: basicData.county_name || 'Unknown County',
      stateCode: basicData.state_name || '',
      fiscalYear,
      efficiency: basicData.Efficiency || 0,
      oneBedroom: basicData.One_Bedroom || 0,
      twoBedroom: basicData.Two_Bedroom || 0,
      threeBedroom: basicData.Three_Bedroom || 0,
      fourBedroom: basicData.Four_Bedroom || 0,
      smallAreaFMR: basicData.smallarea_status === '1',
      metroPrimaryEstimate: basicData.metro === '1',
      source: 'hud_api'
    };
  } catch (error) {
    console.error('[HUD] API error:', error);
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
  stateCode: string
): Promise<FairMarketRent> {
  const hudData = await fetchFromHUD(zipCode);
  
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
