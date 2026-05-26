import { db } from '../../db';
import { fhfaHpiData, dataPipelineStatus } from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import type { FHFAAppreciationData } from '@shared/schema';

const FHFA_MASTER_CSV = 'https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv';

const STATE_FIPS_TO_CODE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
  'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
  'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
  'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
  'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

const STATE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_TO_CODE).map(([name, code]) => [code, name])
);

async function updatePipelineStatus(
  dataSource: string,
  recordCount: number,
  status: string,
  errorMessage?: string
): Promise<void> {
  await db
    .insert(dataPipelineStatus)
    .values({
      dataSource,
      lastDownloadAt: new Date(),
      lastSuccessAt: status === 'success' ? new Date() : undefined,
      recordCount,
      status,
      errorMessage: errorMessage || null,
    })
    .onConflictDoUpdate({
      target: dataPipelineStatus.dataSource,
      set: {
        lastDownloadAt: new Date(),
        lastSuccessAt: status === 'success' ? new Date() : undefined,
        recordCount,
        status,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      },
    });
}

export async function downloadFhfaHpiData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  try {
    console.log('[FHFA Pipeline] Starting HPI data download...');

    const response = await fetch(FHFA_MASTER_CSV, {
      headers: { 'User-Agent': 'ScoreCasa/1.0 (Real Estate Analysis Platform)' },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`FHFA CSV returned HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    // Filter to state-level, quarterly, all-transactions
    // CSV columns: hpi_type (traditional/non-metro), hpi_flavor (all-transactions/purchase-only/expanded-data), frequency, level
    const stateRows = rows.filter((row: any) => {
      const level = (row.level || '').toLowerCase();
      const freq = (row.frequency || '').toLowerCase();
      const flavor = (row.hpi_flavor || '').toLowerCase();
      return (
        level === 'state' &&
        (freq === 'quarterly' || freq === 'q') &&
        flavor === 'all-transactions'
      );
    });

    console.log(`[FHFA Pipeline] Found ${stateRows.length} state-quarterly rows`);

    if (stateRows.length === 0) {
      await updatePipelineStatus('fhfa_hpi_data', 0, 'error', 'No state-level quarterly data found in CSV');
      return { success: false, recordCount: 0, message: 'No state-level quarterly data found' };
    }

    const records: Array<{ stateCode: string; year: number; quarter: number; indexValue: number; indexSa: number | null }> = [];

    for (const row of stateRows) {
      const placeName = row.place_name || row.Place_Name || '';
      const placeId = row.place_id || row.GEO_id || '';

      let stateCode = STATE_NAME_TO_CODE[placeName] || STATE_FIPS_TO_CODE[placeId?.padStart(2, '0')] || null;
      if (!stateCode && placeName.length === 2) stateCode = placeName.toUpperCase();
      if (!stateCode) continue;

      const year = parseInt(row.yr || row.Year || '0');
      const quarter = parseInt(row.period || row.Period || '0');
      const indexNsa = parseFloat(row.index_nsa || row.Index_NSA || '');
      const indexSa = parseFloat(row.index_sa || row.Index_SA || '');

      if (!year || !quarter || isNaN(indexNsa)) continue;

      records.push({
        stateCode,
        year,
        quarter,
        indexValue: indexNsa,
        indexSa: isNaN(indexSa) ? null : indexSa,
      });
    }

    if (records.length === 0) {
      await updatePipelineStatus('fhfa_hpi_data', 0, 'error', 'Could not parse any valid records');
      return { success: false, recordCount: 0, message: 'Could not parse valid records from CSV' };
    }

    // Clear existing data and re-insert
    await db.delete(fhfaHpiData);

    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      await db.insert(fhfaHpiData).values(records.slice(i, i + batchSize));
    }

    await updatePipelineStatus('fhfa_hpi_data', records.length, 'success');
    console.log(`[FHFA Pipeline] Inserted ${records.length} HPI records`);
    return { success: true, recordCount: records.length, message: `Downloaded ${records.length} FHFA HPI records` };
  } catch (error: any) {
    console.error('[FHFA Pipeline] Error:', error.message);
    await updatePipelineStatus('fhfa_hpi_data', 0, 'error', error.message);
    return { success: false, recordCount: 0, message: error.message };
  }
}

export async function queryFHFAAppreciation(stateCode: string): Promise<FHFAAppreciationData | null> {
  try {
    const stateUpper = stateCode.toUpperCase();

    // Get all data for this state, ordered by year and quarter descending
    const stateData = await db
      .select()
      .from(fhfaHpiData)
      .where(eq(fhfaHpiData.stateCode, stateUpper))
      .orderBy(desc(fhfaHpiData.year), desc(fhfaHpiData.quarter));

    if (stateData.length < 4) return null;

    // Get US national data for benchmarks
    const usData = await db
      .select()
      .from(fhfaHpiData)
      .where(eq(fhfaHpiData.stateCode, 'US'))
      .orderBy(desc(fhfaHpiData.year), desc(fhfaHpiData.quarter));

    function calcAppreciation(data: typeof stateData, periodsBack: number): number | null {
      if (data.length <= periodsBack) return null;
      const latest = data[0].indexValue;
      const prior = data[periodsBack].indexValue;
      if (!prior || prior === 0) return null;
      return parseFloat(((latest / prior - 1) * 100).toFixed(1));
    }

    const appreciation1yr = calcAppreciation(stateData, 4);   // 4 quarters = 1 year
    const appreciation5yr = calcAppreciation(stateData, 20);  // 20 quarters = 5 years
    const appreciation10yr = calcAppreciation(stateData, 40); // 40 quarters = 10 years
    const appreciation20yr = calcAppreciation(stateData, 80); // 80 quarters = 20 years

    const us1yr = usData.length > 4 ? calcAppreciation(usData, 4) : null;
    const us5yr = usData.length > 20 ? calcAppreciation(usData, 20) : null;
    const us10yr = usData.length > 40 ? calcAppreciation(usData, 40) : null;

    const latest = stateData[0];
    const stateName = STATE_CODE_TO_NAME[stateUpper] || stateUpper;

    // Build insight
    let insight = '';
    if (appreciation10yr !== null) {
      const vsUs = us10yr !== null ? appreciation10yr - us10yr : null;
      if (vsUs !== null && vsUs > 10) {
        insight = `${stateName} has significantly outperformed the national market over 10 years (+${appreciation10yr.toFixed(0)}% vs US +${us10yr!.toFixed(0)}%), indicating strong long-term appreciation potential.`;
      } else if (vsUs !== null && vsUs < -10) {
        insight = `${stateName} has underperformed the national market over 10 years (+${appreciation10yr.toFixed(0)}% vs US +${us10yr!.toFixed(0)}%), suggesting slower long-term appreciation.`;
      } else {
        insight = `${stateName} has tracked close to national appreciation trends over 10 years (+${appreciation10yr.toFixed(0)}%), reflecting stable, consistent market growth.`;
      }
    } else if (appreciation5yr !== null) {
      insight = `${stateName} 5-year home price appreciation: +${appreciation5yr.toFixed(0)}%${us5yr ? ` (US: +${us5yr.toFixed(0)}%)` : ''}.`;
    } else {
      insight = `Historical FHFA price index data available for ${stateName}.`;
    }

    return {
      stateCode: stateUpper,
      stateName,
      appreciation1yr,
      appreciation5yr,
      appreciation10yr,
      appreciation20yr,
      us1yr,
      us5yr,
      us10yr,
      latestYear: latest.year,
      latestQuarter: latest.quarter,
      insight,
      dataSource: 'FHFA House Price Index (Federal Housing Finance Agency)',
    };
  } catch (error: any) {
    console.error('[FHFA Query] Error:', error.message);
    return null;
  }
}
