import type { SeismicRiskData } from '@shared/schema';

const USGS_HAZARD_API = 'https://earthquake.usgs.gov/ws/building-codes/asce7-22/calculate';

interface USGSDesignMapsResponse {
  output?: {
    data?: Array<{
      pga?: number;
      ss?: number;
      s1?: number;
      sds?: number;
      sd1?: number;
    }>;
  };
  metadata?: {
    status?: string;
    message?: string;
  };
}

function classifyPGA(pga: number): {
  riskLevel: SeismicRiskData['riskLevel'];
  riskLabel: string;
  affectedRegion: string;
} {
  if (pga < 0.05) {
    return { riskLevel: 'very_low', riskLabel: 'Very Low Seismic Risk', affectedRegion: 'Low-seismicity zone' };
  }
  if (pga < 0.15) {
    return { riskLevel: 'low', riskLabel: 'Low Seismic Risk', affectedRegion: 'Moderate seismicity region' };
  }
  if (pga < 0.30) {
    return { riskLevel: 'moderate', riskLabel: 'Moderate Seismic Risk', affectedRegion: 'Active seismic zone' };
  }
  if (pga < 0.60) {
    return { riskLevel: 'high', riskLabel: 'High Seismic Risk', affectedRegion: 'High-seismicity zone' };
  }
  return { riskLevel: 'very_high', riskLabel: 'Very High Seismic Risk', affectedRegion: 'Extreme seismic hazard zone' };
}

function buildSeismicInsight(pga: number, riskLevel: string, region: string): string {
  if (riskLevel === 'very_low') {
    return `This area has very low earthquake risk. Seismic activity is rare and unlikely to significantly impact property values or require earthquake-specific insurance.`;
  }
  if (riskLevel === 'low') {
    return `This area has low seismic risk. Minor earthquakes are possible but major damaging events are infrequent. Standard construction codes are generally sufficient.`;
  }
  if (riskLevel === 'moderate') {
    return `This area has moderate seismic risk (PGA: ${(pga * 100).toFixed(0)}%g). Earthquake insurance and seismic retrofitting of older homes are worth considering.`;
  }
  if (riskLevel === 'high') {
    return `This area has high seismic risk (PGA: ${(pga * 100).toFixed(0)}%g). Earthquake insurance is strongly recommended and older buildings may need retrofit evaluation before purchase.`;
  }
  return `This area has very high seismic risk (PGA: ${(pga * 100).toFixed(0)}%g) — one of the highest-hazard zones in the country. Earthquake insurance is essential and structural integrity of any property should be verified.`;
}

// Geographic region hints for better labeling
function getRegionHint(lat: number, lon: number): string {
  if (lat > 36 && lon < -115 && lon > -125) return 'California';
  if (lat > 45 && lon < -120) return 'Pacific Northwest';
  if (lat > 35 && lat < 45 && lon > -115 && lon < -105) return 'Intermountain West';
  if (lat > 34 && lat < 40 && lon > -92 && lon < -88) return 'New Madrid Seismic Zone';
  if (lat > 32 && lat < 35 && lon > -82 && lon < -79) return 'South Carolina / Georgia';
  if (lat > 55 && lon < -140) return 'Alaska';
  if (lat < 22) return 'Hawaii';
  return 'Eastern US';
}

export async function fetchSeismicRisk(lat: number, lon: number): Promise<SeismicRiskData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      riskCategory: 'II',
      siteClass: 'C',
      title: 'ScoreCasa-query',
    });

    const url = `${USGS_HAZARD_API}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ScoreCasa/1.0 (Real Estate Analysis Platform)' },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      throw new Error(`USGS API returned ${response.status}`);
    }

    const raw: USGSDesignMapsResponse = await response.json();

    // Extract PGA from first data point
    // New USGS service: response.data.pgam (site-adjusted peak ground acceleration); old: output.data[0].pga
    const d: any = (raw as any)?.response?.data ?? (raw as any)?.output?.data?.[0];
    const pgaRaw = d?.pgam ?? d?.pga;
    if (pgaRaw === undefined || pgaRaw === null) {
      console.log('[USGS Seismic] No PGA value in response');
      return null;
    }

    const pga = typeof pgaRaw === 'number' ? pgaRaw : parseFloat(String(pgaRaw));
    if (isNaN(pga)) {
      console.log('[USGS Seismic] PGA value is not a number:', pgaRaw);
      return null;
    }

    const { riskLevel, riskLabel, affectedRegion } = classifyPGA(pga);
    const regionHint = getRegionHint(lat, lon);
    const insight = buildSeismicInsight(pga, riskLevel, regionHint);

    console.log(`[USGS Seismic] PGA: ${pga.toFixed(3)}g, Risk: ${riskLevel}, Region: ${regionHint}`);

    return {
      riskLevel,
      riskLabel,
      pga: parseFloat((pga * 100).toFixed(1)), // Store as %g
      insight,
      affectedRegion: regionHint !== 'Eastern US' ? regionHint : affectedRegion,
      dataSource: 'USGS National Seismic Hazard Maps (ASCE 7-22)',
      lat,
      lon,
    };
  } catch (error: any) {
    console.error('[USGS Seismic] Error:', error.message);
    return null;
  }
}
