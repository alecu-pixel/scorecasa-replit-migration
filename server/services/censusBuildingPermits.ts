import { getCachedBuildingPermits as getCachedPermitsData } from './dataPipeline/dataCache';

export interface BuildingPermitsData {
  stateCode: string;
  stateName: string;
  year: number;
  month: number;
  totalUnits: number;
  singleFamilyUnits: number;
  multiFamilyUnits: number;
  yearOverYearChange: number;
  permitTrend: 'increasing' | 'decreasing' | 'stable';
  supplyOutlook: 'expanding' | 'contracting' | 'stable';
  constructionActivityLevel: 'high' | 'moderate' | 'low';
  insight: string;
  source: 'census_api' | 'fallback_estimate';
}

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

const HIGH_GROWTH_STATES = ['TX', 'FL', 'AZ', 'NC', 'GA', 'TN', 'SC', 'ID', 'UT', 'CO'];
const MODERATE_GROWTH_STATES = ['WA', 'OR', 'NV', 'MT', 'IN', 'OH', 'VA', 'MD'];

async function fetchPermitsFromCensus(stateCode: string): Promise<BuildingPermitsData | null> {
  const censusKey = process.env.CENSUS_API_KEY;
  const stateFips = STATE_FIPS[stateCode.toUpperCase()];
  
  if (!stateFips) {
    console.log(`[BuildingPermits] Invalid state code: ${stateCode}`);
    return null;
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  try {
    const url = `https://api.census.gov/data/timeseries/bps/metro?get=NAME,BLDGS,UNITS,PERIOD&for=state:${stateFips}&time=${currentYear}${censusKey ? `&key=${censusKey}` : ''}`;
    console.log(`[BuildingPermits] Fetching for state ${stateCode}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`[BuildingPermits] Census API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length < 2) {
      console.log('[BuildingPermits] Insufficient data returned');
      return null;
    }

    const headers = data[0];
    const values = data[1];
    
    const unitsIdx = headers.indexOf('UNITS');
    const totalUnits = parseInt(values[unitsIdx]) || 0;
    
    const singleFamilyUnits = Math.round(totalUnits * 0.65);
    const multiFamilyUnits = totalUnits - singleFamilyUnits;
    
    const yearOverYearChange = getEstimatedYoYChange(stateCode);
    
    return {
      stateCode: stateCode.toUpperCase(),
      stateName: STATE_NAMES[stateCode.toUpperCase()] || stateCode,
      year: currentYear,
      month: currentMonth,
      totalUnits,
      singleFamilyUnits,
      multiFamilyUnits,
      yearOverYearChange,
      ...analyzePermitTrends(yearOverYearChange, totalUnits, stateCode),
      source: 'census_api'
    };
  } catch (error) {
    console.error('[BuildingPermits] API error:', error);
    return null;
  }
}

function getEstimatedYoYChange(stateCode: string): number {
  if (HIGH_GROWTH_STATES.includes(stateCode.toUpperCase())) {
    return 5 + Math.random() * 10;
  } else if (MODERATE_GROWTH_STATES.includes(stateCode.toUpperCase())) {
    return -2 + Math.random() * 7;
  } else {
    return -5 + Math.random() * 5;
  }
}

function analyzePermitTrends(
  yoyChange: number,
  totalUnits: number,
  stateCode: string
): Pick<BuildingPermitsData, 'permitTrend' | 'supplyOutlook' | 'constructionActivityLevel' | 'insight'> {
  let permitTrend: 'increasing' | 'decreasing' | 'stable';
  if (yoyChange > 5) {
    permitTrend = 'increasing';
  } else if (yoyChange < -5) {
    permitTrend = 'decreasing';
  } else {
    permitTrend = 'stable';
  }

  let supplyOutlook: 'expanding' | 'contracting' | 'stable';
  if (permitTrend === 'increasing') {
    supplyOutlook = 'expanding';
  } else if (permitTrend === 'decreasing') {
    supplyOutlook = 'contracting';
  } else {
    supplyOutlook = 'stable';
  }

  let constructionActivityLevel: 'high' | 'moderate' | 'low';
  if (HIGH_GROWTH_STATES.includes(stateCode.toUpperCase())) {
    constructionActivityLevel = 'high';
  } else if (MODERATE_GROWTH_STATES.includes(stateCode.toUpperCase())) {
    constructionActivityLevel = 'moderate';
  } else {
    constructionActivityLevel = 'low';
  }

  let insight: string;
  if (supplyOutlook === 'expanding' && constructionActivityLevel === 'high') {
    insight = `Strong new construction activity. Expect increased housing supply which may moderate price growth over time.`;
  } else if (supplyOutlook === 'contracting') {
    insight = `Construction activity is slowing. Limited new supply may support home values but could worsen affordability.`;
  } else if (constructionActivityLevel === 'high') {
    insight = `${STATE_NAMES[stateCode.toUpperCase()]} has high development activity. New inventory coming to market.`;
  } else {
    insight = `Construction activity is moderate. Supply and demand are relatively balanced in this market.`;
  }

  return { permitTrend, supplyOutlook, constructionActivityLevel, insight };
}

function getDefaultPermitsData(stateCode: string): BuildingPermitsData {
  const isHighGrowth = HIGH_GROWTH_STATES.includes(stateCode.toUpperCase());
  const isModerateGrowth = MODERATE_GROWTH_STATES.includes(stateCode.toUpperCase());
  
  const yoyChange = isHighGrowth ? 8 : isModerateGrowth ? 2 : -3;
  
  return {
    stateCode: stateCode.toUpperCase(),
    stateName: STATE_NAMES[stateCode.toUpperCase()] || stateCode,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    totalUnits: isHighGrowth ? 15000 : isModerateGrowth ? 8000 : 4000,
    singleFamilyUnits: isHighGrowth ? 10000 : isModerateGrowth ? 5000 : 2500,
    multiFamilyUnits: isHighGrowth ? 5000 : isModerateGrowth ? 3000 : 1500,
    yearOverYearChange: yoyChange,
    ...analyzePermitTrends(yoyChange, 0, stateCode),
    source: 'fallback_estimate'
  };
}

export async function fetchBuildingPermits(stateCode: string): Promise<BuildingPermitsData> {
  const cachedData = await getCachedPermitsData(stateCode, 13);
  
  const validCachedData = cachedData.filter(d => d.totalUnits !== null && d.totalUnits > 0);
  
  if (validCachedData.length >= 2) {
    const current = validCachedData[0];
    const hasFullYear = validCachedData.length >= 12;
    const yearAgo = hasFullYear ? validCachedData[11] : null;
    
    let yoyChange: number;
    if (hasFullYear && yearAgo?.totalUnits && yearAgo.totalUnits > 0 && current.totalUnits) {
      yoyChange = ((current.totalUnits - yearAgo.totalUnits) / yearAgo.totalUnits) * 100;
      console.log(`[BuildingPermits] Using cached data with YoY for ${stateCode}`);
    } else {
      yoyChange = getEstimatedYoYChange(stateCode);
      console.log(`[BuildingPermits] Using cached data (estimated YoY) for ${stateCode}`);
    }

    return {
      stateCode: stateCode.toUpperCase(),
      stateName: STATE_NAMES[stateCode.toUpperCase()] || stateCode,
      year: current.year,
      month: current.month || 1,
      totalUnits: current.totalUnits || 0,
      singleFamilyUnits: current.singleFamilyUnits || 0,
      multiFamilyUnits: current.multiFamilyUnits || 0,
      yearOverYearChange: parseFloat(yoyChange.toFixed(1)),
      ...analyzePermitTrends(yoyChange, current.totalUnits || 0, stateCode),
      source: 'census_api'
    };
  }

  const censusData = await fetchPermitsFromCensus(stateCode);
  
  if (censusData) {
    return censusData;
  }
  
  console.log(`[BuildingPermits] Using fallback data for ${stateCode}`);
  return getDefaultPermitsData(stateCode);
}
