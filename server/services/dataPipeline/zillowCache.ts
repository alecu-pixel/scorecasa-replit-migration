import { db } from '../../db';
import { zillowHomeValueForecast, zillowRentForecast, zillowMarketMetrics } from '@shared/schema';
import { eq, and, desc, like, ilike, sql } from 'drizzle-orm';
import type { HomeValueForecastData, RentForecastData, MarketVelocityData } from '@shared/schema';

export async function getHomeValueForecastByZip(zipCode: string): Promise<HomeValueForecastData | null> {
  try {
    const results = await db
      .select()
      .from(zillowHomeValueForecast)
      .where(
        and(
          eq(zillowHomeValueForecast.regionType, 'zip'),
          eq(zillowHomeValueForecast.regionId, zipCode)
        )
      )
      .orderBy(desc(zillowHomeValueForecast.baseDate))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];
    return formatHomeValueForecast(record);
  } catch (error) {
    console.error('[Zillow Cache] Error fetching home value forecast by ZIP:', error);
    return null;
  }
}

export async function getHomeValueForecastByMetro(metroName: string): Promise<HomeValueForecastData | null> {
  try {
    const searchPattern = `%${metroName}%`;
    
    const results = await db
      .select()
      .from(zillowHomeValueForecast)
      .where(
        and(
          eq(zillowHomeValueForecast.regionType, 'metro'),
          ilike(zillowHomeValueForecast.regionName, searchPattern)
        )
      )
      .orderBy(desc(zillowHomeValueForecast.baseDate))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];
    return formatHomeValueForecast(record);
  } catch (error) {
    console.error('[Zillow Cache] Error fetching home value forecast by metro:', error);
    return null;
  }
}

export async function getHomeValueForecastByState(stateCode: string): Promise<HomeValueForecastData | null> {
  try {
    const results = await db
      .select()
      .from(zillowHomeValueForecast)
      .where(
        and(
          eq(zillowHomeValueForecast.regionType, 'metro'),
          eq(zillowHomeValueForecast.stateCode, stateCode.toUpperCase())
        )
      )
      .orderBy(desc(zillowHomeValueForecast.baseDate))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];
    return formatHomeValueForecast(record);
  } catch (error) {
    console.error('[Zillow Cache] Error fetching home value forecast by state:', error);
    return null;
  }
}

function formatHomeValueForecast(record: any): HomeValueForecastData {
  const yearChange = record.forecastYearChange || 0;
  
  let direction: 'rising' | 'falling' | 'stable' = 'stable';
  let strength: 'strong' | 'moderate' | 'slight' = 'slight';
  
  if (yearChange > 0.01) direction = 'rising';
  else if (yearChange < -0.01) direction = 'falling';
  
  const absChange = Math.abs(yearChange);
  if (absChange > 0.05) strength = 'strong';
  else if (absChange > 0.02) strength = 'moderate';
  
  const changePercent = (yearChange * 100).toFixed(1);
  let insight = '';
  
  if (direction === 'rising') {
    insight = `Home values in this area are forecast to rise ${changePercent}% over the next year, indicating ${strength} appreciation potential.`;
  } else if (direction === 'falling') {
    insight = `Home values in this area are forecast to decline ${Math.abs(parseFloat(changePercent)).toFixed(1)}% over the next year, suggesting caution for short-term investments.`;
  } else {
    insight = 'Home values in this area are expected to remain relatively stable over the next year.';
  }

  return {
    regionId: record.regionId,
    regionName: record.regionName || '',
    regionType: record.regionType as 'zip' | 'metro' | 'state' | 'country',
    stateCode: record.stateCode || '',
    baseDate: record.baseDate,
    currentValue: record.currentValue || 0,
    forecastMonthChange: record.forecastMonthChange || 0,
    forecastQuarterChange: record.forecastQuarterChange || 0,
    forecastYearChange: record.forecastYearChange || 0,
    forecastDirection: direction,
    forecastStrength: strength,
    insight,
    source: 'zillow_csv',
  };
}

export async function getRentForecast(): Promise<RentForecastData | null> {
  try {
    const results = await db
      .select()
      .from(zillowRentForecast)
      .orderBy(desc(zillowRentForecast.baseDate))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];
    const yearChange = record.forecastYearChange || 0;
    
    let direction: 'rising' | 'falling' | 'stable' = 'stable';
    let strength: 'strong' | 'moderate' | 'slight' = 'slight';
    
    if (yearChange > 0.01) direction = 'rising';
    else if (yearChange < -0.01) direction = 'falling';
    
    const absChange = Math.abs(yearChange);
    if (absChange > 0.05) strength = 'strong';
    else if (absChange > 0.02) strength = 'moderate';
    
    const changePercent = (yearChange * 100).toFixed(1);
    let insight = '';
    
    if (direction === 'rising') {
      insight = `National rents are forecast to increase ${changePercent}% over the next year, potentially boosting rental income.`;
    } else if (direction === 'falling') {
      insight = `National rents are forecast to decline ${Math.abs(parseFloat(changePercent)).toFixed(1)}% over the next year.`;
    } else {
      insight = 'National rents are expected to remain relatively stable over the next year.';
    }

    return {
      regionId: record.regionId,
      regionName: record.regionName || '',
      regionType: record.regionType,
      stateCode: record.stateCode || '',
      baseDate: record.baseDate,
      currentRent: record.currentRent || 0,
      forecastMonthChange: record.forecastMonthChange || 0,
      forecastQuarterChange: record.forecastQuarterChange || 0,
      forecastYearChange: record.forecastYearChange || 0,
      forecastDirection: direction,
      forecastStrength: strength,
      insight,
      source: 'zillow_csv',
    };
  } catch (error) {
    console.error('[Zillow Cache] Error fetching rent forecast:', error);
    return null;
  }
}

export async function getMarketMetricsByMetro(metroName: string): Promise<MarketVelocityData | null> {
  try {
    const searchPattern = `%${metroName}%`;
    
    const results = await db
      .select()
      .from(zillowMarketMetrics)
      .where(ilike(zillowMarketMetrics.regionName, searchPattern))
      .orderBy(desc(zillowMarketMetrics.metricDate))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];
    return formatMarketMetrics(record);
  } catch (error) {
    console.error('[Zillow Cache] Error fetching market metrics by metro:', error);
    return null;
  }
}

export async function getMarketMetricsByState(stateCode: string): Promise<MarketVelocityData | null> {
  try {
    const results = await db
      .select()
      .from(zillowMarketMetrics)
      .where(eq(zillowMarketMetrics.stateCode, stateCode.toUpperCase()))
      .orderBy(desc(zillowMarketMetrics.metricDate))
      .limit(1);

    if (results.length === 0) return null;

    const record = results[0];
    return formatMarketMetrics(record);
  } catch (error) {
    console.error('[Zillow Cache] Error fetching market metrics by state:', error);
    return null;
  }
}

function formatMarketMetrics(record: any): MarketVelocityData {
  const daysToPending = record.daysToPending || 0;
  const saleToListRatio = record.saleToListRatio || 1;
  const percentAbove = record.percentSoldAboveList || 0;
  
  let marketHeat: 'hot' | 'warm' | 'balanced' | 'cool' | 'cold' = 'balanced';
  let buyerCompetition: 'high' | 'moderate' | 'low' = 'moderate';
  
  if (daysToPending < 14 && saleToListRatio > 1.02) {
    marketHeat = 'hot';
    buyerCompetition = 'high';
  } else if (daysToPending < 21 && saleToListRatio > 0.99) {
    marketHeat = 'warm';
    buyerCompetition = 'high';
  } else if (daysToPending > 45 && saleToListRatio < 0.97) {
    marketHeat = 'cold';
    buyerCompetition = 'low';
  } else if (daysToPending > 30 && saleToListRatio < 0.99) {
    marketHeat = 'cool';
    buyerCompetition = 'low';
  }
  
  let insight = '';
  if (marketHeat === 'hot') {
    insight = `This is a hot market with homes selling in just ${Math.round(daysToPending)} days on average. Buyers face high competition, with ${(percentAbove * 100).toFixed(0)}% of homes selling above list price.`;
  } else if (marketHeat === 'warm') {
    insight = `This market favors sellers with homes pending in about ${Math.round(daysToPending)} days. Be prepared for competitive offers.`;
  } else if (marketHeat === 'cold') {
    insight = `This is a buyer's market with homes taking ${Math.round(daysToPending)} days to sell. There's room for negotiation on price.`;
  } else if (marketHeat === 'cool') {
    insight = `This market slightly favors buyers with homes taking about ${Math.round(daysToPending)} days to sell. Good opportunity for patient buyers.`;
  } else {
    insight = `This is a balanced market with homes selling in about ${Math.round(daysToPending)} days at close to asking price.`;
  }

  return {
    regionId: record.regionId,
    regionName: record.regionName || '',
    metricDate: record.metricDate,
    daysToPending: record.daysToPending || 0,
    saleToListRatio: record.saleToListRatio || 0,
    inventoryForSale: record.inventoryForSale || 0,
    newListings: record.newListings || 0,
    medianListPrice: record.medianListPrice || 0,
    percentSoldAboveList: record.percentSoldAboveList || 0,
    percentSoldBelowList: record.percentSoldBelowList || 0,
    marketHeat,
    buyerCompetition,
    insight,
    source: 'zillow_csv',
  };
}

export async function getZillowDataStatus(): Promise<{
  homeValueForecasts: number;
  rentForecasts: number;
  marketMetrics: number;
  lastUpdated: string | null;
}> {
  try {
    const [hvfCount, rfCount, mmCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(zillowHomeValueForecast),
      db.select({ count: sql<number>`count(*)` }).from(zillowRentForecast),
      db.select({ count: sql<number>`count(*)` }).from(zillowMarketMetrics),
    ]);

    const latest = await db
      .select({ baseDate: zillowHomeValueForecast.baseDate })
      .from(zillowHomeValueForecast)
      .orderBy(desc(zillowHomeValueForecast.baseDate))
      .limit(1);

    return {
      homeValueForecasts: Number(hvfCount[0]?.count || 0),
      rentForecasts: Number(rfCount[0]?.count || 0),
      marketMetrics: Number(mmCount[0]?.count || 0),
      lastUpdated: latest[0]?.baseDate || null,
    };
  } catch (error) {
    console.error('[Zillow Cache] Error getting status:', error);
    return {
      homeValueForecasts: 0,
      rentForecasts: 0,
      marketMetrics: 0,
      lastUpdated: null,
    };
  }
}
