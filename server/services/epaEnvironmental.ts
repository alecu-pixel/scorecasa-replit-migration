import type { EnvironmentalRiskData } from '@shared/schema';

// Paid-licence endpoint; the free air-quality-api.open-meteo.com is non-commercial only.
const OPEN_METEO_AQ_API = 'https://customer-air-quality-api.open-meteo.com/v1/air-quality';

function classifyRisk(score: number): EnvironmentalRiskData['riskLevel'] {
  if (score < 20) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

const RISK_LABELS: Record<string, string> = {
  very_low: 'Very Low Environmental Risk',
  low: 'Low Environmental Risk',
  moderate: 'Moderate Environmental Risk',
  high: 'High Environmental Risk',
  very_high: 'Very High Environmental Risk',
};

function pm25ToPercentile(ugm3: number): number {
  if (ugm3 < 4) return 15;
  if (ugm3 < 7) return 30;
  if (ugm3 < 9) return 45;
  if (ugm3 < 12) return 60;
  if (ugm3 < 15) return 70;
  if (ugm3 < 20) return 80;
  if (ugm3 < 25) return 90;
  return 97;
}

function ozoneToPercentile(ugm3: number): number {
  if (ugm3 < 60) return 20;
  if (ugm3 < 80) return 35;
  if (ugm3 < 100) return 50;
  if (ugm3 < 120) return 65;
  if (ugm3 < 150) return 78;
  if (ugm3 < 180) return 88;
  return 96;
}

function no2ToDieselProxy(ugm3: number): number {
  if (ugm3 < 5) return 10;
  if (ugm3 < 10) return 25;
  if (ugm3 < 20) return 45;
  if (ugm3 < 30) return 60;
  if (ugm3 < 50) return 75;
  if (ugm3 < 80) return 88;
  return 96;
}

function aqiToRiskScore(aqi: number): number {
  if (aqi <= 50) return Math.round(5 + (aqi / 50) * 20);
  if (aqi <= 100) return Math.round(25 + ((aqi - 50) / 50) * 25);
  if (aqi <= 150) return Math.round(50 + ((aqi - 100) / 50) * 15);
  if (aqi <= 200) return Math.round(65 + ((aqi - 150) / 50) * 15);
  return Math.min(100, Math.round(80 + ((aqi - 200) / 100) * 20));
}

function aqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function buildInsight(pm25: number, ozone: number, usAqi: number, riskLevel: string): string {
  const aqiLabel = aqiCategory(usAqi);

  if (riskLevel === 'very_low') {
    return `Air quality is excellent near this property. The current US AQI reads ${usAqi} (${aqiLabel}), with PM2.5 at ${pm25.toFixed(1)} μg/m³ — well below EPA's annual standard of 12 μg/m³. Clean air is a positive long-term factor for livability and health-conscious buyers.`;
  }
  if (riskLevel === 'low') {
    return `Air quality is good near this property. The current US AQI reads ${usAqi} (${aqiLabel}), with PM2.5 at ${pm25.toFixed(1)} μg/m³. Minor air quality concerns are typical for most populated areas and unlikely to significantly affect livability.`;
  }
  if (riskLevel === 'moderate') {
    return `Air quality is moderate near this property. The current US AQI reads ${usAqi} (${aqiLabel}), with PM2.5 at ${pm25.toFixed(1)} μg/m³. Sensitive individuals (children, elderly, those with respiratory conditions) may notice effects on higher-pollution days.`;
  }
  const issues: string[] = [];
  if (pm25 > 35) issues.push(`elevated PM2.5 (${pm25.toFixed(1)} μg/m³, above EPA 24-hr standard of 35 μg/m³)`);
  if (ozone > 150) issues.push(`high surface ozone (${ozone.toFixed(0)} μg/m³)`);

  if (issues.length > 0) {
    return `Air quality is a concern near this property. The current US AQI reads ${usAqi} (${aqiLabel}), with ${issues.join(' and ')}. This may affect long-term livability, particularly for health-sensitive buyers.`;
  }
  return `Air quality shows elevated pollution near this property (US AQI: ${usAqi}, ${aqiLabel}). Regular exposure to air pollution at this level may be a consideration for some buyers.`;
}

interface AirReading { usAqi: number; pm25: number; ozone: number; no2: number; source: string }

// EPA AirNow "Observations by Monitoring Site" (the per-area "current observation" services were
// retired on 2026-10-01). Official US monitors, free API key, commercial use allowed.
// Takes the nearest monitor's latest hourly reading for each pollutant, widening the search box
// if nothing reports nearby.
async function fetchAirNow(lat: number, lon: number, apiKey: string): Promise<AirReading | null> {
  const hourUtc = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000).toISOString().slice(0, 13);
  const distKm = (a: number, b: number) => {
    const dLat = (a - lat) * 111;
    const dLon = (b - lon) * 111 * Math.cos(lat * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };

  for (const span of [0.35, 1.0]) { // ~25 miles, then ~70 miles
    const params = new URLSearchParams({
      startDate: hourUtc(4),
      endDate: hourUtc(0),
      parameters: 'OZONE,PM25,NO2',
      BBOX: [lon - span, lat - span, lon + span, lat + span].map(n => n.toFixed(4)).join(','),
      dataType: 'B', // AQI and concentration
      format: 'application/json',
      verbose: '1',
      monitorType: '0',
      includerawconcentrations: '0',
      API_KEY: apiKey,
    });
    const response = await fetch(`https://www.airnowapi.org/aq/data/?${params}`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`AirNow returned ${response.status}`);
    const rows: any[] = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // Nearest monitor per pollutant, then its most recent hour
    const nearest = (param: string) => {
      const list = rows.filter(r => r.Parameter === param && Number(r.Value) >= 0);
      if (!list.length) return null;
      list.sort((a, b) => distKm(a.Latitude, a.Longitude) - distKm(b.Latitude, b.Longitude) || String(b.UTC).localeCompare(String(a.UTC)));
      const site = list[0].SiteName;
      return list.filter(r => r.SiteName === site).sort((a, b) => String(b.UTC).localeCompare(String(a.UTC)))[0];
    };
    const pm = nearest('PM2.5');
    const o3 = nearest('OZONE');
    const no2 = nearest('NO2');
    if (!pm && !o3) continue;

    const usAqi = Math.max(Number(pm?.AQI) || 0, Number(o3?.AQI) || 0);
    const sites = Array.from(new Set([pm?.SiteName, o3?.SiteName].filter(Boolean)));
    return {
      usAqi,
      pm25: pm ? Number(pm.Value) : 0,
      ozone: o3 ? Math.round(Number(o3.Value) * 1.96) : 0, // ppb -> μg/m³ (25 °C)
      no2: no2 ? Math.round(Number(no2.Value) * 1.88) : 0,   // ppb -> μg/m³
      source: `EPA AirNow (${sites.join(', ')})`,
    };
  }
  return null;
}

// Open-Meteo: only with a paid licence (its free tier is non-commercial). Uses the customer endpoint.
async function fetchOpenMeteo(lat: number, lon: number, apiKey: string): Promise<AirReading | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6),
    current: 'us_aqi,pm2_5,ozone,carbon_monoxide,nitrogen_dioxide,dust',
    domains: 'cams_global',
    apikey: apiKey,
  });
  const response = await fetch(`${OPEN_METEO_AQ_API}?${params.toString()}`, {
    headers: { 'User-Agent': 'ScoreCasa/1.0 (https://scorecasa.com)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Open-Meteo AQ API returned ${response.status}`);
  const current = (await response.json())?.current;
  if (!current) return null;
  return {
    usAqi: current.us_aqi ?? 0,
    pm25: current.pm2_5 ?? 0,
    ozone: current.ozone ?? 0,
    no2: current.nitrogen_dioxide ?? 0,
    source: 'Open-Meteo AQ (CAMS Global)',
  };
}

export async function fetchEnvironmentalRisk(lat: number, lon: number): Promise<EnvironmentalRiskData | null> {
  try {
    const airNowKey = process.env.AIRNOW_API_KEY?.trim();
    const openMeteoKey = process.env.OPEN_METEO_API_KEY?.trim();
    let reading: AirReading | null = null;
    if (airNowKey) {
      reading = await fetchAirNow(lat, lon, airNowKey).catch(err => { console.warn('[Air Quality] AirNow failed:', err.message); return null; });
    }
    if (!reading && openMeteoKey) {
      reading = await fetchOpenMeteo(lat, lon, openMeteoKey).catch(err => { console.warn('[Air Quality] Open-Meteo failed:', err.message); return null; });
    }
    if (!reading) {
      if (!airNowKey && !openMeteoKey) console.log('[Air Quality] No AIRNOW_API_KEY set; section skipped');
      return null;
    }

    const { usAqi, pm25, ozone, no2 } = reading;

    const pm25Pctile = pm25ToPercentile(pm25);
    const ozonePctile = ozoneToPercentile(ozone);
    const dieselProxy = no2ToDieselProxy(no2);
    const riskScore = aqiToRiskScore(usAqi);
    const riskLevel = classifyRisk(riskScore);

    const keyRisks: string[] = [];
    if (pm25 > 12) keyRisks.push(`PM2.5 at ${pm25.toFixed(1)} μg/m³ exceeds EPA annual standard of 12 μg/m³`);
    if (pm25 > 35) keyRisks.push(`PM2.5 at ${pm25.toFixed(1)} μg/m³ exceeds EPA 24-hr standard of 35 μg/m³`);
    if (usAqi > 100) keyRisks.push(`US AQI of ${usAqi} — ${aqiCategory(usAqi)} (sensitive groups at risk)`);
    if (usAqi > 150) keyRisks.push(`US AQI of ${usAqi} — general population health risk`);
    if (ozone > 150) keyRisks.push(`Elevated surface ozone (${ozone.toFixed(0)} μg/m³)`);
    if (no2 > 40) keyRisks.push(`Elevated NO2 from traffic/industry (${no2.toFixed(1)} μg/m³)`);

    const insight = buildInsight(pm25, ozone, usAqi, riskLevel);

    console.log(`[Air Quality] AQI: ${usAqi} (${aqiCategory(usAqi)}), PM2.5: ${pm25} μg/m³, Ozone: ${ozone} μg/m³, Risk: ${riskLevel}`);

    return {
      riskLevel,
      riskLabel: RISK_LABELS[riskLevel],
      riskScore,
      pm25Percentile: pm25Pctile,
      ozonePercentile: ozonePctile,
      dieselPmPercentile: dieselProxy,
      superfundProximity: false,
      superfundProxPercentile: 0,
      wastewater: false,
      airQualityIndex: usAqi,
      usAqi,
      pm25Concentration: pm25,
      ozoneConcentration: ozone,
      no2Concentration: no2,
      keyRisks,
      insight,
      dataSource: reading.source,
      lat,
      lon,
    };
  } catch (error: any) {
    console.error('[Air Quality] Error:', error.message);
    return null;
  }
}
