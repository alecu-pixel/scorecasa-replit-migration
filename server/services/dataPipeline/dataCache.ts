import { db } from '../../db';
import { fredMortgageRates, hudFairMarketRent, blsEmploymentData, censusBuildingPermits, fbiCrimeStats } from '@shared/schema';
import { desc, eq, and, gte } from 'drizzle-orm';

export interface CachedMortgageRate {
  date: string;
  rate: number;
}

export interface CachedFMRData {
  countyCode: string | null;
  countyName: string | null;
  stateCode: string;
  year: number;
  efficiency: number | null;
  oneBedroom: number | null;
  twoBedroom: number | null;
  threeBedroom: number | null;
  fourBedroom: number | null;
}

export interface CachedEmploymentData {
  stateCode: string;
  year: number;
  month: number;
  unemploymentRate: number | null;
  laborForce: number | null;
  employed: number | null;
  unemployed: number | null;
  laborForceParticipation: number | null;
}

export interface CachedBuildingPermits {
  stateCode: string;
  year: number;
  month: number | null;
  totalUnits: number | null;
  singleFamilyUnits: number | null;
  multiFamilyUnits: number | null;
}

export interface CachedCrimeStats {
  stateCode: string;
  year: number;
  violentCrimeTotal: number | null;
  propertyCrimeTotal: number | null;
  population: number | null;
  violentCrimeRate: number | null;
  propertyCrimeRate: number | null;
}

export async function getCachedMortgageRates(limit: number = 60): Promise<CachedMortgageRate[]> {
  try {
    const rates = await db.select({
      date: fredMortgageRates.observationDate,
      rate: fredMortgageRates.rate
    })
    .from(fredMortgageRates)
    .orderBy(desc(fredMortgageRates.observationDate))
    .limit(limit);

    return rates.map(r => ({
      date: r.date,
      rate: r.rate
    }));
  } catch (error) {
    console.error('[DataCache] Error fetching mortgage rates:', error);
    return [];
  }
}

export async function getCachedFMRByState(stateCode: string, year?: number): Promise<CachedFMRData[]> {
  try {
    const targetYear = year || new Date().getFullYear();
    
    const fmrData = await db.select({
      countyCode: hudFairMarketRent.countyCode,
      countyName: hudFairMarketRent.countyName,
      stateCode: hudFairMarketRent.stateCode,
      year: hudFairMarketRent.fiscalYear,
      efficiency: hudFairMarketRent.efficiency,
      oneBedroom: hudFairMarketRent.oneBedroom,
      twoBedroom: hudFairMarketRent.twoBedroom,
      threeBedroom: hudFairMarketRent.threeBedroom,
      fourBedroom: hudFairMarketRent.fourBedroom
    })
    .from(hudFairMarketRent)
    .where(
      and(
        eq(hudFairMarketRent.stateCode, stateCode.toUpperCase()),
        eq(hudFairMarketRent.fiscalYear, targetYear)
      )
    );

    return fmrData;
  } catch (error) {
    console.error('[DataCache] Error fetching FMR data:', error);
    return [];
  }
}

export async function getCachedEmploymentData(stateCode: string, months: number = 24): Promise<CachedEmploymentData[]> {
  try {
    const employmentData = await db.select({
      stateCode: blsEmploymentData.stateCode,
      year: blsEmploymentData.year,
      month: blsEmploymentData.month,
      unemploymentRate: blsEmploymentData.unemploymentRate,
      laborForce: blsEmploymentData.laborForce,
      employed: blsEmploymentData.employed,
      unemployed: blsEmploymentData.unemployed,
      laborForceParticipation: blsEmploymentData.laborForceParticipation
    })
    .from(blsEmploymentData)
    .where(eq(blsEmploymentData.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(blsEmploymentData.year), desc(blsEmploymentData.month))
    .limit(months);

    return employmentData;
  } catch (error) {
    console.error('[DataCache] Error fetching employment data:', error);
    return [];
  }
}

export async function getCachedBuildingPermits(stateCode: string, months: number = 24): Promise<CachedBuildingPermits[]> {
  try {
    const permitsData = await db.select({
      stateCode: censusBuildingPermits.stateCode,
      year: censusBuildingPermits.year,
      month: censusBuildingPermits.month,
      totalUnits: censusBuildingPermits.totalUnits,
      singleFamilyUnits: censusBuildingPermits.singleFamilyUnits,
      multiFamilyUnits: censusBuildingPermits.multiFamilyUnits
    })
    .from(censusBuildingPermits)
    .where(eq(censusBuildingPermits.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(censusBuildingPermits.year), desc(censusBuildingPermits.month))
    .limit(months);

    return permitsData;
  } catch (error) {
    console.error('[DataCache] Error fetching building permits:', error);
    return [];
  }
}

export async function getCachedCrimeStats(stateCode: string, years: number = 5): Promise<CachedCrimeStats[]> {
  try {
    const currentYear = new Date().getFullYear();
    
    const crimeData = await db.select({
      stateCode: fbiCrimeStats.stateCode,
      year: fbiCrimeStats.year,
      violentCrimeTotal: fbiCrimeStats.violentCrimeTotal,
      propertyCrimeTotal: fbiCrimeStats.propertyCrimeTotal,
      population: fbiCrimeStats.population,
      violentCrimeRate: fbiCrimeStats.violentCrimeRate,
      propertyCrimeRate: fbiCrimeStats.propertyCrimeRate
    })
    .from(fbiCrimeStats)
    .where(
      and(
        eq(fbiCrimeStats.stateCode, stateCode.toUpperCase()),
        gte(fbiCrimeStats.year, currentYear - years)
      )
    )
    .orderBy(desc(fbiCrimeStats.year));

    return crimeData;
  } catch (error) {
    console.error('[DataCache] Error fetching crime stats:', error);
    return [];
  }
}

export async function hasCachedData(source: string): Promise<boolean> {
  try {
    let count = 0;
    switch (source) {
      case 'fred_mortgage_rates':
        const fredResult = await db.select({ count: fredMortgageRates.id }).from(fredMortgageRates).limit(1);
        count = fredResult.length;
        break;
      case 'hud_fair_market_rent':
        const hudResult = await db.select({ count: hudFairMarketRent.id }).from(hudFairMarketRent).limit(1);
        count = hudResult.length;
        break;
      case 'bls_employment_data':
        const blsResult = await db.select({ count: blsEmploymentData.id }).from(blsEmploymentData).limit(1);
        count = blsResult.length;
        break;
      case 'census_building_permits':
        const censusResult = await db.select({ count: censusBuildingPermits.id }).from(censusBuildingPermits).limit(1);
        count = censusResult.length;
        break;
      case 'fbi_crime_stats':
        const fbiResult = await db.select({ count: fbiCrimeStats.id }).from(fbiCrimeStats).limit(1);
        count = fbiResult.length;
        break;
    }
    return count > 0;
  } catch (error) {
    console.error(`[DataCache] Error checking cache for ${source}:`, error);
    return false;
  }
}

export async function getMortgageRateTrend(): Promise<{
  currentRate: number | null;
  weekAgo: number | null;
  monthAgo: number | null;
  yearAgo: number | null;
  twoYearsAgo: number | null;
  historicalAvg: number | null;
}> {
  try {
    const rates = await getCachedMortgageRates(120);
    
    if (rates.length === 0) {
      return {
        currentRate: null,
        weekAgo: null,
        monthAgo: null,
        yearAgo: null,
        twoYearsAgo: null,
        historicalAvg: null
      };
    }

    const current = rates[0]?.rate || null;
    const weekAgo = rates[1]?.rate || null;
    const monthAgo = rates[4]?.rate || null;
    const yearAgo = rates[52]?.rate || null;
    const twoYearsAgo = rates[104]?.rate || null;
    
    const validRates = rates.map(r => r.rate).filter(r => r > 0);
    const historicalAvg = validRates.length > 0 
      ? validRates.reduce((sum, r) => sum + r, 0) / validRates.length 
      : null;

    return {
      currentRate: current,
      weekAgo,
      monthAgo,
      yearAgo,
      twoYearsAgo,
      historicalAvg
    };
  } catch (error) {
    console.error('[DataCache] Error calculating mortgage trend:', error);
    return {
      currentRate: null,
      weekAgo: null,
      monthAgo: null,
      yearAgo: null,
      twoYearsAgo: null,
      historicalAvg: null
    };
  }
}

export async function getEmploymentTrend(stateCode: string): Promise<{
  currentRate: number | null;
  previousMonth: number | null;
  yearAgo: number | null;
  trend: 'improving' | 'declining' | 'stable' | null;
}> {
  try {
    const data = await getCachedEmploymentData(stateCode, 13);
    
    if (data.length === 0) {
      return { currentRate: null, previousMonth: null, yearAgo: null, trend: null };
    }

    const current = data[0]?.unemploymentRate || null;
    const previous = data[1]?.unemploymentRate || null;
    const yearAgo = data[12]?.unemploymentRate || null;

    let trend: 'improving' | 'declining' | 'stable' | null = null;
    if (current !== null && yearAgo !== null) {
      const change = current - yearAgo;
      if (change < -0.3) trend = 'improving';
      else if (change > 0.3) trend = 'declining';
      else trend = 'stable';
    }

    return { currentRate: current, previousMonth: previous, yearAgo, trend };
  } catch (error) {
    console.error('[DataCache] Error calculating employment trend:', error);
    return { currentRate: null, previousMonth: null, yearAgo: null, trend: null };
  }
}

export async function getBuildingPermitTrend(stateCode: string): Promise<{
  currentPermits: number | null;
  previousMonth: number | null;
  yearAgo: number | null;
  yearOverYearChange: number | null;
  trend: 'growing' | 'declining' | 'stable' | null;
}> {
  try {
    const data = await getCachedBuildingPermits(stateCode, 13);
    
    if (data.length === 0) {
      return { currentPermits: null, previousMonth: null, yearAgo: null, yearOverYearChange: null, trend: null };
    }

    const current = data[0]?.totalUnits || null;
    const previous = data[1]?.totalUnits || null;
    const yearAgo = data[12]?.totalUnits || null;

    let yearOverYearChange: number | null = null;
    let trend: 'growing' | 'declining' | 'stable' | null = null;
    
    if (current !== null && yearAgo !== null && yearAgo > 0) {
      yearOverYearChange = ((current - yearAgo) / yearAgo) * 100;
      if (yearOverYearChange > 5) trend = 'growing';
      else if (yearOverYearChange < -5) trend = 'declining';
      else trend = 'stable';
    }

    return { currentPermits: current, previousMonth: previous, yearAgo, yearOverYearChange, trend };
  } catch (error) {
    console.error('[DataCache] Error calculating permit trend:', error);
    return { currentPermits: null, previousMonth: null, yearAgo: null, yearOverYearChange: null, trend: null };
  }
}

export async function getCrimeTrend(stateCode: string): Promise<{
  currentViolentRate: number | null;
  currentPropertyRate: number | null;
  yearAgoViolent: number | null;
  yearAgoProperty: number | null;
  trend: 'improving' | 'declining' | 'stable' | null;
}> {
  try {
    const data = await getCachedCrimeStats(stateCode, 3);
    
    if (data.length === 0) {
      return { 
        currentViolentRate: null, 
        currentPropertyRate: null, 
        yearAgoViolent: null, 
        yearAgoProperty: null, 
        trend: null 
      };
    }

    const current = data[0];
    const previous = data[1];

    const currentViolent = current?.violentCrimeRate || null;
    const currentProperty = current?.propertyCrimeRate || null;
    const prevViolent = previous?.violentCrimeRate || null;

    let trend: 'improving' | 'declining' | 'stable' | null = null;
    if (currentViolent !== null && prevViolent !== null && prevViolent > 0) {
      const violentChange = ((currentViolent - prevViolent) / prevViolent) * 100;
      if (violentChange < -3) trend = 'improving';
      else if (violentChange > 3) trend = 'declining';
      else trend = 'stable';
    }

    return {
      currentViolentRate: currentViolent,
      currentPropertyRate: currentProperty,
      yearAgoViolent: prevViolent,
      yearAgoProperty: previous?.propertyCrimeRate || null,
      trend
    };
  } catch (error) {
    console.error('[DataCache] Error calculating crime trend:', error);
    return { 
      currentViolentRate: null, 
      currentPropertyRate: null, 
      yearAgoViolent: null, 
      yearAgoProperty: null, 
      trend: null 
    };
  }
}
