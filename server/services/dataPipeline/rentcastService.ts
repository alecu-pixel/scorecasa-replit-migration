import { db } from '../../db';
import { rentcastCache, rentcastQuota, dataPipelineStatus } from '@shared/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import type { RentCastPropertyData } from '@shared/schema';

const RENTCAST_API_BASE = 'https://api.rentcast.io/v1';
const MONTHLY_QUOTA_LIMIT = 50;
const CACHE_EXPIRY_DAYS = 30;

async function getRentCastApiKey(): Promise<string | null> {
  return process.env.RENTCAST_API_KEY || null;
}

async function getCurrentMonthQuota(): Promise<{ callsUsed: number; callsLimit: number; canMakeCall: boolean }> {
  const monthYear = new Date().toISOString().slice(0, 7);
  
  const existing = await db
    .select()
    .from(rentcastQuota)
    .where(eq(rentcastQuota.monthYear, monthYear))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(rentcastQuota).values({
      monthYear,
      callsUsed: 0,
      callsLimit: MONTHLY_QUOTA_LIMIT,
    });
    return { callsUsed: 0, callsLimit: MONTHLY_QUOTA_LIMIT, canMakeCall: true };
  }

  const quota = existing[0];
  return {
    callsUsed: quota.callsUsed,
    callsLimit: quota.callsLimit,
    canMakeCall: quota.callsUsed < quota.callsLimit,
  };
}

async function incrementQuotaUsage(): Promise<void> {
  const monthYear = new Date().toISOString().slice(0, 7);
  
  await db
    .update(rentcastQuota)
    .set({
      callsUsed: sql`${rentcastQuota.callsUsed} + 1`,
      lastCallAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(rentcastQuota.monthYear, monthYear));
}

async function getCachedData(address: string): Promise<RentCastPropertyData | null> {
  const now = new Date();
  
  const cached = await db
    .select()
    .from(rentcastCache)
    .where(
      and(
        eq(rentcastCache.address, address.toLowerCase()),
        gt(rentcastCache.expiresAt, now)
      )
    )
    .limit(1);

  if (cached.length === 0) return null;

  const record = cached[0];
  return {
    address: record.address,
    zipCode: record.zipCode || '',
    propertyType: record.propertyType || '',
    bedrooms: record.bedrooms || 0,
    bathrooms: record.bathrooms || 0,
    squareFootage: record.squareFootage || 0,
    yearBuilt: record.yearBuilt || 0,
    rentEstimate: record.rentEstimate || 0,
    rentRangeLow: record.rentRangeLow || 0,
    rentRangeHigh: record.rentRangeHigh || 0,
    priceEstimate: record.priceEstimate || 0,
    priceRangeLow: record.priceRangeLow || 0,
    priceRangeHigh: record.priceRangeHigh || 0,
    daysOnMarket: record.daysOnMarket,
    lastSaleDate: record.lastSaleDate || null,
    lastSalePrice: record.lastSalePrice,
    source: 'cache',
    cachedAt: record.cachedAt ? new Date(record.cachedAt).toISOString() : null,
  };
}

async function cacheResponse(address: string, data: any): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRY_DAYS);

  await db.delete(rentcastCache).where(eq(rentcastCache.address, address.toLowerCase()));

  await db.insert(rentcastCache).values({
    address: address.toLowerCase(),
    zipCode: data.zipCode || null,
    lat: data.latitude || null,
    lng: data.longitude || null,
    propertyType: data.propertyType || null,
    bedrooms: data.bedrooms || null,
    bathrooms: data.bathrooms || null,
    squareFootage: data.squareFootage || null,
    yearBuilt: data.yearBuilt || null,
    rentEstimate: data.rentEstimate || data.rent || null,
    rentRangeLow: data.rentRangeLow || null,
    rentRangeHigh: data.rentRangeHigh || null,
    priceEstimate: data.price || data.priceEstimate || null,
    priceRangeLow: data.priceRangeLow || null,
    priceRangeHigh: data.priceRangeHigh || null,
    daysOnMarket: data.daysOnMarket || null,
    lastSaleDate: data.lastSaleDate ? new Date(data.lastSaleDate).toISOString().split('T')[0] : null,
    lastSalePrice: data.lastSalePrice || null,
    responseJson: data,
    expiresAt,
  });
}

export async function getPropertyData(address: string): Promise<{
  data: RentCastPropertyData | null;
  source: 'api' | 'cache' | 'quota_exhausted' | 'no_api_key' | 'error';
  quotaStatus: { callsUsed: number; callsLimit: number; quotaRemaining: number };
}> {
  const quotaInfo = await getCurrentMonthQuota();
  const quotaStatus = {
    callsUsed: quotaInfo.callsUsed,
    callsLimit: quotaInfo.callsLimit,
    quotaRemaining: quotaInfo.callsLimit - quotaInfo.callsUsed,
  };

  const cached = await getCachedData(address);
  if (cached) {
    console.log(`[RentCast] Cache hit for address: ${address}`);
    return { data: cached, source: 'cache', quotaStatus };
  }

  const apiKey = await getRentCastApiKey();
  if (!apiKey) {
    console.log('[RentCast] No API key configured');
    return { data: null, source: 'no_api_key', quotaStatus };
  }

  if (!quotaInfo.canMakeCall) {
    console.log(`[RentCast] Quota exhausted (${quotaInfo.callsUsed}/${quotaInfo.callsLimit})`);
    return { data: null, source: 'quota_exhausted', quotaStatus };
  }

  try {
    console.log(`[RentCast] Fetching data for address: ${address}`);
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`${RENTCAST_API_BASE}/properties?address=${encodedAddress}`, {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[RentCast] API error: ${response.status} ${response.statusText}`);
      return { data: null, source: 'error', quotaStatus };
    }

    const responseData = await response.json();
    
    if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
      console.log('[RentCast] No data found for address');
      return { data: null, source: 'error', quotaStatus };
    }

    await incrementQuotaUsage();
    quotaStatus.callsUsed++;
    quotaStatus.quotaRemaining--;

    const propertyData = Array.isArray(responseData) ? responseData[0] : responseData;

    await cacheResponse(address, propertyData);

    const result: RentCastPropertyData = {
      address: propertyData.formattedAddress || address,
      zipCode: propertyData.zipCode || '',
      propertyType: propertyData.propertyType || '',
      bedrooms: propertyData.bedrooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      squareFootage: propertyData.squareFootage || 0,
      yearBuilt: propertyData.yearBuilt || 0,
      rentEstimate: propertyData.rentEstimate || propertyData.rent || 0,
      rentRangeLow: propertyData.rentRangeLow || 0,
      rentRangeHigh: propertyData.rentRangeHigh || 0,
      priceEstimate: propertyData.price || propertyData.priceEstimate || 0,
      priceRangeLow: propertyData.priceRangeLow || 0,
      priceRangeHigh: propertyData.priceRangeHigh || 0,
      daysOnMarket: propertyData.daysOnMarket || null,
      lastSaleDate: propertyData.lastSaleDate || null,
      lastSalePrice: propertyData.lastSalePrice || null,
      source: 'rentcast_api',
      cachedAt: new Date().toISOString(),
    };

    console.log(`[RentCast] Successfully fetched and cached data for: ${address}`);
    return { data: result, source: 'api', quotaStatus };

  } catch (error) {
    console.error('[RentCast] API request failed:', error);
    return { data: null, source: 'error', quotaStatus };
  }
}

export async function getMarketData(zipCode: string): Promise<{
  data: any | null;
  source: 'api' | 'cache' | 'quota_exhausted' | 'no_api_key' | 'error';
}> {
  const apiKey = await getRentCastApiKey();
  if (!apiKey) {
    return { data: null, source: 'no_api_key' };
  }

  const quotaInfo = await getCurrentMonthQuota();
  if (!quotaInfo.canMakeCall) {
    return { data: null, source: 'quota_exhausted' };
  }

  try {
    const response = await fetch(`${RENTCAST_API_BASE}/markets?zipCode=${zipCode}`, {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { data: null, source: 'error' };
    }

    const data = await response.json();
    
    await incrementQuotaUsage();
    
    return { data, source: 'api' };

  } catch (error) {
    console.error('[RentCast] Market data request failed:', error);
    return { data: null, source: 'error' };
  }
}

export async function getQuotaStatus(): Promise<{
  monthYear: string;
  callsUsed: number;
  callsLimit: number;
  quotaRemaining: number;
  percentUsed: number;
}> {
  const quota = await getCurrentMonthQuota();
  const monthYear = new Date().toISOString().slice(0, 7);
  
  return {
    monthYear,
    callsUsed: quota.callsUsed,
    callsLimit: quota.callsLimit,
    quotaRemaining: quota.callsLimit - quota.callsUsed,
    percentUsed: Math.round((quota.callsUsed / quota.callsLimit) * 100),
  };
}

export async function getCacheStats(): Promise<{
  totalCached: number;
  validCached: number;
  expiredCached: number;
}> {
  const now = new Date();
  
  const [total, valid] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(rentcastCache),
    db.select({ count: sql<number>`count(*)` }).from(rentcastCache).where(gt(rentcastCache.expiresAt, now)),
  ]);

  const totalCount = Number(total[0]?.count || 0);
  const validCount = Number(valid[0]?.count || 0);

  return {
    totalCached: totalCount,
    validCached: validCount,
    expiredCached: totalCount - validCount,
  };
}
