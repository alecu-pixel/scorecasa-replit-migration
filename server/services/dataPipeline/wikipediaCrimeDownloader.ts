/**
 * Wikipedia Crime Data Downloader
 *
 * Uses Wikipedia's free API (no key required) to fetch FBI UCR crime data by state.
 * Wikipedia publishes the FBI's annual Uniform Crime Report figures in two tables:
 *   Table 1 — Current year snapshot: violent, homicide, rape, robbery, aggravated assault per 100k
 *   Table 2 — Multi-year trend (2018–present): violent crime rate per 100k by state
 *
 * Property crime rates are estimated from the 2022 baseline using published
 * national year-over-year change rates from FBI press releases.
 *
 * Data source: https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_violent_crime_rate
 */

import { db } from '../../db';
import { fbiCrimeStats, dataPipelineStatus } from '@shared/schema';
import { sql, and, eq } from 'drizzle-orm';
import { CACHED_STATE_CRIME_DATA, NATIONAL_AVERAGES } from '../fbiCrime';

// National property crime change rates (year-over-year, from FBI press releases)
const NATIONAL_PROPERTY_CHANGE: Record<number, number> = {
  2019: -0.042,  // -4.2% from 2018
  2020: -0.080,  // -8.0% from 2019
  2021:  0.012,  // +1.2% from 2020
  2022:  0.006,  // +0.6% from 2021
  2023: -0.024,  // -2.4% from 2022
  2024: -0.081,  // -8.1% from 2023
};

const STATE_NAME_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL',
  'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
  'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
  'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
  'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

const STATE_ABBR_TO_FIPS: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
  'DE': '10', 'DC': '11', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17',
  'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31',
  'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
  'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46',
  'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
  'WI': '55', 'WY': '56',
};

async function fetchWikiContent(title: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=content&format=json&rvslots=main`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Wikipedia API returned ${response.status}`);
  const data = await response.json() as any;
  const pages = data.query?.pages;
  if (!pages) throw new Error('No pages in Wikipedia response');
  const page = pages[Object.keys(pages)[0]];
  if (page.missing) throw new Error(`Wikipedia page not found: ${title}`);
  return page.revisions?.[0]?.slots?.main?.['*'] || '';
}

/**
 * Parse Table 1 (snapshot): state name → [violent, homicide, rape, robbery, assault]
 */
function parseSnapshotTable(content: string): Map<string, number[]> {
  const result = new Map<string, number[]>();
  // Split at first table end to get only Table 1
  const firstTableEnd = content.indexOf('|}');
  const table1 = content.slice(0, firstTableEnd);
  const lines = table1.split('\n');

  for (const line of lines) {
    if (!line.includes('{{flagg|uspeft')) continue;
    const cells = line.split(' || ');
    const stateName = extractStateName(cells[0]);
    if (!stateName || !STATE_NAME_TO_ABBR[stateName]) continue;

    const nums = cells.slice(1).map(c => parseFloat(c.trim().replace(/,/g, '')));
    if (nums[0] > 0) result.set(stateName, nums);
  }
  return result;
}

/**
 * Parse Table 2 (trend): state name → [2018, 2019, 2020, 2021, 2022, 2023, 2024]
 * Headers: Location !! 2018 !! 2019 !! 2020 !! 2021 !! 2022 !! 2023 !! 2024
 */
function parseTrendTable(content: string): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  const firstTableEnd = content.indexOf('|}');
  const afterFirstTable = content.slice(firstTableEnd + 2);

  // Find the header row to get years
  const headerLine = afterFirstTable.match(/! Location !!([^|\n]+)/)?.[0] || '';
  const yearMatches = [...headerLine.matchAll(/(\d{4})/g)];
  const years = yearMatches.map(m => parseInt(m[1]));

  const lines = afterFirstTable.split('\n');
  for (const line of lines) {
    if (!line.includes('{{flagg|uspeft')) continue;
    const cells = line.split(' || ');
    const stateName = extractStateName(cells[0]);
    if (!stateName || !STATE_NAME_TO_ABBR[stateName]) continue;

    const nums = cells.slice(1).map(c => parseFloat(c.trim().replace(/,/g, '')));
    const yearMap = new Map<number, number>();
    years.forEach((year, i) => {
      if (nums[i] > 0) yearMap.set(year, nums[i]);
    });
    if (yearMap.size > 0) result.set(stateName, yearMap);
  }
  return result;
}

function extractStateName(cell: string): string {
  // Handle: {{flagg|uspeft|pref=Crime in|District of Columbia|name=District of Columbia}}
  let m = cell.match(/\|name=([^|}]+)/);
  if (m) return m[1].trim();

  // Handle: {{flagg|uspeft|pref=Crime in|Alaska}}
  m = cell.match(/pref=Crime in\|([^|}]+)\}\}/);
  if (m) return m[1].trim();

  // Handle: {{flagg|uspeft|pref=Crime in|New Mexico|...}} (additional params after name)
  m = cell.match(/pref=Crime in\|([^|}]+)\|/);
  if (m) return m[1].trim();

  return '';
}

/**
 * Estimate property crime rate using 2022 baseline + national YoY adjustments
 */
function estimatePropertyCrime(stateAbbr: string, targetYear: number): number {
  const baseline2022 = CACHED_STATE_CRIME_DATA[stateAbbr]?.property;
  if (!baseline2022) return NATIONAL_AVERAGES.propertyCrimeRate;

  let rate = baseline2022;
  for (let year = 2023; year <= targetYear; year++) {
    const change = NATIONAL_PROPERTY_CHANGE[year] ?? 0;
    rate = rate * (1 + change);
  }
  return Math.round(rate * 10) / 10;
}

export async function downloadWikipediaCrimeData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  try {
    console.log('[Wikipedia Crime] Starting download from Wikipedia FBI UCR data...');

    const content = await fetchWikiContent('List of U.S. states and territories by violent crime rate');

    const snapshotData = parseSnapshotTable(content);
    const trendData = parseTrendTable(content);

    console.log(`[Wikipedia Crime] Parsed ${snapshotData.size} states from snapshot table`);
    console.log(`[Wikipedia Crime] Parsed ${trendData.size} states from trend table`);

    let insertedCount = 0;

    // Insert multi-year trend data (2018-2024) for all states
    for (const [stateName, yearMap] of trendData) {
      const stateAbbr = STATE_NAME_TO_ABBR[stateName];
      const stateFips = STATE_ABBR_TO_FIPS[stateAbbr];
      if (!stateAbbr || !stateFips) continue;

      // Get breakdown values from snapshot table (current year)
      const snapshot = snapshotData.get(stateName) || [];
      const snapshotViolent = snapshot[0] || 0;
      const snapshotHomicide = snapshot[1] || 0;
      const snapshotRape = snapshot[2] || 0;
      const snapshotRobbery = snapshot[3] || 0;
      const snapshotAssault = snapshot[4] || 0;

      for (const [year, violentRate] of yearMap) {
        // For snapshot year, use breakdown values; for historical years, scale proportionally
        const isSnapshotYear = year === Math.max(...yearMap.keys());
        const violentRatio = snapshotViolent > 0 ? violentRate / snapshotViolent : 1;

        const murderRate = isSnapshotYear ? snapshotHomicide : Math.round(snapshotHomicide * violentRatio * 10) / 10;
        const rapeRate = isSnapshotYear ? snapshotRape : Math.round(snapshotRape * violentRatio * 10) / 10;
        const robberyRate = isSnapshotYear ? snapshotRobbery : Math.round(snapshotRobbery * violentRatio * 10) / 10;
        const assaultRate = isSnapshotYear ? snapshotAssault : Math.round(snapshotAssault * violentRatio * 10) / 10;
        const propertyRate = estimatePropertyCrime(stateAbbr, year);

        // Delete any existing record for this state+year to avoid duplicates
        await db
          .delete(fbiCrimeStats)
          .where(and(eq(fbiCrimeStats.stateCode, stateAbbr), eq(fbiCrimeStats.year, year)));

        await db
          .insert(fbiCrimeStats)
          .values({
            stateCode: stateAbbr,
            stateFips,
            year,
            population: null,
            violentCrimeTotal: null,
            violentCrimeRate: violentRate,
            propertyCrimeTotal: null,
            propertyCrimeRate: propertyRate,
            murderTotal: null,
            murderRate,
            robberyTotal: null,
            robberyRate,
            assaultTotal: null,
            assaultRate,
            burglaryTotal: null,
            burglaryRate: Math.round(NATIONAL_AVERAGES.burglaryRate * (propertyRate / NATIONAL_AVERAGES.propertyCrimeRate) * 10) / 10,
            larcenyTotal: null,
            larcenyRate: Math.round(NATIONAL_AVERAGES.larcenyRate * (propertyRate / NATIONAL_AVERAGES.propertyCrimeRate) * 10) / 10,
            motorVehicleTheftTotal: null,
            motorVehicleTheftRate: Math.round(NATIONAL_AVERAGES.motorVehicleTheftRate * (propertyRate / NATIONAL_AVERAGES.propertyCrimeRate) * 10) / 10,
          });

        insertedCount++;
      }
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(fbiCrimeStats);
    const totalRecords = Number(countResult[0]?.count ?? insertedCount);

    await updatePipelineStatus('fbi_crime_stats', totalRecords, 'success');

    const msg = `${totalRecords} total records (Wikipedia: ${insertedCount} inserted across 2018–2024 for ${trendData.size} states)`;
    console.log(`[Wikipedia Crime] Complete: ${msg}`);
    return { success: true, recordCount: totalRecords, message: msg };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Wikipedia Crime] Error:', errorMessage);
    await updatePipelineStatus('fbi_crime_stats', 0, 'error', errorMessage);
    return { success: false, recordCount: 0, message: errorMessage };
  }
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
