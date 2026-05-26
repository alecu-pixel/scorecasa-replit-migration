/**
 * Crime Data by ZipCode API Service (RapidAPI)
 * 
 * Provides ZIP-code level crime grades and statistics.
 * Source: https://rapidapi.com/zyla-labs-zyla-labs-default/api/crime-data-by-zipcode-api
 */

const RAPIDAPI_HOST = 'crime-data-by-zipcode-api.p.rapidapi.com';

export interface ZipCodeCrimeGrade {
  zipCode: string;
  overallGrade: string;
  violentCrimeGrade: string;
  propertyCrimeGrade: string;
  overallScore: number;
  violentCrimeScore: number;
  propertyCrimeScore: number;
  dataYear: number;
  source: 'rapidapi';
}

export interface NearbyZipCrime {
  zipCode: string;
  state: string;
  overallGrade: string;
  violentCrimeGrade: string;
  propertyCrimeGrade: string;
  overallScore: number;
  gradeColor: string;
}

export interface ZipCodeCrimeResult {
  mainZip: ZipCodeCrimeGrade;
  nearbyZips: NearbyZipCrime[];
}

const gradeToScore: Record<string, number> = {
  'A+': 98,
  'A': 95,
  'A-': 92,
  'B+': 88,
  'B': 85,
  'B-': 82,
  'C+': 78,
  'C': 75,
  'C-': 72,
  'D+': 68,
  'D': 65,
  'D-': 62,
  'F': 40
};

function parseGradeToScore(grade: string | undefined): number {
  if (!grade) return 50;
  const normalizedGrade = grade.toUpperCase().trim();
  return gradeToScore[normalizedGrade] ?? 50;
}

const cache = new Map<string, { data: ZipCodeCrimeResult; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function fetchCrimeByZipCode(zipCode: string): Promise<ZipCodeCrimeResult | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.log('[CrimeByZip] RapidAPI key not configured');
    return null;
  }

  const normalizedZip = zipCode.replace(/\D/g, '').substring(0, 5);
  if (normalizedZip.length !== 5) {
    console.warn(`[CrimeByZip] Invalid ZIP code: ${zipCode}`);
    return null;
  }

  const cached = cache.get(normalizedZip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[CrimeByZip] Using cached data for ${normalizedZip} (${cached.data.nearbyZips.length} nearby ZIPs)`);
    return cached.data;
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/crime_data?zip=${normalizedZip}`;
    
    console.log(`[CrimeByZip] Fetching crime data for ZIP: ${normalizedZip}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CrimeByZip] API error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.error || !data.success) {
      console.warn(`[CrimeByZip] No data for ZIP ${normalizedZip}:`, data?.error || 'Unknown error');
      return null;
    }

    const overall = data.Overall || {};
    const overallGrade = overall['Overall Crime Grade'] || 'C';
    const violentGrade = overall['Violent Crime Grade'] || 'C';
    const propertyGrade = overall['Property Crime Grade'] || 'C';

    const mainZip: ZipCodeCrimeGrade = {
      zipCode: normalizedZip,
      overallGrade,
      violentCrimeGrade: violentGrade,
      propertyCrimeGrade: propertyGrade,
      overallScore: parseGradeToScore(overallGrade),
      violentCrimeScore: parseGradeToScore(violentGrade),
      propertyCrimeScore: parseGradeToScore(propertyGrade),
      dataYear: new Date().getFullYear() - 1,
      source: 'rapidapi'
    };

    const nearbyZips: NearbyZipCrime[] = [];
    const nearbyRates = data['Crime Rates Nearby'] || [];
    
    for (const nearby of nearbyRates) {
      const nearbyZipStr = nearby['Nearby Zip'] || '';
      const parts = nearbyZipStr.split(',');
      const zip = parts[0]?.trim() || '';
      const state = parts[1]?.trim() || '';
      const grade = nearby['Overall Crime Grade'] || 'C';
      const violent = nearby['Violent Crime Grade'] || 'C';
      const property = nearby['Property Crime Grade'] || 'C';
      
      if (zip && zip.length === 5) {
        nearbyZips.push({
          zipCode: zip,
          state,
          overallGrade: grade,
          violentCrimeGrade: violent,
          propertyCrimeGrade: property,
          overallScore: parseGradeToScore(grade),
          gradeColor: getGradeColor(grade)
        });
      }
    }

    const result: ZipCodeCrimeResult = { mainZip, nearbyZips };
    cache.set(normalizedZip, { data: result, timestamp: Date.now() });
    
    console.log(`[CrimeByZip] ZIP ${normalizedZip}: Overall ${mainZip.overallGrade} (${mainZip.overallScore}), Violent ${mainZip.violentCrimeGrade}, Property ${mainZip.propertyCrimeGrade}, Nearby: ${nearbyZips.length} ZIPs`);
    
    return result;
  } catch (error: any) {
    console.error(`[CrimeByZip] Error fetching data for ${normalizedZip}:`, error.message);
    return null;
  }
}

export function getGradeLabel(grade: string): string {
  const normalizedGrade = grade.toUpperCase().trim();
  
  if (normalizedGrade.startsWith('A')) return 'Very Safe';
  if (normalizedGrade.startsWith('B')) return 'Safe';
  if (normalizedGrade.startsWith('C')) return 'Average';
  if (normalizedGrade.startsWith('D')) return 'Below Average';
  if (normalizedGrade === 'F') return 'High Risk';
  
  return 'Unknown';
}

export function getGradeColor(grade: string): string {
  const normalizedGrade = grade.toUpperCase().trim();
  
  if (normalizedGrade.startsWith('A')) return '#22c55e';
  if (normalizedGrade.startsWith('B')) return '#84cc16';
  if (normalizedGrade.startsWith('C')) return '#eab308';
  if (normalizedGrade.startsWith('D')) return '#f97316';
  if (normalizedGrade === 'F') return '#ef4444';
  
  return '#6b7280';
}
