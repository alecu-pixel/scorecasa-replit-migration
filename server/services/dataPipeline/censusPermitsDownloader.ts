import { db } from '../../db';
import { censusBuildingPermits, dataPipelineStatus } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const CENSUS_BPS_CSV_BASE = 'https://www2.census.gov/econ/bps/State';

const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'
};

export async function downloadCensusBuildingPermits(): Promise<{ success: boolean; recordCount: number; message: string }> {
  try {
    console.log('[Census Permits Pipeline] Starting building permits download from Census BPS CSV files...');
    
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 3, currentYear - 4];
    let newRecords = 0;
    const errors: string[] = [];

    for (const year of years) {
      try {
        const url = `${CENSUS_BPS_CSV_BASE}/st${year}a.txt`;
        
        console.log(`[Census Permits Pipeline] Fetching year ${year} from ${url}...`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          errors.push(`Year ${year}: HTTP ${response.status}`);
          continue;
        }

        const text = await response.text();
        const lines = text.split('\n').filter(l => l.trim().length > 0);

        if (lines.length < 4) {
          errors.push(`Year ${year}: Unexpected CSV format (only ${lines.length} lines)`);
          continue;
        }

        const dataLines = lines.slice(3);

        for (const line of dataLines) {
          const cols = line.split(',');
          if (cols.length < 17) continue;

          const stateFips = cols[1].trim().padStart(2, '0');
          const stateCode = FIPS_TO_STATE[stateFips];
          if (!stateCode) continue;

          const areaName = cols[4].trim();

          const singleFamilyBldgs = parseInt(cols[5]) || 0;
          const singleFamilyUnits = parseInt(cols[6]) || 0;
          const twoBldgs = parseInt(cols[8]) || 0;
          const twoUnits = parseInt(cols[9]) || 0;
          const threeFourBldgs = parseInt(cols[11]) || 0;
          const threeFourUnits = parseInt(cols[12]) || 0;
          const fivePlusBldgs = parseInt(cols[14]) || 0;
          const fivePlusUnits = parseInt(cols[15]) || 0;

          const totalBuildings = singleFamilyBldgs + twoBldgs + threeFourBldgs + fivePlusBldgs;
          const multiFamilyUnits = twoUnits + threeFourUnits + fivePlusUnits;
          const totalUnits = singleFamilyUnits + multiFamilyUnits;

          const record = {
            stateCode,
            stateFips,
            areaName: areaName || null,
            year,
            totalUnits: totalUnits || null,
            totalBuildings: totalBuildings || null,
            singleFamilyUnits: singleFamilyUnits || null,
            multiFamilyUnits: multiFamilyUnits || null,
          };

          await db
            .insert(censusBuildingPermits)
            .values(record)
            .onConflictDoNothing();
          newRecords++;
        }

        await delay(300);
      } catch (error) {
        errors.push(`Year ${year}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(censusBuildingPermits);
    const totalRecords = Number(countResult[0]?.count ?? newRecords);

    await updatePipelineStatus('census_building_permits', totalRecords, errors.length === 0 ? 'success' : 'partial');

    console.log(`[Census Permits Pipeline] Downloaded ${newRecords} new permit records, ${totalRecords} total in DB`);
    return { 
      success: true, 
      recordCount: totalRecords, 
      message: errors.length > 0 ? `${totalRecords} total records (${newRecords} new, ${errors.length} errors)` : `${totalRecords} total records (${newRecords} new)`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Census Permits Pipeline] Error:', errorMessage);
    await updatePipelineStatus('census_building_permits', 0, 'error', errorMessage);
    return { success: false, recordCount: 0, message: errorMessage };
  }
}

export async function getPermitsFromCache(stateCode: string): Promise<{
  year: number;
  totalUnits: number | null;
  totalBuildings: number | null;
  singleFamilyUnits: number | null;
  multiFamilyUnits: number | null;
} | null> {
  const records = await db
    .select()
    .from(censusBuildingPermits)
    .where(eq(censusBuildingPermits.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(censusBuildingPermits.year))
    .limit(1);
  
  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  return {
    year: record.year,
    totalUnits: record.totalUnits,
    totalBuildings: record.totalBuildings,
    singleFamilyUnits: record.singleFamilyUnits,
    multiFamilyUnits: record.multiFamilyUnits,
  };
}

export async function getPermitsTrend(stateCode: string): Promise<{
  year: number;
  totalUnits: number | null;
}[]> {
  const records = await db
    .select({
      year: censusBuildingPermits.year,
      totalUnits: censusBuildingPermits.totalUnits,
    })
    .from(censusBuildingPermits)
    .where(eq(censusBuildingPermits.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(censusBuildingPermits.year))
    .limit(5);

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
