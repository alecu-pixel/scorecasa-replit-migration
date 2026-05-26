/**
 * Opportunity Zone Downloader
 *
 * Downloads the IRS/Treasury list of Qualified Opportunity Zone (QOZ) census tracts
 * from the HUD Open Data portal (hosted on ArcGIS Hub via data.gov).
 *
 * Data: ~8,764 designated census tracts (2018 OZ 1.0 designations)
 * Source: HUD Opportunity Zones — data.gov / ArcGIS Hub CSV download
 * Refresh: Decennial (next update expected OZ 2.0 in late 2026)
 * Cost: Free, no API key required
 */

import { db } from '../../db';
import { opportunityZones, dataPipelineStatus } from '@shared/schema';
import { sql } from 'drizzle-orm';

const OZ_CSV_URL =
  'https://opendata.arcgis.com/api/v3/datasets/ef143299845841f8abb95969c01f88b5_13/downloads/data?format=csv&spatialRefId=4326&where=1%3D1';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.replace(/\r/g, '').trim());
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/\r/g, '').trim());
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      record[key] = values[idx] ?? '';
    });
    records.push(record);
  }
  return records;
}

export async function downloadOpportunityZoneData(): Promise<{
  success: boolean;
  recordCount: number;
  message: string;
}> {
  console.log('[OZ] Starting Opportunity Zone data download from HUD Open Data (CSV)...');

  try {
    const response = await fetch(OZ_CSV_URL, {
      headers: {
        'User-Agent': 'ScoreCasa/1.0 (contact@scorecasa.com)',
        'Accept': 'text/csv,*/*',
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`OZ CSV download returned HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (contentType.includes('html') || text.trim().startsWith('<!')) {
      throw new Error('OZ CSV endpoint returned HTML page instead of CSV data');
    }

    const rows = parseCsv(text);
    console.log(`[OZ] Parsed ${rows.length} rows from CSV (columns: ${Object.keys(rows[0] || {}).join(', ')})`);

    if (rows.length === 0) {
      throw new Error('OZ CSV returned 0 rows — possible service issue');
    }

    const records = rows
      .map(row => ({
        censusTract: (row['GEOID10'] || row['geoid10'] || '').replace(/\s/g, ''),
        stateCode: (row['STUSAB'] || row['stusab'] || row['STATE_AB'] || '').trim() || null,
      }))
      .filter(r => r.censusTract.length === 11);

    if (records.length === 0) {
      throw new Error(`OZ CSV had ${rows.length} rows but none with 11-digit GEOID10 field`);
    }

    console.log(`[OZ] Inserting ${records.length} valid QOZ census tracts...`);

    const BATCH_SIZE = 500;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await db
        .insert(opportunityZones)
        .values(batch)
        .onConflictDoUpdate({
          target: opportunityZones.censusTract,
          set: { stateCode: sql`excluded.state_code` },
        });
    }

    await db
      .insert(dataPipelineStatus)
      .values({
        dataSource: 'opportunity_zones',
        lastDownloadAt: new Date(),
        lastSuccessAt: new Date(),
        recordCount: records.length,
        status: 'success',
        errorMessage: null,
      })
      .onConflictDoUpdate({
        target: dataPipelineStatus.dataSource,
        set: {
          lastDownloadAt: new Date(),
          lastSuccessAt: new Date(),
          recordCount: records.length,
          status: 'success',
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

    console.log(`[OZ] Successfully stored ${records.length} opportunity zone tracts`);
    return {
      success: true,
      recordCount: records.length,
      message: `${records.length} QOZ census tracts loaded from HUD Open Data`,
    };
  } catch (error: any) {
    console.error('[OZ] Download failed:', error.message);

    await db
      .insert(dataPipelineStatus)
      .values({
        dataSource: 'opportunity_zones',
        lastDownloadAt: new Date(),
        status: 'error',
        errorMessage: error.message?.slice(0, 500),
        recordCount: 0,
      })
      .onConflictDoUpdate({
        target: dataPipelineStatus.dataSource,
        set: {
          lastDownloadAt: new Date(),
          status: 'error',
          errorMessage: error.message?.slice(0, 500),
          updatedAt: new Date(),
        },
      });

    return { success: false, recordCount: 0, message: error.message };
  }
}
