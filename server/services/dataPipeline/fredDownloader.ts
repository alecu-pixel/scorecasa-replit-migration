import { db } from '../../db';
import { fredMortgageRates, dataPipelineStatus } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';
const SERIES_ID = 'MORTGAGE30US';

interface FREDObservation {
  date: string;
  value: string;
}

interface FREDSeriesResponse {
  observations: FREDObservation[];
}

export async function downloadFredMortgageRates(): Promise<{ success: boolean; recordCount: number; message: string }> {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    return { success: false, recordCount: 0, message: 'FRED_API_KEY not configured' };
  }

  try {
    console.log('[FRED Pipeline] Starting mortgage rate download...');
    
    const url = `${FRED_API_BASE}/series/observations?series_id=${SERIES_ID}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=520`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FRED API returned ${response.status}`);
    }

    const data: FREDSeriesResponse = await response.json();
    const observations = data.observations || [];
    
    if (observations.length === 0) {
      return { success: false, recordCount: 0, message: 'No observations returned from FRED' };
    }

    const validRecords = observations
      .filter(obs => obs.value !== '.' && obs.value !== '' && obs.value !== 'ND')
      .map(obs => ({
        observationDate: obs.date,
        rate: parseFloat(obs.value),
        seriesId: SERIES_ID,
      }));

    await db.delete(fredMortgageRates).where(eq(fredMortgageRates.seriesId, SERIES_ID));

    if (validRecords.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        await db.insert(fredMortgageRates).values(batch);
      }
    }

    await updatePipelineStatus('fred_mortgage_rates', validRecords.length, 'success');

    console.log(`[FRED Pipeline] Downloaded ${validRecords.length} mortgage rate observations`);
    return { success: true, recordCount: validRecords.length, message: `Downloaded ${validRecords.length} observations` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FRED Pipeline] Error:', errorMessage);
    await updatePipelineStatus('fred_mortgage_rates', 0, 'error', errorMessage);
    return { success: false, recordCount: 0, message: errorMessage };
  }
}

export async function getMortgageRatesFromCache(limit: number = 60): Promise<{ date: string; rate: number }[]> {
  const records = await db
    .select({
      date: fredMortgageRates.observationDate,
      rate: fredMortgageRates.rate,
    })
    .from(fredMortgageRates)
    .orderBy(desc(fredMortgageRates.observationDate))
    .limit(limit);

  return records.map(r => ({
    date: r.date,
    rate: r.rate,
  }));
}

export async function getLatestMortgageRate(): Promise<{ date: string; rate: number } | null> {
  const records = await getMortgageRatesFromCache(1);
  return records.length > 0 ? records[0] : null;
}

async function updatePipelineStatus(
  dataSource: string,
  recordCount: number,
  status: 'success' | 'error' | 'pending',
  errorMessage?: string
): Promise<void> {
  const now = new Date();
  const nextScheduledAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await db
    .insert(dataPipelineStatus)
    .values({
      dataSource,
      lastDownloadAt: now,
      lastSuccessAt: status === 'success' ? now : undefined,
      recordCount,
      status,
      errorMessage: errorMessage || null,
      nextScheduledAt: status === 'success' ? nextScheduledAt : undefined,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dataPipelineStatus.dataSource,
      set: {
        lastDownloadAt: now,
        lastSuccessAt: status === 'success' ? now : sql`${dataPipelineStatus.lastSuccessAt}`,
        recordCount,
        status,
        errorMessage: errorMessage || null,
        nextScheduledAt: status === 'success' ? nextScheduledAt : sql`${dataPipelineStatus.nextScheduledAt}`,
        updatedAt: now,
      },
    });
}
