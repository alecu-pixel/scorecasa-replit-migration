import { db } from '../../db';
import { hudFairMarketRent, dataPipelineStatus } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

const HUD_API_BASE = 'https://www.huduser.gov/hudapi/public/fmr';

const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

interface HUDCountyData {
  fips_code: string;
  county_name: string;
  state_name: string;
  Efficiency: number;
  One_Bedroom: number;
  Two_Bedroom: number;
  Three_Bedroom: number;
  Four_Bedroom: number;
  smallarea_status?: string;
}

interface HUDStateResponse {
  data?: {
    counties?: HUDCountyData[];
  };
}

export async function downloadHudFairMarketRent(): Promise<{ success: boolean; recordCount: number; message: string }> {
  const hudToken = process.env.HUD_API_KEY || process.env.HUD_TOKEN;
  
  if (!hudToken) {
    return { success: false, recordCount: 0, message: 'HUD_API_KEY not configured' };
  }

  try {
    console.log('[HUD Pipeline] Starting FMR download...');
    
    const currentYear = new Date().getFullYear();
    const fiscalYear = currentYear;
    let totalRecords = 0;
    const errors: string[] = [];

    await db.delete(hudFairMarketRent).where(eq(hudFairMarketRent.fiscalYear, fiscalYear));

    for (const stateCode of STATE_CODES) {
      try {
        const url = `${HUD_API_BASE}/statedata/${stateCode}?year=${fiscalYear}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${hudToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          errors.push(`${stateCode}: HTTP ${response.status}`);
          continue;
        }

        const data: HUDStateResponse = await response.json();
        const counties = data?.data?.counties || [];
        
        if (counties.length === 0) {
          continue;
        }

        const records = counties.map(county => ({
          fiscalYear,
          stateCode,
          countyCode: county.fips_code,
          countyName: county.county_name,
          areaName: `${county.county_name}, ${county.state_name}`,
          efficiency: county.Efficiency || null,
          oneBedroom: county.One_Bedroom || null,
          twoBedroom: county.Two_Bedroom || null,
          threeBedroom: county.Three_Bedroom || null,
          fourBedroom: county.Four_Bedroom || null,
          smallAreaFmr: county.smallarea_status === '1',
        }));

        if (records.length > 0) {
          await db.insert(hudFairMarketRent).values(records);
          totalRecords += records.length;
        }

        await delay(100);
      } catch (error) {
        errors.push(`${stateCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await updatePipelineStatus('hud_fair_market_rent', totalRecords, errors.length === 0 ? 'success' : 'partial');

    console.log(`[HUD Pipeline] Downloaded ${totalRecords} FMR records`);
    return { 
      success: true, 
      recordCount: totalRecords, 
      message: errors.length > 0 ? `Downloaded ${totalRecords} records with ${errors.length} errors` : `Downloaded ${totalRecords} records`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HUD Pipeline] Error:', errorMessage);
    await updatePipelineStatus('hud_fair_market_rent', 0, 'error', errorMessage);
    return { success: false, recordCount: 0, message: errorMessage };
  }
}

export async function getFmrFromCache(stateCode: string, countyCode?: string): Promise<{
  efficiency: number | null;
  oneBedroom: number | null;
  twoBedroom: number | null;
  threeBedroom: number | null;
  fourBedroom: number | null;
  countyName: string | null;
  fiscalYear: number;
} | null> {
  const currentYear = new Date().getFullYear();
  
  let query = db
    .select()
    .from(hudFairMarketRent)
    .where(
      and(
        eq(hudFairMarketRent.stateCode, stateCode.toUpperCase()),
        eq(hudFairMarketRent.fiscalYear, currentYear)
      )
    )
    .limit(1);

  const records = await query;
  
  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  return {
    efficiency: record.efficiency,
    oneBedroom: record.oneBedroom,
    twoBedroom: record.twoBedroom,
    threeBedroom: record.threeBedroom,
    fourBedroom: record.fourBedroom,
    countyName: record.countyName,
    fiscalYear: record.fiscalYear,
  };
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
  const nextScheduledAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

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
