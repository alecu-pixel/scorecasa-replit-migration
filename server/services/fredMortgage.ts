import { getCachedMortgageRates } from './dataPipeline/dataCache';

export interface RateDataPoint {
  date: string;
  rate: number;
}

export interface MortgageTrendData {
  currentRate: number;
  previousWeekRate: number;
  previousMonthRate: number;
  previousYearRate: number;
  weekOverWeekChange: number;
  monthOverMonthChange: number;
  yearOverYearChange: number;
  trendDirection: 'rising' | 'falling' | 'stable';
  trendStrength: 'strong' | 'moderate' | 'slight';
  historicalAverage: number;
  vsHistoricalAverage: number;
  rateOutlook: string;
  lastUpdated: string;
  dataSource: string;
  historicalRates: RateDataPoint[];
}

const FRED_SERIES_ID = 'MORTGAGE30US';
const FRED_API_BASE = 'https://api.stlouisfed.org/fred';

interface FREDObservation {
  date: string;
  value: string;
}

interface FREDSeriesResponse {
  observations: FREDObservation[];
}

async function fetchFREDSeries(seriesId: string, limit: number = 100): Promise<FREDObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    console.log('[FRED] No API key configured, using fallback data');
    return [];
  }

  const url = `${FRED_API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`[FRED] API returned ${response.status}`);
      return [];
    }

    const data: FREDSeriesResponse = await response.json();
    return data.observations || [];
  } catch (error) {
    console.error('[FRED] API error:', error);
    return [];
  }
}

function parseRate(value: string): number | null {
  if (value === '.' || value === '' || value === 'ND') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function calculateTrendDirection(current: number, previous: number): 'rising' | 'falling' | 'stable' {
  const change = current - previous;
  if (Math.abs(change) < 0.05) return 'stable';
  return change > 0 ? 'rising' : 'falling';
}

function calculateTrendStrength(yearChange: number): 'strong' | 'moderate' | 'slight' {
  const absChange = Math.abs(yearChange);
  if (absChange > 1.0) return 'strong';
  if (absChange > 0.5) return 'moderate';
  return 'slight';
}

function generateRateOutlook(trendDirection: string, trendStrength: string, vsHistorical: number): string {
  const historicalContext = vsHistorical > 0.5 
    ? 'above historical average' 
    : vsHistorical < -0.5 
      ? 'below historical average' 
      : 'near historical average';
  
  if (trendDirection === 'rising' && trendStrength === 'strong') {
    return `Rates are rising strongly and ${historicalContext}. Consider locking in soon if buying.`;
  } else if (trendDirection === 'rising') {
    return `Rates are trending upward and ${historicalContext}. Monitor closely for buying opportunities.`;
  } else if (trendDirection === 'falling' && trendStrength === 'strong') {
    return `Rates are falling significantly and ${historicalContext}. Good time to explore financing options.`;
  } else if (trendDirection === 'falling') {
    return `Rates are trending downward and ${historicalContext}. Favorable conditions for buyers.`;
  } else {
    return `Rates are stable and ${historicalContext}. Predictable environment for planning.`;
  }
}

async function getObservationsFromCacheOrAPI(): Promise<{ date: string; value: number }[]> {
  const cachedRates = await getCachedMortgageRates(60);
  
  const validCachedRates = cachedRates.filter(r => r.rate > 0 && !isNaN(r.rate));
  
  if (validCachedRates.length >= 10) {
    console.log(`[FRED] Using ${validCachedRates.length} cached mortgage rates`);
    return validCachedRates.map(r => ({ date: r.date, value: r.rate }));
  }

  console.log('[FRED] Cache insufficient, fetching from API');
  const observations = await fetchFREDSeries(FRED_SERIES_ID, 60);
  
  return observations
    .map(obs => ({ date: obs.date, value: parseRate(obs.value) }))
    .filter(obs => obs.value !== null) as { date: string; value: number }[];
}

export async function fetchMortgageTrends(): Promise<MortgageTrendData> {
  const validObservations = await getObservationsFromCacheOrAPI();

  if (validObservations.length < 2) {
    return getDefaultTrendData();
  }

  const currentRate = validObservations[0].value;
  const currentDate = validObservations[0].date;
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const findClosestRate = (targetDate: Date): number => {
    const targetTime = targetDate.getTime();
    let closest = validObservations[0];
    let minDiff = Infinity;
    
    for (const obs of validObservations) {
      const obsTime = new Date(obs.date).getTime();
      const diff = Math.abs(obsTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = obs;
      }
    }
    return closest.value;
  };

  const previousWeekRate = findClosestRate(oneWeekAgo);
  const previousMonthRate = findClosestRate(oneMonthAgo);
  const previousYearRate = findClosestRate(oneYearAgo);

  const sum = validObservations.reduce((acc, obs) => acc + obs.value, 0);
  const historicalAverage = sum / validObservations.length;

  const weekOverWeekChange = currentRate - previousWeekRate;
  const monthOverMonthChange = currentRate - previousMonthRate;
  const yearOverYearChange = currentRate - previousYearRate;
  const vsHistoricalAverage = currentRate - historicalAverage;

  const trendDirection = calculateTrendDirection(currentRate, previousMonthRate);
  const trendStrength = calculateTrendStrength(yearOverYearChange);
  const rateOutlook = generateRateOutlook(trendDirection, trendStrength, vsHistoricalAverage);

  const historicalRates: RateDataPoint[] = validObservations
    .slice(0, 52)
    .map(obs => ({ date: obs.date, rate: parseFloat(obs.value.toFixed(2)) }))
    .reverse();

  return {
    currentRate: parseFloat(currentRate.toFixed(2)),
    previousWeekRate: parseFloat(previousWeekRate.toFixed(2)),
    previousMonthRate: parseFloat(previousMonthRate.toFixed(2)),
    previousYearRate: parseFloat(previousYearRate.toFixed(2)),
    weekOverWeekChange: parseFloat(weekOverWeekChange.toFixed(2)),
    monthOverMonthChange: parseFloat(monthOverMonthChange.toFixed(2)),
    yearOverYearChange: parseFloat(yearOverYearChange.toFixed(2)),
    trendDirection,
    trendStrength,
    historicalAverage: parseFloat(historicalAverage.toFixed(2)),
    vsHistoricalAverage: parseFloat(vsHistoricalAverage.toFixed(2)),
    rateOutlook,
    lastUpdated: currentDate,
    dataSource: 'FRED (Federal Reserve Economic Data)',
    historicalRates
  };
}

function getDefaultTrendData(): MortgageTrendData {
  const defaultHistory: RateDataPoint[] = [];
  const today = new Date();
  for (let i = 51; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i * 7);
    defaultHistory.push({
      date: date.toISOString().split('T')[0],
      rate: 6.5 + Math.sin(i / 10) * 0.3 + (i / 100)
    });
  }

  return {
    currentRate: 6.75,
    previousWeekRate: 6.80,
    previousMonthRate: 6.90,
    previousYearRate: 7.10,
    weekOverWeekChange: -0.05,
    monthOverMonthChange: -0.15,
    yearOverYearChange: -0.35,
    trendDirection: 'falling',
    trendStrength: 'slight',
    historicalAverage: 6.50,
    vsHistoricalAverage: 0.25,
    rateOutlook: 'Rates are trending downward and near historical average. Favorable conditions for buyers.',
    lastUpdated: new Date().toISOString().split('T')[0],
    dataSource: 'Default estimates (FRED API unavailable)',
    historicalRates: defaultHistory
  };
}
