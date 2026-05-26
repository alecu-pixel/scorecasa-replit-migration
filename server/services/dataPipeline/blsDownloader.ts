import { db } from '../../db';
import { blsEmploymentData, dataPipelineStatus } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const BLS_API_BASE = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

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
  'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
};

const MONTH_MAP: Record<string, number> = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4,
  'May': 5, 'June': 6, 'July': 7, 'August': 8,
  'September': 9, 'October': 10, 'November': 11, 'December': 12
};

interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
}

interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
}

interface BLSResponse {
  status: string;
  Results?: {
    series: BLSSeries[];
  };
}

export async function downloadBlsEmploymentData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  const blsApiKey = process.env.BLS_API_KEY;
  
  try {
    console.log('[BLS Pipeline] Starting employment data download...');
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    let newRecords = 0;
    const errors: string[] = [];

    const seriesIds: string[] = [];
    const stateSeriesMap: Record<string, string> = {};
    
    for (const [stateCode, fips] of Object.entries(STATE_FIPS)) {
      const seriesId = `LASST${fips}0000000000003`;
      seriesIds.push(seriesId);
      stateSeriesMap[seriesId] = stateCode;
    }

    seriesIds.push('LNS14000000');

    const batchSize = 25;
    for (let i = 0; i < seriesIds.length; i += batchSize) {
      const batch = seriesIds.slice(i, i + batchSize);
      
      try {
        const requestBody: any = {
          seriesid: batch,
          startyear: String(startYear),
          endyear: String(currentYear),
        };
        
        if (blsApiKey) {
          requestBody.registrationkey = blsApiKey;
        }

        const response = await fetch(BLS_API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          errors.push(`Batch ${i}: HTTP ${response.status}`);
          continue;
        }

        const data: BLSResponse = await response.json();
        
        if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series) {
          errors.push(`Batch ${i}: Request failed`);
          continue;
        }

        for (const series of data.Results.series) {
          const stateCode = stateSeriesMap[series.seriesID];
          if (!stateCode) continue;

          const records = series.data.map(dp => ({
            stateCode,
            year: parseInt(dp.year),
            month: MONTH_MAP[dp.periodName] || parseInt(dp.period.replace('M', '')),
            unemploymentRate: parseFloat(dp.value),
          }));

          for (const record of records) {
            await db
              .insert(blsEmploymentData)
              .values(record)
              .onConflictDoNothing();
            newRecords++;
          }
        }

        await delay(500);
      } catch (error) {
        errors.push(`Batch ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(blsEmploymentData);
    const totalRecords = Number(countResult[0]?.count ?? newRecords);

    await updatePipelineStatus('bls_employment_data', totalRecords, errors.length === 0 ? 'success' : 'partial');

    console.log(`[BLS Pipeline] Downloaded ${newRecords} new employment records, ${totalRecords} total in DB`);
    return { 
      success: true, 
      recordCount: totalRecords, 
      message: errors.length > 0 ? `${totalRecords} total records (${newRecords} new, ${errors.length} errors)` : `${totalRecords} total records (${newRecords} new)`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BLS Pipeline] Error:', errorMessage);
    await updatePipelineStatus('bls_employment_data', 0, 'error', errorMessage);
    return { success: false, recordCount: 0, message: errorMessage };
  }
}

export async function getEmploymentFromCache(stateCode: string): Promise<{
  unemploymentRate: number | null;
  year: number;
  month: number;
} | null> {
  const records = await db
    .select()
    .from(blsEmploymentData)
    .where(eq(blsEmploymentData.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(blsEmploymentData.year), desc(blsEmploymentData.month))
    .limit(1);
  
  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  return {
    unemploymentRate: record.unemploymentRate,
    year: record.year,
    month: record.month,
  };
}

export async function getEmploymentTrend(stateCode: string, months: number = 12): Promise<{
  year: number;
  month: number;
  unemploymentRate: number | null;
}[]> {
  const records = await db
    .select({
      year: blsEmploymentData.year,
      month: blsEmploymentData.month,
      unemploymentRate: blsEmploymentData.unemploymentRate,
    })
    .from(blsEmploymentData)
    .where(eq(blsEmploymentData.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(blsEmploymentData.year), desc(blsEmploymentData.month))
    .limit(months);

  return records;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updatePipelineStatus(
  dataSource: string,
  recordCount: number,
  status: 'success' | 'error' | 'pending' | 'partial',
  errorMessage?: string
): Promise<void> {
  const now = new Date();
  const nextScheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db
    .insert(dataPipelineStatus)
    .values({
      dataSource,
      lastDownloadAt: now,
      lastSuccessAt: status === 'success' || status === 'partial' ? now : undefined,
      recordCount,
      status,
      errorMessage: errorMessage || null,
      nextScheduledAt: status === 'success' || status === 'partial' ? nextScheduledAt : undefined,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dataPipelineStatus.dataSource,
      set: {
        lastDownloadAt: now,
        lastSuccessAt: status === 'success' || status === 'partial' ? now : sql`${dataPipelineStatus.lastSuccessAt}`,
        recordCount,
        status,
        errorMessage: errorMessage || null,
        nextScheduledAt: status === 'success' || status === 'partial' ? nextScheduledAt : sql`${dataPipelineStatus.nextScheduledAt}`,
        updatedAt: now,
      },
    });
}
