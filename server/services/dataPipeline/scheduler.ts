import { downloadFredMortgageRates } from './fredDownloader';
import { downloadHudFairMarketRent } from './hudDownloader';
import { downloadBlsEmploymentData } from './blsDownloader';
import { downloadCensusBuildingPermits } from './censusPermitsDownloader';
import { downloadFbiCrimeData } from './fbiCrimeDownloader';
import { downloadWikipediaCrimeData } from './wikipediaCrimeDownloader';
import { downloadZillowHomeValueForecast, downloadZillowMarketMetrics, downloadZillowRentForecast, downloadAllZillowData } from './zillowDownloader';
import { downloadFhfaHpiData } from './fhfaDownloader';
import { downloadRedfinMarketData } from './redfinDownloader';
import { downloadIrsMigrationData } from './irsMigrationDownloader';
import { downloadOpportunityZoneData } from './opportunityZoneDownloader';
import { db } from '../../db';
import { dataPipelineStatus } from '@shared/schema';

const SCHEDULES = {
  fred_mortgage_rates: 7 * 24 * 60 * 60 * 1000,
  bls_employment_data: 30 * 24 * 60 * 60 * 1000,
  census_building_permits: 30 * 24 * 60 * 60 * 1000,
  hud_fair_market_rent: 365 * 24 * 60 * 60 * 1000,
  fbi_crime_stats: 365 * 24 * 60 * 60 * 1000,
  zillow_home_value_forecast: 30 * 24 * 60 * 60 * 1000,
  zillow_rent_forecast: 30 * 24 * 60 * 60 * 1000,
  zillow_market_metrics: 30 * 24 * 60 * 60 * 1000,
  fhfa_hpi_data: 90 * 24 * 60 * 60 * 1000,     // Quarterly (FHFA publishes quarterly)
  redfin_market_data: 30 * 24 * 60 * 60 * 1000, // Monthly
  irs_migration_data: 365 * 24 * 60 * 60 * 1000, // Annual
  opportunity_zones: 365 * 24 * 60 * 60 * 1000, // Annual (OZ 2.0 expected late 2026)
};

let schedulerInterval: NodeJS.Timeout | null = null;
let schedulerStartedAt: Date | null = null;

export function getSchedulerStatus(): { active: boolean; startedAt: string | null } {
  return {
    active: schedulerInterval !== null,
    startedAt: schedulerStartedAt ? schedulerStartedAt.toISOString() : null,
  };
}

export async function runAllDownloads(): Promise<{
  fred: { success: boolean; recordCount: number; message: string };
  hud: { success: boolean; recordCount: number; message: string };
  bls: { success: boolean; recordCount: number; message: string };
  census: { success: boolean; recordCount: number; message: string };
  fbi: { success: boolean; recordCount: number; message: string };
  zillow: { success: boolean; recordCount: number; message: string };
}> {
  console.log('[Data Pipeline] Starting full data download...');
  
  const results = await Promise.allSettled([
    downloadFredMortgageRates(),
    downloadHudFairMarketRent(),
    downloadBlsEmploymentData(),
    downloadCensusBuildingPermits(),
    downloadWikipediaCrimeData(),
    downloadAllZillowData(),
  ]);

  const extractResult = (result: PromiseSettledResult<any>) => {
    if (result.status === 'fulfilled') {
      if (result.value.homeValueForecast !== undefined) {
        const z = result.value;
        const totalRecords = (z.homeValueForecast?.recordCount || 0) + 
                            (z.rentForecast?.recordCount || 0) + 
                            (z.marketMetrics?.recordCount || 0);
        const allSuccess = z.homeValueForecast?.success && z.rentForecast?.success && z.marketMetrics?.success;
        return { 
          success: allSuccess, 
          recordCount: totalRecords, 
          message: allSuccess ? `Downloaded ${totalRecords} Zillow records` : 'Partial Zillow download'
        };
      }
      return result.value;
    }
    return { success: false, recordCount: 0, message: result.reason?.message || 'Unknown error' };
  };

  const output = {
    fred: extractResult(results[0]),
    hud: extractResult(results[1]),
    bls: extractResult(results[2]),
    census: extractResult(results[3]),
    fbi: extractResult(results[4]),
    zillow: extractResult(results[5]),
  };

  console.log('[Data Pipeline] Full download complete:', output);
  return output;
}

export async function runScheduledDownload(dataSource: string): Promise<{ success: boolean; recordCount: number; message: string }> {
  switch (dataSource) {
    case 'fred_mortgage_rates':
      return downloadFredMortgageRates();
    case 'hud_fair_market_rent':
      return downloadHudFairMarketRent();
    case 'bls_employment_data':
      return downloadBlsEmploymentData();
    case 'census_building_permits':
      return downloadCensusBuildingPermits();
    case 'fbi_crime_stats':
      return downloadWikipediaCrimeData();
    case 'zillow_home_value_forecast': {
      const result = await downloadZillowHomeValueForecast();
      return { success: result.success, recordCount: result.recordCount, message: result.error || 'Success' };
    }
    case 'zillow_rent_forecast': {
      const result = await downloadZillowRentForecast();
      return { success: result.success, recordCount: result.recordCount, message: result.error || 'Success' };
    }
    case 'zillow_market_metrics': {
      const result = await downloadZillowMarketMetrics();
      return { success: result.success, recordCount: result.recordCount, message: result.error || 'Success' };
    }
    case 'fhfa_hpi_data':
      return downloadFhfaHpiData();
    case 'redfin_market_data':
      return downloadRedfinMarketData();
    case 'irs_migration_data':
      return downloadIrsMigrationData();
    case 'opportunity_zones':
      return downloadOpportunityZoneData();
    default:
      return { success: false, recordCount: 0, message: `Unknown data source: ${dataSource}` };
  }
}

export async function getPipelineStatus(): Promise<{
  sources: {
    dataSource: string;
    lastDownloadAt: Date | null;
    lastSuccessAt: Date | null;
    nextScheduledAt: Date | null;
    recordCount: number;
    status: string;
    errorMessage: string | null;
  }[];
  summary: {
    totalRecords: number;
    lastUpdated: Date | null;
    healthyCount: number;
    errorCount: number;
    schedulerActive: boolean;
    schedulerStartedAt: string | null;
  };
}> {
  const statuses = await db.select().from(dataPipelineStatus);
  const schedulerStatus = getSchedulerStatus();

  const summary = {
    totalRecords: statuses.reduce((sum, s) => sum + (s.recordCount || 0), 0),
    lastUpdated: statuses.reduce((latest, s) => {
      const date = s.lastSuccessAt;
      if (!date) return latest;
      if (!latest) return date;
      return date > latest ? date : latest;
    }, null as Date | null),
    healthyCount: statuses.filter(s => s.status === 'success' || s.status === 'partial').length,
    errorCount: statuses.filter(s => s.status === 'error').length,
    schedulerActive: schedulerStatus.active,
    schedulerStartedAt: schedulerStatus.startedAt,
  };

  return {
    sources: statuses.map(s => ({
      dataSource: s.dataSource,
      lastDownloadAt: s.lastDownloadAt,
      lastSuccessAt: s.lastSuccessAt,
      nextScheduledAt: s.nextScheduledAt,
      recordCount: s.recordCount || 0,
      status: s.status || 'pending',
      errorMessage: s.errorMessage,
    })),
    summary,
  };
}

async function checkAndRunScheduledUpdates(): Promise<void> {
  const statuses = await db.select().from(dataPipelineStatus);
  const now = new Date();
  let anyRan = false;

  for (const [dataSource, interval] of Object.entries(SCHEDULES)) {
    const status = statuses.find(s => s.dataSource === dataSource);

    if (!status || !status.lastSuccessAt) {
      console.log(`[Data Pipeline Scheduler] ${dataSource} needs initial download`);
      await runScheduledDownload(dataSource);
      anyRan = true;
      continue;
    }

    const timeSinceLastSuccess = now.getTime() - status.lastSuccessAt.getTime();

    if (timeSinceLastSuccess >= interval) {
      console.log(`[Data Pipeline Scheduler] ${dataSource} is overdue, running update`);
      await runScheduledDownload(dataSource);
      anyRan = true;
    }
  }

  if (!anyRan) {
    console.log('[Data Pipeline Scheduler] All sources are up to date');
  }
}

export function startScheduler(checkIntervalMs: number = 60 * 60 * 1000): void {
  if (schedulerInterval) {
    console.log('[Data Pipeline Scheduler] Already running');
    return;
  }

  console.log('[Data Pipeline Scheduler] Starting scheduler...');
  schedulerStartedAt = new Date();

  setTimeout(() => {
    checkAndRunScheduledUpdates().catch(err => {
      console.error('[Data Pipeline Scheduler] Initial check error:', err);
    });
  }, 5000);

  schedulerInterval = setInterval(() => {
    checkAndRunScheduledUpdates().catch(err => {
      console.error('[Data Pipeline Scheduler] Scheduled check error:', err);
    });
  }, checkIntervalMs);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Data Pipeline Scheduler] Stopped');
  }
}

export async function initializeDataPipeline(): Promise<void> {
  console.log('[Data Pipeline] Checking if initial data load is needed...');
  
  const statuses = await db.select().from(dataPipelineStatus);
  
  if (statuses.length === 0 || statuses.every(s => !s.lastSuccessAt)) {
    console.log('[Data Pipeline] No cached data found, starting initial download...');
    await runAllDownloads();
  } else {
    console.log('[Data Pipeline] Cached data exists, skipping initial download');
  }
}
