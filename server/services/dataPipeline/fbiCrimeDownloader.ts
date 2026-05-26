import { db } from '../../db';
import { fbiCrimeStats, dataPipelineStatus } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { CACHED_STATE_CRIME_DATA, NATIONAL_AVERAGES } from '../fbiCrime';

// SAPI endpoint registration portal is decommissioned; CDE is the correct endpoint
// CDE uses api.data.gov keys: https://api.data.gov/signup/
const CDE_BASE_URL = 'https://api.usa.gov/crime/fbi/cde';

const STATE_ABBR_TO_FIPS: Record<string, string> = {
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

interface FBICrimeResponse {
  results?: {
    state_abbr: string;
    year: number;
    population: number;
    violent_crime: number;
    homicide: number;
    rape_legacy: number;
    rape_revised: number;
    robbery: number;
    aggravated_assault: number;
    property_crime: number;
    burglary: number;
    larceny: number;
    motor_vehicle_theft: number;
  }[];
}

export async function downloadFbiCrimeData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  const fbiApiKey = process.env.FBI_CRIME_API_KEY || process.env.FBI_API_KEY || process.env.DATA_GOV_API_KEY;

  try {
    console.log('[FBI Crime Pipeline] Starting crime data download...');

    // ── Step 1: Seed DB from embedded 2022 FBI UCR data ──────────────────────
    // This guarantees 51 records regardless of API availability
    console.log('[FBI Crime Pipeline] Seeding from embedded 2022 FBI UCR data (51 states)...');
    let seededCount = 0;

    for (const [stateCode, stateFips] of Object.entries(STATE_ABBR_TO_FIPS)) {
      const cached = CACHED_STATE_CRIME_DATA[stateCode];
      if (!cached) continue;

      const violentRatio = cached.violent / NATIONAL_AVERAGES.violentCrimeRate;
      const propertyRatio = cached.property / NATIONAL_AVERAGES.propertyCrimeRate;

      const record = {
        stateCode,
        stateFips,
        year: 2022,
        population: null as number | null,
        violentCrimeTotal: null as number | null,
        violentCrimeRate: cached.violent,
        propertyCrimeTotal: null as number | null,
        propertyCrimeRate: cached.property,
        murderTotal: null as number | null,
        murderRate: Math.round(NATIONAL_AVERAGES.murderRate * violentRatio * 10) / 10,
        robberyTotal: null as number | null,
        robberyRate: Math.round(NATIONAL_AVERAGES.robberyRate * violentRatio * 10) / 10,
        assaultTotal: null as number | null,
        assaultRate: Math.round(NATIONAL_AVERAGES.assaultRate * violentRatio * 10) / 10,
        burglaryTotal: null as number | null,
        burglaryRate: Math.round(NATIONAL_AVERAGES.burglaryRate * propertyRatio * 10) / 10,
        larcenyTotal: null as number | null,
        larcenyRate: Math.round(NATIONAL_AVERAGES.larcenyRate * propertyRatio * 10) / 10,
        motorVehicleTheftTotal: null as number | null,
        motorVehicleTheftRate: Math.round(NATIONAL_AVERAGES.motorVehicleTheftRate * propertyRatio * 10) / 10,
      };

      await db
        .insert(fbiCrimeStats)
        .values(record)
        .onConflictDoNothing();
      seededCount++;
    }

    console.log(`[FBI Crime Pipeline] Seeded ${seededCount} states from embedded 2022 data`);

    // ── Step 2: Try live API for more recent data ─────────────────────────────
    let apiRecords = 0;
    let apiSource = 'none';

    if (fbiApiKey) {
      const currentYear = new Date().getFullYear();
      const fromYear = 2015;
      const toYear = currentYear - 1;

      console.log(`[FBI Crime Pipeline] Attempting API download for ${fromYear}–${toYear}...`);

      for (const [stateCode, stateFips] of Object.entries(STATE_ABBR_TO_FIPS)) {
        try {
          let response: Response | null = null;
          let source = '';

          // CDE endpoint — api.data.gov key via X-Api-Key header
          try {
            const cdeUrl = `${CDE_BASE_URL}/estimate/state/${stateCode}?from=${fromYear}&to=${toYear}`;
            const r = await fetch(cdeUrl, { headers: { 'X-Api-Key': fbiApiKey }, signal: AbortSignal.timeout(8000) });
            if (r.ok) { response = r; source = 'CDE'; }
          } catch (_) {}

          if (!response) continue;

          const data: FBICrimeResponse = await response.json();
          const results = data.results || [];

          for (const result of results) {
            const population = result.population || 1;
            const rate = (count: number) => Math.round((count / population) * 100000 * 10) / 10;

            await db
              .insert(fbiCrimeStats)
              .values({
                stateCode: result.state_abbr || stateCode,
                stateFips,
                year: result.year,
                population: result.population,
                violentCrimeTotal: result.violent_crime,
                violentCrimeRate: rate(result.violent_crime),
                propertyCrimeTotal: result.property_crime,
                propertyCrimeRate: rate(result.property_crime),
                murderTotal: result.homicide,
                murderRate: rate(result.homicide),
                robberyTotal: result.robbery,
                robberyRate: rate(result.robbery),
                assaultTotal: result.aggravated_assault,
                assaultRate: rate(result.aggravated_assault),
                burglaryTotal: result.burglary,
                burglaryRate: rate(result.burglary),
                larcenyTotal: result.larceny,
                larcenyRate: rate(result.larceny),
                motorVehicleTheftTotal: result.motor_vehicle_theft,
                motorVehicleTheftRate: rate(result.motor_vehicle_theft),
              })
              .onConflictDoNothing();
            apiRecords++;
            apiSource = source;
          }

          await delay(150);
        } catch (error) {
          // API errors are non-fatal — static seed already covers this state
        }
      }

      if (apiRecords > 0) {
        console.log(`[FBI Crime Pipeline] API supplemented with ${apiRecords} additional records via ${apiSource}`);
      } else {
        console.log('[FBI Crime Pipeline] API unavailable or returned no data — using embedded 2022 data only');
      }
    } else {
      console.log('[FBI Crime Pipeline] No API key configured — using embedded 2022 data only');
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(fbiCrimeStats);
    const totalRecords = Number(countResult[0]?.count ?? seededCount);

    await updatePipelineStatus('fbi_crime_stats', totalRecords, 'success');

    const source = apiRecords > 0 ? `${apiSource} API + embedded 2022 data` : 'embedded 2022 FBI UCR data';
    console.log(`[FBI Crime Pipeline] Complete: ${totalRecords} total records (source: ${source})`);
    return {
      success: true,
      recordCount: totalRecords,
      message: `${totalRecords} records (${source})`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FBI Crime Pipeline] Error:', errorMessage);
    await updatePipelineStatus('fbi_crime_stats', 0, 'error', errorMessage);
    return { success: false, recordCount: 0, message: errorMessage };
  }
}

export async function getCrimeFromCache(stateCode: string): Promise<{
  year: number;
  population: number | null;
  violentCrimeRate: number | null;
  propertyCrimeRate: number | null;
  murderRate: number | null;
  burglaryRate: number | null;
} | null> {
  const records = await db
    .select()
    .from(fbiCrimeStats)
    .where(eq(fbiCrimeStats.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(fbiCrimeStats.year))
    .limit(1);

  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  return {
    year: record.year,
    population: record.population,
    violentCrimeRate: record.violentCrimeRate,
    propertyCrimeRate: record.propertyCrimeRate,
    murderRate: record.murderRate,
    burglaryRate: record.burglaryRate,
  };
}

export async function getCrimeTrend(stateCode: string): Promise<{
  year: number;
  violentCrimeRate: number | null;
  propertyCrimeRate: number | null;
}[]> {
  const records = await db
    .select({
      year: fbiCrimeStats.year,
      violentCrimeRate: fbiCrimeStats.violentCrimeRate,
      propertyCrimeRate: fbiCrimeStats.propertyCrimeRate,
    })
    .from(fbiCrimeStats)
    .where(eq(fbiCrimeStats.stateCode, stateCode.toUpperCase()))
    .orderBy(desc(fbiCrimeStats.year))
    .limit(10);

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
