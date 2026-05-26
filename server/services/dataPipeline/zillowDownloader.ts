import { db } from '../../db';
import { zillowHomeValueForecast, zillowRentForecast, zillowMarketMetrics, dataPipelineStatus } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';

const ZILLOW_CSV_URLS = {
  homeValueForecast: 'https://files.zillowstatic.com/research/public_csvs/zhvf_growth/Zip_zhvf_growth_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
  homeValueForecastMetro: 'https://files.zillowstatic.com/research/public_csvs/zhvf_growth/Metro_zhvf_growth_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
  rentForecastSFR: 'https://files.zillowstatic.com/research/public_csvs/zorf_growth/National_zorf_growth_uc_sfr_sm_month.csv',
  daysToPending: 'https://files.zillowstatic.com/research/public_csvs/mean_doz_pending/Metro_mean_doz_pending_uc_sfrcondo_sm_month.csv',
  saleToListRatio: 'https://files.zillowstatic.com/research/public_csvs/mean_sale_to_list/Metro_mean_sale_to_list_uc_sfrcondo_sm_month.csv',
  inventory: 'https://files.zillowstatic.com/research/public_csvs/invt_fs/Metro_invt_fs_uc_sfrcondo_sm_month.csv',
  medianListPrice: 'https://files.zillowstatic.com/research/public_csvs/mlp/Metro_mlp_uc_sfrcondo_sm_month.csv',
  percentSoldAbove: 'https://files.zillowstatic.com/research/public_csvs/pct_sold_above_list/Metro_pct_sold_above_list_uc_sfrcondo_sm_month.csv',
  percentSoldBelow: 'https://files.zillowstatic.com/research/public_csvs/pct_sold_below_list/Metro_pct_sold_below_list_uc_sfrcondo_sm_month.csv',
};

async function fetchCSV(url: string): Promise<string> {
  console.log(`[Zillow] Fetching CSV from: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ScoreCasa/1.0 (Real Estate Analysis Platform)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseCSV(csvData: string): any[] {
  try {
    return parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } catch (error) {
    console.error('[Zillow] Error parsing CSV:', error);
    return [];
  }
}

function extractStateFromRegion(regionName: string): string | null {
  if (!regionName) return null;
  const parts = regionName.split(',');
  if (parts.length >= 2) {
    const stateAbbr = parts[parts.length - 1].trim().substring(0, 2).toUpperCase();
    if (/^[A-Z]{2}$/.test(stateAbbr)) {
      return stateAbbr;
    }
  }
  return null;
}

function getMostRecentDateColumn(record: any): { date: string; value: number } | null {
  const dateColumns = Object.keys(record).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
  if (dateColumns.length === 0) return null;
  
  dateColumns.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const mostRecentDate = dateColumns[0];
  const value = parseFloat(record[mostRecentDate]);
  
  if (isNaN(value)) return null;
  return { date: mostRecentDate, value };
}

export async function downloadZillowHomeValueForecast(): Promise<{ success: boolean; recordCount: number; error?: string }> {
  try {
    console.log('[Zillow] Starting home value forecast download...');
    
    const [zipCsv, metroCsv] = await Promise.all([
      fetchCSV(ZILLOW_CSV_URLS.homeValueForecast),
      fetchCSV(ZILLOW_CSV_URLS.homeValueForecastMetro),
    ]);

    const zipRecords = parseCSV(zipCsv);
    const metroRecords = parseCSV(metroCsv);

    console.log(`[Zillow] Parsed ${zipRecords.length} ZIP forecasts, ${metroRecords.length} Metro forecasts`);

    await db.delete(zillowHomeValueForecast).where(sql`1=1`);

    let insertedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < zipRecords.length; i += batchSize) {
      const batch = zipRecords.slice(i, i + batchSize);
      const insertData = batch
        .map((record: any) => {
          const regionId = record.RegionID || record.RegionName;
          const regionName = record.RegionName || '';
          const stateCode = extractStateFromRegion(regionName) || record.StateName?.substring(0, 2);
          
          const forecastMonth = parseFloat(record['1 Month'] || record['MoM%'] || '0');
          const forecastQuarter = parseFloat(record['3 Month'] || record['QoQ%'] || '0');
          const forecastYear = parseFloat(record['1 Year'] || record['YoY%'] || '0');
          
          if (isNaN(forecastYear)) return null;

          return {
            regionId: String(regionId),
            regionName,
            regionType: 'zip' as const,
            stateCode: stateCode || null,
            baseDate: new Date().toISOString().split('T')[0],
            currentValue: parseFloat(record.BaseValue) || null,
            forecastMonthChange: forecastMonth || null,
            forecastQuarterChange: forecastQuarter || null,
            forecastYearChange: forecastYear || null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (insertData.length > 0) {
        await db.insert(zillowHomeValueForecast).values(insertData);
        insertedCount += insertData.length;
      }
    }

    for (let i = 0; i < metroRecords.length; i += batchSize) {
      const batch = metroRecords.slice(i, i + batchSize);
      const insertData = batch
        .map((record: any) => {
          const regionId = record.RegionID || record.RegionName;
          const regionName = record.RegionName || '';
          const stateCode = extractStateFromRegion(regionName);
          
          const forecastMonth = parseFloat(record['1 Month'] || record['MoM%'] || '0');
          const forecastQuarter = parseFloat(record['3 Month'] || record['QoQ%'] || '0');
          const forecastYear = parseFloat(record['1 Year'] || record['YoY%'] || '0');
          
          if (isNaN(forecastYear)) return null;

          return {
            regionId: String(regionId),
            regionName,
            regionType: 'metro' as const,
            stateCode: stateCode || null,
            baseDate: new Date().toISOString().split('T')[0],
            currentValue: parseFloat(record.BaseValue) || null,
            forecastMonthChange: forecastMonth || null,
            forecastQuarterChange: forecastQuarter || null,
            forecastYearChange: forecastYear || null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (insertData.length > 0) {
        await db.insert(zillowHomeValueForecast).values(insertData);
        insertedCount += insertData.length;
      }
    }

    await updatePipelineStatus('zillow_home_value_forecast', insertedCount, 'success');
    console.log(`[Zillow] Successfully inserted ${insertedCount} home value forecast records`);

    return { success: true, recordCount: insertedCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Zillow] Home value forecast download failed:', errorMsg);
    await updatePipelineStatus('zillow_home_value_forecast', 0, 'error', errorMsg);
    return { success: false, recordCount: 0, error: errorMsg };
  }
}

export async function downloadZillowMarketMetrics(): Promise<{ success: boolean; recordCount: number; error?: string }> {
  try {
    console.log('[Zillow] Starting market metrics download...');
    
    const [daysToPendingCsv, saleToListCsv, inventoryCsv, listPriceCsv, soldAboveCsv, soldBelowCsv] = await Promise.all([
      fetchCSV(ZILLOW_CSV_URLS.daysToPending),
      fetchCSV(ZILLOW_CSV_URLS.saleToListRatio),
      fetchCSV(ZILLOW_CSV_URLS.inventory),
      fetchCSV(ZILLOW_CSV_URLS.medianListPrice),
      fetchCSV(ZILLOW_CSV_URLS.percentSoldAbove),
      fetchCSV(ZILLOW_CSV_URLS.percentSoldBelow),
    ]);

    const daysToPendingRecords = parseCSV(daysToPendingCsv);
    const saleToListRecords = parseCSV(saleToListCsv);
    const inventoryRecords = parseCSV(inventoryCsv);
    const listPriceRecords = parseCSV(listPriceCsv);
    const soldAboveRecords = parseCSV(soldAboveCsv);
    const soldBelowRecords = parseCSV(soldBelowCsv);

    console.log(`[Zillow] Parsed market metrics: ${daysToPendingRecords.length} regions`);

    await db.delete(zillowMarketMetrics).where(sql`1=1`);

    const metricsMap = new Map<string, any>();

    const processRecords = (records: any[], metricName: string) => {
      for (const record of records) {
        const regionId = record.RegionID || record.RegionName;
        if (!regionId) continue;

        const recent = getMostRecentDateColumn(record);
        if (!recent) continue;

        if (!metricsMap.has(regionId)) {
          metricsMap.set(regionId, {
            regionId: String(regionId),
            regionName: record.RegionName || '',
            regionType: 'metro',
            stateCode: extractStateFromRegion(record.RegionName || ''),
            metricDate: recent.date,
          });
        }

        const existing = metricsMap.get(regionId);
        existing[metricName] = recent.value;
      }
    };

    processRecords(daysToPendingRecords, 'daysToPending');
    processRecords(saleToListRecords, 'saleToListRatio');
    processRecords(inventoryRecords, 'inventoryForSale');
    processRecords(listPriceRecords, 'medianListPrice');
    processRecords(soldAboveRecords, 'percentSoldAboveList');
    processRecords(soldBelowRecords, 'percentSoldBelowList');

    const allMetrics = Array.from(metricsMap.values());
    let insertedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < allMetrics.length; i += batchSize) {
      const batch = allMetrics.slice(i, i + batchSize);
      const insertData = batch.map(m => ({
        regionId: m.regionId,
        regionName: m.regionName,
        regionType: m.regionType,
        stateCode: m.stateCode || null,
        metricDate: m.metricDate,
        daysToPending: m.daysToPending ?? null,
        saleToListRatio: m.saleToListRatio ?? null,
        inventoryForSale: m.inventoryForSale ? Math.round(m.inventoryForSale) : null,
        newListings: null,
        medianListPrice: m.medianListPrice ?? null,
        percentSoldAboveList: m.percentSoldAboveList ?? null,
        percentSoldBelowList: m.percentSoldBelowList ?? null,
      }));

      await db.insert(zillowMarketMetrics).values(insertData);
      insertedCount += insertData.length;
    }

    await updatePipelineStatus('zillow_market_metrics', insertedCount, 'success');
    console.log(`[Zillow] Successfully inserted ${insertedCount} market metrics records`);

    return { success: true, recordCount: insertedCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Zillow] Market metrics download failed:', errorMsg);
    await updatePipelineStatus('zillow_market_metrics', 0, 'error', errorMsg);
    return { success: false, recordCount: 0, error: errorMsg };
  }
}

export async function downloadZillowRentForecast(): Promise<{ success: boolean; recordCount: number; error?: string }> {
  try {
    console.log('[Zillow] Starting rent forecast download...');
    
    const csv = await fetchCSV(ZILLOW_CSV_URLS.rentForecastSFR);
    const records = parseCSV(csv);

    console.log(`[Zillow] Parsed ${records.length} rent forecast records`);

    await db.delete(zillowRentForecast).where(sql`1=1`);

    const insertData = records
      .map((record: any) => {
        const forecastMonth = parseFloat(record['1 Month'] || record['MoM%'] || '0');
        const forecastQuarter = parseFloat(record['3 Month'] || record['QoQ%'] || '0');
        const forecastYear = parseFloat(record['1 Year'] || record['YoY%'] || '0');
        
        if (isNaN(forecastYear)) return null;

        return {
          regionId: 'US',
          regionName: 'United States',
          regionType: 'country' as const,
          stateCode: null,
          baseDate: new Date().toISOString().split('T')[0],
          currentRent: parseFloat(record.BaseValue) || null,
          forecastMonthChange: forecastMonth || null,
          forecastQuarterChange: forecastQuarter || null,
          forecastYearChange: forecastYear || null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (insertData.length > 0) {
      await db.insert(zillowRentForecast).values(insertData);
    }

    await updatePipelineStatus('zillow_rent_forecast', insertData.length, 'success');
    console.log(`[Zillow] Successfully inserted ${insertData.length} rent forecast records`);

    return { success: true, recordCount: insertData.length };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Zillow] Rent forecast download failed:', errorMsg);
    await updatePipelineStatus('zillow_rent_forecast', 0, 'error', errorMsg);
    return { success: false, recordCount: 0, error: errorMsg };
  }
}

export async function downloadAllZillowData(): Promise<{
  homeValueForecast: { success: boolean; recordCount: number; error?: string };
  rentForecast: { success: boolean; recordCount: number; error?: string };
  marketMetrics: { success: boolean; recordCount: number; error?: string };
}> {
  console.log('[Zillow] Starting full data download...');

  const [homeValueForecast, rentForecast, marketMetrics] = await Promise.all([
    downloadZillowHomeValueForecast(),
    downloadZillowRentForecast(),
    downloadZillowMarketMetrics(),
  ]);

  return { homeValueForecast, rentForecast, marketMetrics };
}

async function updatePipelineStatus(
  dataSource: string,
  recordCount: number,
  status: 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(dataPipelineStatus)
      .where(eq(dataPipelineStatus.dataSource, dataSource))
      .limit(1);

    const now = new Date();
    const nextScheduled = new Date(now);
    nextScheduled.setMonth(nextScheduled.getMonth() + 1);
    nextScheduled.setDate(16);

    if (existing.length > 0) {
      await db
        .update(dataPipelineStatus)
        .set({
          lastDownloadAt: now,
          lastSuccessAt: status === 'success' ? now : existing[0].lastSuccessAt,
          recordCount: status === 'success' ? recordCount : existing[0].recordCount,
          status,
          errorMessage: errorMessage || null,
          nextScheduledAt: nextScheduled,
          updatedAt: now,
        })
        .where(eq(dataPipelineStatus.dataSource, dataSource));
    } else {
      await db.insert(dataPipelineStatus).values({
        dataSource,
        lastDownloadAt: now,
        lastSuccessAt: status === 'success' ? now : null,
        recordCount: status === 'success' ? recordCount : 0,
        status,
        errorMessage: errorMessage || null,
        nextScheduledAt: nextScheduled,
      });
    }
  } catch (error) {
    console.error(`[Zillow] Failed to update pipeline status for ${dataSource}:`, error);
  }
}
