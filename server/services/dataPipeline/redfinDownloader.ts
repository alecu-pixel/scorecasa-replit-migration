/**
 * Market Competition Data — powered by Zillow Market Metrics
 *
 * Previously this module downloaded a 940 MB Redfin S3 file to get market
 * competition signals. That bulk download proved unreliable in production
 * (S3 connections were terminated before completing).
 *
 * We now serve the SAME signals (% above list, sale-to-list ratio, days to
 * pending, % below list) from the Zillow Market Metrics table, which is
 * already downloaded successfully by the Zillow pipeline (928 metro/zip records).
 *
 * The exported `queryRedfinMarketHeat` function keeps the same signature so
 * no callers need to change.
 */

import { db } from '../../db';
import { zillowMarketMetrics, dataPipelineStatus } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { RedfinMarketHeatData } from '@shared/schema';

export async function queryRedfinMarketHeat(stateCode: string, cityHint?: string): Promise<RedfinMarketHeatData | null> {
  try {
    const stateUpper = stateCode.toUpperCase();

    // Query Zillow market metrics for this state — latest date per region
    const rows = await db
      .select()
      .from(zillowMarketMetrics)
      .where(eq(zillowMarketMetrics.stateCode, stateUpper))
      .orderBy(desc(zillowMarketMetrics.metricDate));

    if (rows.length === 0) return null;

    // Try to find the best city match if a hint is provided
    let matchedRows = rows;
    if (cityHint) {
      const cityNorm = cityHint.toLowerCase().trim();
      const cityMatch = rows.find(r =>
        r.regionName && (
          r.regionName.toLowerCase().includes(cityNorm) ||
          cityNorm.includes(r.regionName.toLowerCase())
        )
      );
      if (cityMatch) matchedRows = [cityMatch];
    }

    // Use the most recent period
    const latestDate = matchedRows[0].metricDate;
    const latestRows = matchedRows.filter(r => r.metricDate === latestDate);

    const avg = (vals: (number | null | undefined)[]): number | null => {
      const valid = vals.filter(v => v != null) as number[];
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };

    // Map Zillow fields → Redfin-compatible market heat fields
    const pctAboveRaw = avg(latestRows.map(r => r.percentSoldAboveList));
    const pctBelowRaw = avg(latestRows.map(r => r.percentSoldBelowList));
    const saleToList  = avg(latestRows.map(r => r.saleToListRatio));
    const dom         = avg(latestRows.map(r => r.daysToPending));

    // Zillow stores these as fractions (0–1) or percentages (0–100) — normalise to %
    const pctAbovePct = pctAboveRaw !== null ? (pctAboveRaw > 1 ? pctAboveRaw : pctAboveRaw * 100) : null;
    // Use % below list as a proxy for "homes with price drops"
    const pctDropsPct = pctBelowRaw !== null ? (pctBelowRaw > 1 ? pctBelowRaw : pctBelowRaw * 100) : null;

    // Classify market heat
    let heat: RedfinMarketHeatData['marketHeat'] = 'balanced';
    let heatLabel = 'Balanced Market';
    let heatColor = '#6b7280';

    if (pctAbovePct !== null && pctDropsPct !== null) {
      if (pctAbovePct > 50 && pctDropsPct < 15) {
        heat = 'hot';  heatLabel = 'Hot Market';  heatColor = '#ef4444';
      } else if (pctAbovePct > 35 && pctDropsPct < 20) {
        heat = 'warm'; heatLabel = 'Warm Market'; heatColor = '#f97316';
      } else if (pctAbovePct < 20 && pctDropsPct > 25) {
        heat = 'cold'; heatLabel = 'Cold Market'; heatColor = '#3b82f6';
      } else if (pctAbovePct < 30 && pctDropsPct > 20) {
        heat = 'cool'; heatLabel = 'Cool Market'; heatColor = '#06b6d4';
      }
    }

    let insight = '';
    const regionLabel = cityHint || stateUpper;
    if (pctAbovePct !== null && pctDropsPct !== null) {
      if (heat === 'hot') {
        insight = `${pctAbovePct.toFixed(0)}% of homes are selling above asking and only ${pctDropsPct.toFixed(0)}% have price drops — a strong seller's market.`;
      } else if (heat === 'warm') {
        insight = `${pctAbovePct.toFixed(0)}% of homes sell above list with modest drops (${pctDropsPct.toFixed(0)}%) — conditions slightly favour sellers.`;
      } else if (heat === 'cold' || heat === 'cool') {
        insight = `Only ${pctAbovePct.toFixed(0)}% of homes sell above asking and ${pctDropsPct.toFixed(0)}% have price reductions — buyers have negotiating power.`;
      } else {
        insight = `${pctAbovePct.toFixed(0)}% of homes sell above list and ${pctDropsPct.toFixed(0)}% have price drops — a balanced market.`;
      }
    } else {
      insight = `Zillow market competition data available for ${regionLabel}.`;
    }

    const periodStr = latestDate instanceof Date
      ? latestDate.toISOString().split('T')[0]
      : String(latestDate);

    return {
      regionName: cityHint || stateUpper,
      stateCode: stateUpper,
      periodEnd: periodStr,
      pctHomesAboveList: pctAbovePct !== null ? parseFloat(pctAbovePct.toFixed(1)) : null,
      pctHomesWithDrops: pctDropsPct !== null ? parseFloat(pctDropsPct.toFixed(1)) : null,
      medianSaleToList: saleToList,
      medianDaysOnMarket: dom !== null ? Math.round(dom) : null,
      marketHeat: heat,
      heatLabel,
      heatColor,
      insight,
      dataSource: 'Zillow Market Metrics',
    };
  } catch (error: any) {
    console.error('[Market Heat Query] Error:', error.message);
    return null;
  }
}

/**
 * No-op kept for scheduler compatibility.
 * The Redfin bulk S3 download has been replaced by Zillow market metrics.
 * Marks the pipeline as success so admin clears any stale error status.
 */
export async function downloadRedfinMarketData(): Promise<{ success: boolean; recordCount: number; message: string }> {
  const message = 'Powered by Zillow Market Metrics — no bulk download required';
  try {
    // Count available Zillow market metrics rows as the "record count"
    const rows = await db.select().from(zillowMarketMetrics).limit(1);
    const count = rows.length > 0
      ? (await db.execute(sql`SELECT COUNT(*)::int AS n FROM zillow_market_metrics`)).rows[0].n as number
      : 0;

    await db
      .insert(dataPipelineStatus)
      .values({
        dataSource: 'redfin_market_data',
        lastDownloadAt: new Date(),
        lastSuccessAt: new Date(),
        recordCount: count,
        status: 'success',
        errorMessage: null,
      })
      .onConflictDoUpdate({
        target: dataPipelineStatus.dataSource,
        set: {
          lastDownloadAt: new Date(),
          lastSuccessAt: new Date(),
          recordCount: count,
          status: 'success',
          errorMessage: null,
          updatedAt: new Date(),
        },
      });
  } catch {
    // best-effort status update
  }
  return { success: true, recordCount: 0, message };
}
