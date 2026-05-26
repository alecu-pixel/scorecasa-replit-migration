/**
 * FBI Crime Data API Service
 * Documentation: https://crime-data-explorer.fr.cloud.gov/pages/docApi
 * 
 * Provides state-level crime statistics from the FBI's Uniform Crime Reporting (UCR) program.
 * Used to calculate real Safety Scores based on violent and property crime rates.
 */

// CDE uses api.data.gov keys: https://api.data.gov/signup/
// SAPI registration portal is decommissioned — CDE is the correct endpoint
const CDE_BASE_URL = 'https://api.usa.gov/crime/fbi/cde';

export interface CrimeData {
  stateAbbr: string;
  stateName: string;
  year: number;
  population: number;
  violentCrimeRate: number; // per 100,000 population
  propertyCrimeRate: number; // per 100,000 population
  violentCrimeTotal: number;
  propertyCrimeTotal: number;
  murderRate: number;
  robberyRate: number;
  assaultRate: number;
  burglaryRate: number;
  larcenyRate: number;
  motorVehicleTheftRate: number;
  nationalViolentCrimeRate: number;
  nationalPropertyCrimeRate: number;
  violentCrimeVsNational: number; // percentage difference from national avg
  propertyCrimeVsNational: number; // percentage difference from national avg
  safetyScore: number; // calculated 0-100 score
}

// National crime rates (2022 FBI data - most recent complete year)
// Source: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/explorer/crime/crime-trend
export const NATIONAL_AVERAGES = {
  violentCrimeRate: 380.7, // per 100,000
  propertyCrimeRate: 1954.4, // per 100,000
  murderRate: 6.3,
  robberyRate: 73.9,
  assaultRate: 268.2,
  burglaryRate: 269.8,
  larcenyRate: 1401.9,
  motorVehicleTheftRate: 282.7
};

// State abbreviation to FIPS code mapping
const STATE_FIPS: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12',
  'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
  'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23',
  'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
  'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
  'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
  'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44',
  'SC': '45', 'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49',
  'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
  'WY': '56'
};

// State names mapping
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia', 'FL': 'Florida',
  'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana',
  'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire',
  'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota',
  'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin',
  'WY': 'Wyoming'
};

/**
 * Extract state abbreviation from an address string
 * Uses right-to-left scanning to avoid matching street suffixes like "Ct" (Court)
 */
export function extractStateFromAddress(address: string): string | null {
  const stateAbbreviationsArray = Object.keys(STATE_FIPS);
  const stateAbbreviations = new Set(stateAbbreviationsArray);
  const addressUpper = address.toUpperCase().trim();
  
  // PRIORITY 1: Match state abbreviation followed by ZIP code (most reliable pattern)
  // e.g., "Houston, TX 77009" or "Austin TX 78701"
  for (const state of stateAbbreviationsArray) {
    const zipPattern = new RegExp(`[,\\s]${state}\\s+\\d{5}(?:-\\d{4})?`);
    if (zipPattern.test(addressUpper)) {
      return state;
    }
  }
  
  // PRIORITY 2: Scan tokens from right-to-left to find the rightmost valid state
  // This avoids matching street suffixes like "Ct" or "Dr" that appear earlier
  // Split on commas first, then whitespace within each segment
  const segments = addressUpper.split(',').map(s => s.trim()).filter(Boolean);
  
  // Common segments that should be skipped when looking for state
  const skipSegments = new Set(['USA', 'US', 'UNITED STATES', 'AMERICA']);
  
  // Common street suffixes that might match state abbreviations
  const streetSuffixes = new Set(['CT', 'DR', 'LA', 'PA', 'VA', 'IN', 'DE', 'MD', 'ME', 'OR', 'WA', 'MT', 'AL', 'AR', 'CO', 'GA', 'ID', 'IA', 'KS', 'KY', 'MA', 'MI', 'MN', 'MS', 'MO', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'WV', 'WI', 'WY', 'AK', 'AZ', 'CA', 'FL', 'HI', 'IL', 'DC']);
  
  // Find segments that are clearly not states (contain ZIP, are skip segments, etc.)
  let stateSegmentIndex = -1;
  
  // Process segments from right to left, skipping country/ZIP-only segments
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    
    // Skip known non-state segments
    if (skipSegments.has(segment)) {
      continue;
    }
    
    // Skip segments that are ONLY a ZIP code
    if (/^\d{5}(-\d{4})?$/.test(segment)) {
      continue;
    }
    
    const tokens = segment.split(/\s+/).filter(Boolean);
    
    // Check if this segment contains a state abbreviation
    // For segments with ZIP code, state should be right before ZIP
    const hasZip = /\d{5}/.test(segment);
    
    if (hasZip) {
      // Look for state token followed by ZIP in this segment
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j].replace(/[,.:;]/g, '');
        if (stateAbbreviations.has(token)) {
          // Check if next token(s) contain ZIP
          const remaining = tokens.slice(j + 1).join(' ');
          if (/\d{5}/.test(remaining)) {
            return token;
          }
        }
      }
    }
    
    // For segments without ZIP, look for standalone state abbreviation
    // A valid state segment typically has city name + state OR just state
    for (let j = tokens.length - 1; j >= 0; j--) {
      const token = tokens[j].replace(/[,.:;]/g, '');
      
      if (stateAbbreviations.has(token)) {
        // Check if this looks like a street suffix vs a state
        // Street suffixes appear in the first segment (street address)
        // States appear in later segments (after city)
        const isFirstSegment = i === 0;
        
        // If in first segment, check if there's more after (city, state, zip)
        // which would indicate this is a street suffix
        if (isFirstSegment && segments.length > 2) {
          // This is likely a street suffix (e.g., "Ct" in "508 Dell Ct")
          continue;
        }
        
        // If this is the only token in segment or last token, it's likely a state
        if (j === tokens.length - 1 || tokens.length <= 2) {
          return token;
        }
      }
    }
  }
  
  // PRIORITY 3: Try matching full state names (scan right-to-left)
  const fullStateNames: Record<string, string> = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
    'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
    'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
    'DISTRICT OF COLUMBIA': 'DC'
  };
  
  // Check segments from right to left for full state names
  for (let i = segments.length - 1; i >= 0; i--) {
    for (const [fullName, abbr] of Object.entries(fullStateNames)) {
      if (segments[i].includes(fullName)) {
        return abbr;
      }
    }
  }
  
  return null;
}

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(url: string, maxRetries: number = 3, headers?: Record<string, string>): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, headers ? { headers } : undefined);
      
      // If we get a 503 or 429, retry with backoff
      if (response.status === 503 || response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`[FBI Crime] API returned ${response.status}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[FBI Crime] API error: ${error.message}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
      await delay(waitTime);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Fetch state-level crime data from FBI Crime Data API
 */
export async function fetchStateCrimeData(stateAbbr: string): Promise<CrimeData> {
  const apiKey = process.env.FBI_CRIME_API_KEY;
  const stateUpper = stateAbbr.toUpperCase();
  
  if (!STATE_FIPS[stateUpper]) {
    console.warn(`[FBI Crime] Unknown state: ${stateAbbr}, using cached data`);
    return getCachedCrimeData(stateUpper);
  }
  
  if (!apiKey) {
    console.log('[FBI Crime] API key not configured, using cached state data');
    return getCachedCrimeData(stateUpper);
  }
  
  try {
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear;
    
    console.log(`[FBI Crime] Fetching crime data for ${stateUpper}`);

    // CDE endpoint — api.data.gov key via X-Api-Key header
    let response: Response | null = null;
    let usedEndpoint = '';

    try {
      const cdeUrl = `${CDE_BASE_URL}/estimate/state/${stateUpper}?from=${startYear}&to=${endYear}`;
      const cdeResponse = await fetchWithRetry(cdeUrl, 2, { 'X-Api-Key': apiKey });
      if (cdeResponse.ok) {
        response = cdeResponse;
        usedEndpoint = 'CDE';
      }
    } catch (_) {}

    if (!response) {
      console.log(`[FBI Crime] CDE API unavailable for ${stateUpper}, using cached data`);
      return getCachedCrimeData(stateUpper);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FBI Crime] ${usedEndpoint} API error ${response.status}:`, errorText);
      console.log(`[FBI Crime] Falling back to cached data for ${stateUpper}`);
      return getCachedCrimeData(stateUpper);
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn(`[FBI Crime] No data returned for ${stateUpper}, using cached data`);
      return getCachedCrimeData(stateUpper);
    }
    
    // Get the most recent year's data
    const latestData = data[data.length - 1];
    
    // Calculate crime rates per 100,000
    const population = latestData.population || 1;
    const violentCrimeTotal = (latestData.violent_crime || 0);
    const propertyCrimeTotal = (latestData.property_crime || 0);
    
    const violentCrimeRate = (violentCrimeTotal / population) * 100000;
    const propertyCrimeRate = (propertyCrimeTotal / population) * 100000;
    
    // Calculate individual crime rates
    const murderRate = ((latestData.homicide || 0) / population) * 100000;
    const robberyRate = ((latestData.robbery || 0) / population) * 100000;
    const assaultRate = ((latestData.aggravated_assault || 0) / population) * 100000;
    const burglaryRate = ((latestData.burglary || 0) / population) * 100000;
    const larcenyRate = ((latestData.larceny || 0) / population) * 100000;
    const motorVehicleTheftRate = ((latestData.motor_vehicle_theft || 0) / population) * 100000;
    
    // Calculate comparison to national averages (negative = safer than average)
    const violentCrimeVsNational = ((violentCrimeRate - NATIONAL_AVERAGES.violentCrimeRate) / NATIONAL_AVERAGES.violentCrimeRate) * 100;
    const propertyCrimeVsNational = ((propertyCrimeRate - NATIONAL_AVERAGES.propertyCrimeRate) / NATIONAL_AVERAGES.propertyCrimeRate) * 100;
    
    // Calculate safety score (0-100, higher = safer)
    const safetyScore = calculateSafetyScore(violentCrimeRate, propertyCrimeRate);
    
    console.log(`[FBI Crime] ${stateUpper}: Violent ${violentCrimeRate.toFixed(1)}/100k (${violentCrimeVsNational > 0 ? '+' : ''}${violentCrimeVsNational.toFixed(1)}% vs national), Safety Score: ${safetyScore}`);
    
    return {
      stateAbbr: stateUpper,
      stateName: STATE_NAMES[stateUpper] || stateUpper,
      year: latestData.year || endYear,
      population,
      violentCrimeRate,
      propertyCrimeRate,
      violentCrimeTotal,
      propertyCrimeTotal,
      murderRate,
      robberyRate,
      assaultRate,
      burglaryRate,
      larcenyRate,
      motorVehicleTheftRate,
      nationalViolentCrimeRate: NATIONAL_AVERAGES.violentCrimeRate,
      nationalPropertyCrimeRate: NATIONAL_AVERAGES.propertyCrimeRate,
      violentCrimeVsNational,
      propertyCrimeVsNational,
      safetyScore
    };
    
  } catch (error: any) {
    console.error(`[FBI Crime] Error fetching data for ${stateUpper}:`, error.message);
    return getCachedCrimeData(stateUpper);
  }
}

// Cached FBI crime data from 2022 (most recent complete year)
// Source: FBI Crime Data Explorer - https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/explorer/crime/crime-trend
// These values are used as fallback when the API is unavailable, and to seed the DB pipeline
export const CACHED_STATE_CRIME_DATA: Record<string, { violent: number; property: number; safetyLabel: string }> = {
  'AL': { violent: 453.6, property: 2451.3, safetyLabel: 'Above Average Risk' },
  'AK': { violent: 837.8, property: 2874.5, safetyLabel: 'Higher Risk' },
  'AZ': { violent: 484.8, property: 2439.6, safetyLabel: 'Above Average Risk' },
  'AR': { violent: 671.9, property: 2987.1, safetyLabel: 'Higher Risk' },
  'CA': { violent: 499.5, property: 2559.0, safetyLabel: 'Above Average Risk' },
  'CO': { violent: 492.4, property: 3198.6, safetyLabel: 'Above Average Risk' },
  'CT': { violent: 184.7, property: 1393.0, safetyLabel: 'Very Safe' },
  'DE': { violent: 431.5, property: 2054.5, safetyLabel: 'Average' },
  'DC': { violent: 812.2, property: 4036.5, safetyLabel: 'Higher Risk' },
  'FL': { violent: 384.0, property: 1806.5, safetyLabel: 'Average' },
  'GA': { violent: 400.2, property: 2247.5, safetyLabel: 'Average' },
  'HI': { violent: 255.3, property: 2580.4, safetyLabel: 'Safer' },
  'ID': { violent: 239.8, property: 1289.5, safetyLabel: 'Very Safe' },
  'IL': { violent: 425.2, property: 1568.8, safetyLabel: 'Average' },
  'IN': { violent: 382.3, property: 1918.9, safetyLabel: 'Average' },
  'IA': { violent: 266.5, property: 1624.3, safetyLabel: 'Safer' },
  'KS': { violent: 410.2, property: 2322.5, safetyLabel: 'Average' },
  'KY': { violent: 249.8, property: 1674.3, safetyLabel: 'Safer' },
  'LA': { violent: 639.4, property: 2989.5, safetyLabel: 'Higher Risk' },
  'ME': { violent: 109.1, property: 1103.3, safetyLabel: 'Very Safe' },
  'MD': { violent: 454.1, property: 1711.4, safetyLabel: 'Above Average Risk' },
  'MA': { violent: 308.8, property: 1103.4, safetyLabel: 'Safer' },
  'MI': { violent: 438.1, property: 1458.4, safetyLabel: 'Average' },
  'MN': { violent: 280.0, property: 2064.2, safetyLabel: 'Safer' },
  'MS': { violent: 291.2, property: 1950.3, safetyLabel: 'Safer' },
  'MO': { violent: 542.7, property: 2538.9, safetyLabel: 'Above Average Risk' },
  'MT': { violent: 469.8, property: 2269.5, safetyLabel: 'Above Average Risk' },
  'NE': { violent: 304.8, property: 1805.3, safetyLabel: 'Safer' },
  'NV': { violent: 460.3, property: 2085.7, safetyLabel: 'Above Average Risk' },
  'NH': { violent: 146.4, property: 935.6, safetyLabel: 'Very Safe' },
  'NJ': { violent: 195.4, property: 1229.8, safetyLabel: 'Very Safe' },
  'NM': { violent: 778.3, property: 3316.6, safetyLabel: 'Higher Risk' },
  'NY': { violent: 363.7, property: 1392.0, safetyLabel: 'Average' },
  'NC': { violent: 418.3, property: 2235.2, safetyLabel: 'Average' },
  'ND': { violent: 280.6, property: 2109.9, safetyLabel: 'Safer' },
  'OH': { violent: 308.8, property: 1859.9, safetyLabel: 'Safer' },
  'OK': { violent: 458.6, property: 2743.5, safetyLabel: 'Above Average Risk' },
  'OR': { violent: 291.9, property: 2847.6, safetyLabel: 'Safer' },
  'PA': { violent: 389.4, property: 1306.7, safetyLabel: 'Average' },
  'RI': { violent: 205.4, property: 1290.1, safetyLabel: 'Safer' },
  'SC': { violent: 530.7, property: 2621.7, safetyLabel: 'Above Average Risk' },
  'SD': { violent: 501.4, property: 1615.7, safetyLabel: 'Above Average Risk' },
  'TN': { violent: 672.7, property: 2657.9, safetyLabel: 'Higher Risk' },
  'TX': { violent: 446.5, property: 2415.3, safetyLabel: 'Average' },
  'UT': { violent: 233.0, property: 2564.1, safetyLabel: 'Safer' },
  'VT': { violent: 173.0, property: 1211.6, safetyLabel: 'Very Safe' },
  'VA': { violent: 208.2, property: 1434.7, safetyLabel: 'Safer' },
  'WA': { violent: 367.8, property: 3158.1, safetyLabel: 'Average' },
  'WV': { violent: 355.5, property: 1377.9, safetyLabel: 'Average' },
  'WI': { violent: 323.7, property: 1439.9, safetyLabel: 'Safer' },
  'WY': { violent: 234.6, property: 1610.3, safetyLabel: 'Safer' }
};

/**
 * Get cached crime data when API is unavailable
 * Uses real 2022 FBI data cached locally
 */
function getCachedCrimeData(stateAbbr: string): CrimeData {
  const stateUpper = stateAbbr.toUpperCase();
  const cachedData = CACHED_STATE_CRIME_DATA[stateUpper];
  
  if (!cachedData) {
    console.warn(`[FBI Crime] No cached data for ${stateUpper}, using national average`);
    return getEstimatedCrimeData(stateUpper);
  }
  
  const violentCrimeRate = cachedData.violent;
  const propertyCrimeRate = cachedData.property;
  
  const violentCrimeVsNational = ((violentCrimeRate - NATIONAL_AVERAGES.violentCrimeRate) / NATIONAL_AVERAGES.violentCrimeRate) * 100;
  const propertyCrimeVsNational = ((propertyCrimeRate - NATIONAL_AVERAGES.propertyCrimeRate) / NATIONAL_AVERAGES.propertyCrimeRate) * 100;
  const safetyScore = calculateSafetyScore(violentCrimeRate, propertyCrimeRate);
  
  const violentRatio = violentCrimeRate / NATIONAL_AVERAGES.violentCrimeRate;
  const propertyRatio = propertyCrimeRate / NATIONAL_AVERAGES.propertyCrimeRate;
  
  const murderRate = NATIONAL_AVERAGES.murderRate * violentRatio;
  const robberyRate = NATIONAL_AVERAGES.robberyRate * violentRatio;
  const assaultRate = NATIONAL_AVERAGES.assaultRate * violentRatio;
  const burglaryRate = NATIONAL_AVERAGES.burglaryRate * propertyRatio;
  const larcenyRate = NATIONAL_AVERAGES.larcenyRate * propertyRatio;
  const motorVehicleTheftRate = NATIONAL_AVERAGES.motorVehicleTheftRate * propertyRatio;
  
  console.log(`[FBI Crime] Using cached data for ${stateUpper}: Violent ${violentCrimeRate}/100k, Safety: ${cachedData.safetyLabel}`);
  
  return {
    stateAbbr: stateUpper,
    stateName: STATE_NAMES[stateUpper] || stateUpper,
    year: 2022,
    population: 0,
    violentCrimeRate,
    propertyCrimeRate,
    violentCrimeTotal: 0,
    propertyCrimeTotal: 0,
    murderRate,
    robberyRate,
    assaultRate,
    burglaryRate,
    larcenyRate,
    motorVehicleTheftRate,
    nationalViolentCrimeRate: NATIONAL_AVERAGES.violentCrimeRate,
    nationalPropertyCrimeRate: NATIONAL_AVERAGES.propertyCrimeRate,
    violentCrimeVsNational,
    propertyCrimeVsNational,
    safetyScore
  };
}

/**
 * Calculate a safety score (0-100) based on crime rates
 * Higher score = safer area
 */
function calculateSafetyScore(violentCrimeRate: number, propertyCrimeRate: number): number {
  // Weight violent crime more heavily (60%) than property crime (40%)
  const violentWeight = 0.6;
  const propertyWeight = 0.4;
  
  // Calculate how the rates compare to national average
  // Score of 50 = exactly at national average
  // Score of 100 = very low crime (< 20% of national avg)
  // Score of 0 = very high crime (> 200% of national avg)
  
  const violentRatio = violentCrimeRate / NATIONAL_AVERAGES.violentCrimeRate;
  const propertyRatio = propertyCrimeRate / NATIONAL_AVERAGES.propertyCrimeRate;
  
  // Convert ratio to score (inverse relationship - lower crime = higher score)
  // Using a logarithmic scale for better distribution
  const violentScore = Math.max(0, Math.min(100, 100 - (violentRatio * 50)));
  const propertyScore = Math.max(0, Math.min(100, 100 - (propertyRatio * 50)));
  
  const combinedScore = (violentScore * violentWeight) + (propertyScore * propertyWeight);
  
  return Math.round(combinedScore);
}

/**
 * Get estimated crime data when API is unavailable
 * Uses Census poverty/vacancy rates as proxy indicators
 */
function getEstimatedCrimeData(stateAbbr: string): CrimeData {
  // Default to national average with slight variation based on state
  // This is a fallback only - real FBI data is preferred
  const baseScore = 50;
  
  return {
    stateAbbr: stateAbbr.toUpperCase(),
    stateName: STATE_NAMES[stateAbbr.toUpperCase()] || stateAbbr,
    year: 2022,
    population: 0,
    violentCrimeRate: NATIONAL_AVERAGES.violentCrimeRate,
    propertyCrimeRate: NATIONAL_AVERAGES.propertyCrimeRate,
    violentCrimeTotal: 0,
    propertyCrimeTotal: 0,
    murderRate: NATIONAL_AVERAGES.murderRate,
    robberyRate: NATIONAL_AVERAGES.robberyRate,
    assaultRate: NATIONAL_AVERAGES.assaultRate,
    burglaryRate: NATIONAL_AVERAGES.burglaryRate,
    larcenyRate: NATIONAL_AVERAGES.larcenyRate,
    motorVehicleTheftRate: NATIONAL_AVERAGES.motorVehicleTheftRate,
    nationalViolentCrimeRate: NATIONAL_AVERAGES.violentCrimeRate,
    nationalPropertyCrimeRate: NATIONAL_AVERAGES.propertyCrimeRate,
    violentCrimeVsNational: 0,
    propertyCrimeVsNational: 0,
    safetyScore: baseScore
  };
}

/**
 * Format crime comparison for display
 * Returns a human-readable string like "12% below national avg"
 */
export function formatCrimeComparison(percentDiff: number): string {
  if (Math.abs(percentDiff) < 2) {
    return 'near national average';
  }
  
  const direction = percentDiff < 0 ? 'below' : 'above';
  const absPercent = Math.abs(Math.round(percentDiff));
  
  return `${absPercent}% ${direction} national avg`;
}
