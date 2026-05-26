import type { EnvironmentalRiskData } from '@shared/schema';

const OPEN_METEO_AQ_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

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

export async function fetchEnvironmentalRisk(lat: number, lon: number): Promise<EnvironmentalRiskData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(6),
      longitude: lon.toFixed(6),
      current: 'us_aqi,pm2_5,ozone,carbon_monoxide,nitrogen_dioxide,dust',
      domains: 'cams_global',
    });

    const url = `${OPEN_METEO_AQ_API}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ScoreCasa/1.0 (Real Estate Analysis Platform)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo AQ API returned ${response.status}`);
    }

    const raw = await response.json();
    const current = raw?.current;

    if (!current) {
      console.log('[Air Quality] No current data in Open-Meteo response');
      return null;
    }

    const usAqi: number = current.us_aqi ?? 0;
    const pm25: number = current.pm2_5 ?? 0;
    const ozone: number = current.ozone ?? 0;
    const no2: number = current.nitrogen_dioxide ?? 0;

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
      dataSource: 'Open-Meteo AQ (CAMS Global) · AirToxScreen context',
      lat,
      lon,
    };
  } catch (error: any) {
    console.error('[Air Quality] Error:', error.message);
    return null;
  }
}
