import { db } from '../../db';
import { irsMigrationData, dataPipelineStatus } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import type { IRSNetMigrationData } from '@shared/schema';

// IRS county-to-county migration data (tax year 2021, published 2023)
// Format: state_code_dest, county_code_dest, state_code_orig, county_code_orig, n1 (returns), n2 (exemptions), agi
const IRS_INFLOW_URL = 'https://www.irs.gov/pub/irs-soi/countyinflow2021.csv';
const IRS_OUTFLOW_URL = 'https://www.irs.gov/pub/irs-soi/countyoutflow2021.csv';
const TAX_YEAR = 2021;

const STATE_CODE_TO_ABBR: Record<string, string> = {
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

async function fetchCSV(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ScoreCasa/1.0 (Real Estate Analysis Platform)' },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      console.error(`[IRS Migration] HTTP ${response.status} for ${url}`);
      return null;
    }
    return response.text();
  } catch (error: any) {
    console.error(`[IRS Migration] Failed to fetch ${url}: ${error.message}`);
    return null;
  }
}

export async function downloadIrsMigrationData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  try {
    console.log('[IRS Migration Pipeline] Starting county migration data download...');

    const [inflowCsv, outflowCsv] = await Promise.all([
      fetchCSV(IRS_INFLOW_URL),
      fetchCSV(IRS_OUTFLOW_URL),
    ]);

    if (!inflowCsv && !outflowCsv) {
      await updatePipelineStatus('irs_migration_data', 0, 'error', 'Both IRS migration files unavailable');
      return { success: false, recordCount: 0, message: 'IRS migration files unavailable' };
    }

    // County inflow aggregation: { fips: { inflow, agi } }
    const inflowMap = new Map<string, { count: number; agi: number; name: string; state: string }>();
    const outflowMap = new Map<string, { count: number; agi: number; name: string; state: string }>();

    function parseRows(csvText: string, map: typeof inflowMap, targetIsDestination: boolean) {
      const rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
      });

      for (const row of rows) {
        // IRS format (inflow file): y2_state, y2_county (destination), y1_state, y1_county (origin)
        // For inflow: destination = the county receiving migrants
        // For outflow: origin = the county losing migrants
        const destStateFips = String(row.y2_statefips || row.y2_state || '').trim().padStart(2, '0');
        const destCountyFips = String(row.y2_countyfips || row.y2_county || '').trim().padStart(3, '0');
        const n1 = parseInt(row.n1 || '0') || 0; // number of returns (households)
        const agi = parseFloat(row.agi || '0') || 0;
        const countyName = row.y2_countyname || row.countyname || '';

        if (!destStateFips || destStateFips === '00' || destCountyFips === '000') continue;
        if (destStateFips === '96' || destStateFips === '97' || destStateFips === '98' || destStateFips === '57') continue;

        const fips = `${destStateFips}${destCountyFips}`;
        const stateAbbr = STATE_CODE_TO_ABBR[destStateFips] || destStateFips;

        const existing = map.get(fips) || { count: 0, agi: 0, name: countyName, state: stateAbbr };
        existing.count += n1;
        existing.agi += agi;
        if (!existing.name && countyName) existing.name = countyName;
        map.set(fips, existing);
      }
    }

    if (inflowCsv) parseRows(inflowCsv, inflowMap, true);
    if (outflowCsv) parseRows(outflowCsv, outflowMap, false);

    const allFips = new Set([...inflowMap.keys(), ...outflowMap.keys()]);
    const records: Array<{
      countyFips: string;
      stateFips: string;
      stateCode: string | null;
      countyName: string | null;
      taxYear: number;
      grossInflow: number;
      grossOutflow: number;
      netMigration: number;
      inflowAgi: number | null;
      outflowAgi: number | null;
    }> = [];

    for (const fips of allFips) {
      const inflow = inflowMap.get(fips);
      const outflow = outflowMap.get(fips);
      const stateFips = fips.substring(0, 2);
      const stateCode = STATE_CODE_TO_ABBR[stateFips] || null;
      const countyName = inflow?.name || outflow?.name || null;

      records.push({
        countyFips: fips,
        stateFips,
        stateCode,
        countyName,
        taxYear: TAX_YEAR,
        grossInflow: inflow?.count || 0,
        grossOutflow: outflow?.count || 0,
        netMigration: (inflow?.count || 0) - (outflow?.count || 0),
        inflowAgi: inflow?.agi || null,
        outflowAgi: outflow?.agi || null,
      });
    }

    if (records.length === 0) {
      await updatePipelineStatus('irs_migration_data', 0, 'error', 'No valid records parsed');
      return { success: false, recordCount: 0, message: 'No valid records parsed from IRS CSVs' };
    }

    // Replace existing data
    await db.delete(irsMigrationData);

    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      await db.insert(irsMigrationData).values(records.slice(i, i + batchSize));
    }

    await updatePipelineStatus('irs_migration_data', records.length, 'success');
    console.log(`[IRS Migration Pipeline] Inserted ${records.length} county migration records`);
    return { success: true, recordCount: records.length, message: `Downloaded ${records.length} IRS migration records` };
  } catch (error: any) {
    console.error('[IRS Migration Pipeline] Error:', error.message);
    await updatePipelineStatus('irs_migration_data', 0, 'error', error.message);
    return { success: false, recordCount: 0, message: error.message };
  }
}

export async function queryIRSMigration(countyFips: string): Promise<IRSNetMigrationData | null> {
  try {
    if (!countyFips || countyFips.length < 4) return null;

    const rows = await db
      .select()
      .from(irsMigrationData)
      .where(eq(irsMigrationData.countyFips, countyFips))
      .orderBy(desc(irsMigrationData.taxYear))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    const net = row.netMigration ?? 0;
    const inflow = row.grossInflow ?? 0;
    const outflow = row.grossOutflow ?? 0;

    let signal: IRSNetMigrationData['migrationSignal'] = 'neutral';
    let migrationLabel = 'Neutral Migration';

    if (net > 2000) { signal = 'strong_inbound'; migrationLabel = 'Strong Inbound Migration'; }
    else if (net > 500) { signal = 'moderate_inbound'; migrationLabel = 'Moderate Inbound Migration'; }
    else if (net < -2000) { signal = 'strong_outbound'; migrationLabel = 'Strong Outbound Migration'; }
    else if (net < -500) { signal = 'moderate_outbound'; migrationLabel = 'Moderate Outbound Migration'; }

    let insight = '';
    const netAbs = Math.abs(net);
    if (signal === 'strong_inbound') {
      insight = `This county is experiencing strong population inflow — net +${netAbs.toLocaleString()} households/year moved in (${inflow.toLocaleString()} in vs ${outflow.toLocaleString()} out). Strong inbound migration is a leading indicator of rising housing demand.`;
    } else if (signal === 'moderate_inbound') {
      insight = `This county has moderate positive net migration — net +${netAbs.toLocaleString()} households/year. This suggests growing housing demand over time.`;
    } else if (signal === 'strong_outbound') {
      insight = `This county is losing residents — net -${netAbs.toLocaleString()} households/year moved out. Population outflow can soften long-term housing demand.`;
    } else if (signal === 'moderate_outbound') {
      insight = `This county has modest negative net migration (-${netAbs.toLocaleString()} households/year). Some population loss but not dramatic.`;
    } else {
      insight = `This county has roughly balanced migration — ${inflow.toLocaleString()} households moved in and ${outflow.toLocaleString()} moved out, suggesting a stable population base.`;
    }

    return {
      countyFips,
      countyName: row.countyName || `County ${countyFips}`,
      stateCode: row.stateCode || '',
      taxYear: row.taxYear,
      netMigration: net,
      grossInflow: inflow,
      grossOutflow: outflow,
      migrationSignal: signal,
      migrationLabel,
      insight,
      dataSource: `IRS Statistics of Income — Migration Data (Tax Year ${row.taxYear})`,
    };
  } catch (error: any) {
    console.error('[IRS Migration Query] Error:', error.message);
    return null;
  }
}
