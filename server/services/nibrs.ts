/**
 * NIBRS (National Incident-Based Reporting System) API Service
 * 
 * Provides national crime benchmarks and victimization data from the Bureau of Justice Statistics.
 * Source: https://bjs.ojp.gov/national-incident-based-reporting-system-nibrs-national-estimates-api
 * 
 * This data is used to provide context by comparing local crime data against national statistics.
 */

const BASE_URL = 'https://api.ojp.gov/bjsdataset/v1';

export interface NationalCrimeBenchmark {
  year: number;
  violentIncidentCount: number;
  propertyIncidentCount: number;
  violentVictimizationRate: number;
  propertyVictimizationRate: number;
  homicideRate: number;
  robberyRate: number;
  assaultRate: number;
  burglaryRate: number;
  larcenyRate: number;
  motorVehicleTheftRate: number;
  source: 'nibrs';
}

export interface CrimeTypeBreakdown {
  type: string;
  label: string;
  nationalRate: number;
  description: string;
}

const cachedBenchmark: { data: NationalCrimeBenchmark | null; timestamp: number } = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_NATIONAL_DATA: NationalCrimeBenchmark = {
  year: 2023,
  violentIncidentCount: 1200000,
  propertyIncidentCount: 6500000,
  violentVictimizationRate: 22.5,
  propertyVictimizationRate: 101.4,
  homicideRate: 6.1,
  robberyRate: 68.2,
  assaultRate: 244.8,
  burglaryRate: 271.5,
  larcenyRate: 1398.5,
  motorVehicleTheftRate: 318.3,
  source: 'nibrs'
};

export async function fetchNationalCrimeBenchmarks(): Promise<NationalCrimeBenchmark> {
  if (cachedBenchmark.data && Date.now() - cachedBenchmark.timestamp < CACHE_TTL) {
    console.log('[NIBRS] Using cached national benchmark data');
    return cachedBenchmark.data;
  }

  try {
    const victimizationRatesUrl = `${BASE_URL}/uy37-xgmh.json?$where=estimate_geographic_location='National' and estimate_type='rate'&$limit=1000`;
    
    console.log('[NIBRS] Fetching national victimization rates');
    
    const response = await fetch(victimizationRatesUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`[NIBRS] API returned ${response.status}, using fallback data`);
      return FALLBACK_NATIONAL_DATA;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[NIBRS] No data returned, using fallback');
      return FALLBACK_NATIONAL_DATA;
    }

    const latestYear = Math.max(...data.map((d: any) => parseInt(d.year) || 0));
    const latestData = data.filter((d: any) => parseInt(d.year) === latestYear);

    let violentRate = 0;
    let propertyRate = 0;

    for (const record of latestData) {
      const indicator = record.indicator_name?.toLowerCase() || '';
      const value = parseFloat(record.estimate_value) || 0;

      if (indicator.includes('violent') && !indicator.includes('non')) {
        violentRate = value;
      } else if (indicator.includes('property')) {
        propertyRate = value;
      }
    }

    const benchmark: NationalCrimeBenchmark = {
      year: latestYear,
      violentIncidentCount: FALLBACK_NATIONAL_DATA.violentIncidentCount,
      propertyIncidentCount: FALLBACK_NATIONAL_DATA.propertyIncidentCount,
      violentVictimizationRate: violentRate || FALLBACK_NATIONAL_DATA.violentVictimizationRate,
      propertyVictimizationRate: propertyRate || FALLBACK_NATIONAL_DATA.propertyVictimizationRate,
      homicideRate: FALLBACK_NATIONAL_DATA.homicideRate,
      robberyRate: FALLBACK_NATIONAL_DATA.robberyRate,
      assaultRate: FALLBACK_NATIONAL_DATA.assaultRate,
      burglaryRate: FALLBACK_NATIONAL_DATA.burglaryRate,
      larcenyRate: FALLBACK_NATIONAL_DATA.larcenyRate,
      motorVehicleTheftRate: FALLBACK_NATIONAL_DATA.motorVehicleTheftRate,
      source: 'nibrs'
    };

    cachedBenchmark.data = benchmark;
    cachedBenchmark.timestamp = Date.now();

    console.log(`[NIBRS] National benchmarks (${latestYear}): Violent rate ${violentRate}, Property rate ${propertyRate}`);

    return benchmark;
  } catch (error: any) {
    console.error('[NIBRS] Error fetching benchmarks:', error.message);
    return FALLBACK_NATIONAL_DATA;
  }
}

export function getCrimeTypeBreakdowns(): CrimeTypeBreakdown[] {
  return [
    {
      type: 'homicide',
      label: 'Homicide',
      nationalRate: FALLBACK_NATIONAL_DATA.homicideRate,
      description: 'Murder and non-negligent manslaughter'
    },
    {
      type: 'robbery',
      label: 'Robbery',
      nationalRate: FALLBACK_NATIONAL_DATA.robberyRate,
      description: 'Taking property by force or threat'
    },
    {
      type: 'assault',
      label: 'Aggravated Assault',
      nationalRate: FALLBACK_NATIONAL_DATA.assaultRate,
      description: 'Attack with intent to cause serious harm'
    },
    {
      type: 'burglary',
      label: 'Burglary',
      nationalRate: FALLBACK_NATIONAL_DATA.burglaryRate,
      description: 'Unlawful entry to commit a crime'
    },
    {
      type: 'larceny',
      label: 'Larceny/Theft',
      nationalRate: FALLBACK_NATIONAL_DATA.larcenyRate,
      description: 'Theft of property without force'
    },
    {
      type: 'motorVehicleTheft',
      label: 'Motor Vehicle Theft',
      nationalRate: FALLBACK_NATIONAL_DATA.motorVehicleTheftRate,
      description: 'Theft or attempted theft of a vehicle'
    }
  ];
}

export function compareToNational(localRate: number, nationalRate: number): {
  percentDiff: number;
  comparison: 'much-lower' | 'lower' | 'similar' | 'higher' | 'much-higher';
  label: string;
} {
  if (nationalRate === 0) {
    return { percentDiff: 0, comparison: 'similar', label: 'Similar to national average' };
  }

  const percentDiff = ((localRate - nationalRate) / nationalRate) * 100;

  let comparison: 'much-lower' | 'lower' | 'similar' | 'higher' | 'much-higher';
  let label: string;

  if (percentDiff <= -30) {
    comparison = 'much-lower';
    label = `${Math.abs(Math.round(percentDiff))}% below national average`;
  } else if (percentDiff <= -10) {
    comparison = 'lower';
    label = `${Math.abs(Math.round(percentDiff))}% below national average`;
  } else if (percentDiff <= 10) {
    comparison = 'similar';
    label = 'Similar to national average';
  } else if (percentDiff <= 30) {
    comparison = 'higher';
    label = `${Math.round(percentDiff)}% above national average`;
  } else {
    comparison = 'much-higher';
    label = `${Math.round(percentDiff)}% above national average`;
  }

  return { percentDiff, comparison, label };
}
