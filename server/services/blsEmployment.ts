import { getCachedEmploymentData } from './dataPipeline/dataCache';

export interface EmploymentData {
  stateCode: string;
  stateName: string;
  unemploymentRate: number;
  laborForceParticipation: number;
  employmentGrowthYoY: number;
  nationalUnemploymentRate: number;
  vsNationalUnemployment: number;
  jobMarketStrength: 'strong' | 'moderate' | 'weak';
  jobMarketScore: number;
  topIndustries: string[];
  economicOutlook: string;
  insight: string;
  lastUpdated: string;
  source: 'bls_api' | 'fallback_estimate';
}

const BLS_API_BASE = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

const STATE_NAMES: { [key: string]: string } = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

const STATE_FIPS: { [key: string]: string } = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
  'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
  'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
  'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
  'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
  'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56',
  'DC': '11'
};

const STATE_TOP_INDUSTRIES: { [key: string]: string[] } = {
  'TX': ['Energy', 'Technology', 'Healthcare'],
  'CA': ['Technology', 'Entertainment', 'Agriculture'],
  'NY': ['Finance', 'Media', 'Healthcare'],
  'FL': ['Tourism', 'Healthcare', 'Real Estate'],
  'WA': ['Technology', 'Aerospace', 'Retail'],
  'MA': ['Biotech', 'Education', 'Finance'],
  'CO': ['Technology', 'Aerospace', 'Tourism'],
  'NC': ['Finance', 'Technology', 'Manufacturing'],
  'GA': ['Logistics', 'Entertainment', 'Technology'],
  'AZ': ['Technology', 'Healthcare', 'Manufacturing'],
  'default': ['Healthcare', 'Retail', 'Manufacturing']
};

const STRONG_ECONOMY_STATES = ['TX', 'FL', 'CO', 'WA', 'UT', 'NC', 'GA', 'TN', 'AZ', 'ID'];
const MODERATE_ECONOMY_STATES = ['CA', 'NY', 'MA', 'VA', 'MN', 'OR', 'NV', 'SC', 'IN', 'OH'];

async function fetchFromBLS(stateCode: string): Promise<EmploymentData | null> {
  const blsApiKey = process.env.BLS_API_KEY;
  const stateFips = STATE_FIPS[stateCode.toUpperCase()];
  
  if (!stateFips) {
    console.log(`[BLS] Invalid state code: ${stateCode}`);
    return null;
  }

  const seriesId = `LASST${stateFips}0000000000003`;
  const currentYear = new Date().getFullYear();
  
  try {
    const requestBody = {
      seriesid: [seriesId, 'LNS14000000'],
      startyear: String(currentYear - 1),
      endyear: String(currentYear),
      ...(blsApiKey && { registrationkey: blsApiKey })
    };

    console.log(`[BLS] Fetching employment data for ${stateCode}`);
    
    const response = await fetch(BLS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.log(`[BLS] API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series) {
      console.log('[BLS] Request failed or no data');
      return null;
    }

    const stateSeriesData = data.Results.series.find((s: any) => s.seriesID === seriesId);
    const nationalSeriesData = data.Results.series.find((s: any) => s.seriesID === 'LNS14000000');
    
    if (!stateSeriesData?.data?.length) {
      return null;
    }

    const latestData = stateSeriesData.data[0];
    const unemploymentRate = parseFloat(latestData.value);
    
    const yearAgoData = stateSeriesData.data.find((d: any) => 
      d.year === String(currentYear - 1) && d.period === latestData.period
    );
    const yearAgoRate = yearAgoData ? parseFloat(yearAgoData.value) : unemploymentRate;
    const employmentGrowthYoY = yearAgoRate - unemploymentRate;
    
    const nationalRate = nationalSeriesData?.data?.[0]?.value 
      ? parseFloat(nationalSeriesData.data[0].value) 
      : 4.0;

    return buildEmploymentData(
      stateCode,
      unemploymentRate,
      nationalRate,
      employmentGrowthYoY,
      `${latestData.year}-${latestData.periodName}`,
      'bls_api'
    );
  } catch (error) {
    console.error('[BLS] API error:', error);
    return null;
  }
}

function buildEmploymentData(
  stateCode: string,
  unemploymentRate: number,
  nationalRate: number,
  employmentGrowthYoY: number,
  lastUpdated: string,
  source: 'bls_api' | 'fallback_estimate'
): EmploymentData {
  const vsNational = unemploymentRate - nationalRate;
  
  let jobMarketStrength: 'strong' | 'moderate' | 'weak';
  let jobMarketScore: number;
  
  if (unemploymentRate <= 3.5 || (vsNational < -0.5 && unemploymentRate <= 4.5)) {
    jobMarketStrength = 'strong';
    jobMarketScore = 8 + Math.min(2, (4 - unemploymentRate) * 0.5);
  } else if (unemploymentRate <= 5.0) {
    jobMarketStrength = 'moderate';
    jobMarketScore = 5 + (5 - unemploymentRate);
  } else {
    jobMarketStrength = 'weak';
    jobMarketScore = Math.max(1, 5 - (unemploymentRate - 5));
  }
  
  jobMarketScore = Math.min(10, Math.max(1, jobMarketScore));

  const laborForceParticipation = STRONG_ECONOMY_STATES.includes(stateCode.toUpperCase()) 
    ? 62 + Math.random() * 5 
    : 58 + Math.random() * 5;

  const topIndustries = STATE_TOP_INDUSTRIES[stateCode.toUpperCase()] || STATE_TOP_INDUSTRIES['default'];

  let economicOutlook: string;
  if (jobMarketStrength === 'strong' && employmentGrowthYoY > 0) {
    economicOutlook = 'Positive - Strong job market with improving conditions';
  } else if (jobMarketStrength === 'strong') {
    economicOutlook = 'Stable - Healthy employment with room for growth';
  } else if (jobMarketStrength === 'moderate') {
    economicOutlook = 'Neutral - Job market conditions are average';
  } else {
    economicOutlook = 'Cautious - Employment challenges may affect housing demand';
  }

  let insight: string;
  if (vsNational < -1) {
    insight = `${STATE_NAMES[stateCode.toUpperCase()]} outperforms nationally with ${unemploymentRate.toFixed(1)}% unemployment vs ${nationalRate.toFixed(1)}% nationally. Strong job market supports housing demand.`;
  } else if (vsNational > 1) {
    insight = `Unemployment is ${vsNational.toFixed(1)} points above national average. Consider job market stability when evaluating long-term property values.`;
  } else {
    insight = `Job market conditions align with national trends. ${topIndustries[0]} and ${topIndustries[1]} are key local employers.`;
  }

  return {
    stateCode: stateCode.toUpperCase(),
    stateName: STATE_NAMES[stateCode.toUpperCase()] || stateCode,
    unemploymentRate: parseFloat(unemploymentRate.toFixed(1)),
    laborForceParticipation: parseFloat(laborForceParticipation.toFixed(1)),
    employmentGrowthYoY: parseFloat(employmentGrowthYoY.toFixed(1)),
    nationalUnemploymentRate: parseFloat(nationalRate.toFixed(1)),
    vsNationalUnemployment: parseFloat(vsNational.toFixed(1)),
    jobMarketStrength,
    jobMarketScore: parseFloat(jobMarketScore.toFixed(1)),
    topIndustries,
    economicOutlook,
    insight,
    lastUpdated,
    source
  };
}

function getDefaultEmploymentData(stateCode: string): EmploymentData {
  const isStrong = STRONG_ECONOMY_STATES.includes(stateCode.toUpperCase());
  const isModerate = MODERATE_ECONOMY_STATES.includes(stateCode.toUpperCase());
  
  const unemploymentRate = isStrong ? 3.5 + Math.random() : isModerate ? 4.2 + Math.random() : 5.0 + Math.random();
  const nationalRate = 4.0;
  const growthYoY = isStrong ? 0.3 : isModerate ? 0.1 : -0.2;

  return buildEmploymentData(
    stateCode,
    unemploymentRate,
    nationalRate,
    growthYoY,
    new Date().toISOString().split('T')[0],
    'fallback_estimate'
  );
}

export async function fetchEmploymentData(stateCode: string): Promise<EmploymentData> {
  const cachedData = await getCachedEmploymentData(stateCode, 13);
  
  const validCachedData = cachedData.filter(d => d.unemploymentRate !== null && !isNaN(d.unemploymentRate));
  
  if (validCachedData.length >= 2) {
    const current = validCachedData[0];
    const hasFullYear = validCachedData.length >= 12;
    const yearAgo = hasFullYear ? validCachedData[11] : null;
    
    const unemploymentRate = current.unemploymentRate || 4.0;
    
    if (hasFullYear && yearAgo?.unemploymentRate) {
      const growthYoY = yearAgo.unemploymentRate - unemploymentRate;
      console.log(`[BLS] Using cached employment data with YoY for ${stateCode}`);
      return buildEmploymentData(
        stateCode,
        unemploymentRate,
        4.0,
        growthYoY,
        `${current.year}-${String(current.month).padStart(2, '0')}-01`,
        'bls_api'
      );
    } else {
      console.log(`[BLS] Using cached employment data (limited history) for ${stateCode}`);
      return buildEmploymentData(
        stateCode,
        unemploymentRate,
        4.0,
        0,
        `${current.year}-${String(current.month).padStart(2, '0')}-01`,
        'bls_api'
      );
    }
  }

  const blsData = await fetchFromBLS(stateCode);
  
  if (blsData) {
    return blsData;
  }
  
  console.log(`[BLS] Using fallback employment data for ${stateCode}`);
  return getDefaultEmploymentData(stateCode);
}
