import type { FloodRiskData, NfipClaimsData } from '@shared/schema';

const FEMA_NFHL_URL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';
const ESRI_FLOOD_URL = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0/query';
const NFIP_CLAIMS_URL = 'https://www.fema.gov/api/open/v3/NfipClaims';

interface FemaFloodZoneResponse {
  features?: Array<{
    attributes: {
      FLD_ZONE?: string;
      ZONE_SUBTY?: string;
      SFHA_TF?: string;
      STATIC_BFE?: number;
      DEPTH?: number;
      LEN_UNIT?: string;
      SOURCE_CIT?: string;
    };
  }>;
}

const FLOOD_ZONE_INFO: Record<string, { riskLevel: 'extreme' | 'high' | 'moderate' | 'low' | 'minimal'; label: string; description: string; color: string; insuranceRequired: boolean }> = {
  'V': { riskLevel: 'extreme', label: 'Coastal Extreme Risk', description: 'Coastal areas with additional hazards from storm-induced velocity wave action. These properties face the highest flood risk.', color: '#7f1d1d', insuranceRequired: true },
  'VE': { riskLevel: 'extreme', label: 'Coastal Extreme Risk', description: 'Coastal flood zone with base flood elevations determined. Extremely high risk of flooding from storm surge.', color: '#7f1d1d', insuranceRequired: true },
  'A': { riskLevel: 'high', label: 'High Risk', description: 'Areas with a 1% annual chance of flooding (100-year floodplain). No base flood elevations determined.', color: '#dc2626', insuranceRequired: true },
  'AE': { riskLevel: 'high', label: 'High Risk', description: 'Areas with a 1% annual chance of flooding with base flood elevations determined. Flood insurance is federally required for mortgages.', color: '#dc2626', insuranceRequired: true },
  'AH': { riskLevel: 'high', label: 'High Risk - Shallow Flooding', description: 'Areas with a 1% annual chance of shallow flooding (1-3 feet). Usually ponding areas.', color: '#ef4444', insuranceRequired: true },
  'AO': { riskLevel: 'high', label: 'High Risk - Sheet Flow', description: 'Areas with a 1% annual chance of shallow flooding in the form of sheet flow, with average depths of 1-3 feet.', color: '#ef4444', insuranceRequired: true },
  'AR': { riskLevel: 'high', label: 'High Risk - Restoration', description: 'Areas with temporarily increased flood risk due to restoration of a flood control system (e.g., levee under repair).', color: '#f97316', insuranceRequired: true },
  'A99': { riskLevel: 'high', label: 'High Risk - Future Protection', description: 'Areas protected by a federal flood protection system under construction. 1% annual chance of flooding.', color: '#f97316', insuranceRequired: true },
  'X_SHADED': { riskLevel: 'moderate', label: 'Moderate Risk', description: 'Areas with 0.2% annual chance of flooding (500-year floodplain). Flood insurance is recommended but not required.', color: '#eab308', insuranceRequired: false },
  'B': { riskLevel: 'moderate', label: 'Moderate Risk', description: 'Older designation for areas between 100-year and 500-year floodplain. Moderate flood risk.', color: '#eab308', insuranceRequired: false },
  'X': { riskLevel: 'minimal', label: 'Minimal Risk', description: 'Areas outside the 500-year floodplain. Low risk of flooding, though localized flooding can still occur.', color: '#22c55e', insuranceRequired: false },
  'C': { riskLevel: 'minimal', label: 'Minimal Risk', description: 'Older designation for areas outside the 500-year floodplain. Lowest flood risk category.', color: '#22c55e', insuranceRequired: false },
  'D': { riskLevel: 'low', label: 'Undetermined Risk', description: 'Areas where flood hazards are undetermined but possible. No analysis has been conducted for this area.', color: '#a3a3a3', insuranceRequired: false },
};

function classifyFloodZone(zone: string, subType?: string): typeof FLOOD_ZONE_INFO[string] {
  const normalized = zone?.toUpperCase()?.trim() || '';

  const sub = subType?.toUpperCase() || '';
  // 500-year floodplain: FEMA writes it as "0.2 PCT ANNUAL CHANCE..." (older maps: "SHADED")
  if (normalized === 'X' && (sub.includes('SHADED') || sub.includes('0.2'))) {
    return FLOOD_ZONE_INFO['X_SHADED'];
  }

  if (FLOOD_ZONE_INFO[normalized]) {
    return FLOOD_ZONE_INFO[normalized];
  }

  if (normalized.startsWith('V')) return FLOOD_ZONE_INFO['V'];
  if (normalized.startsWith('A')) return FLOOD_ZONE_INFO['A'];

  return FLOOD_ZONE_INFO['X'];
}

function calculateFloodScore(riskLevel: string): number {
  switch (riskLevel) {
    case 'minimal': return 95;
    case 'low': return 70;
    case 'moderate': return 50;
    case 'high': return 25;
    case 'extreme': return 10;
    default: return 50;
  }
}

function estimateFloodInsuranceCost(riskLevel: string, propertyValue: number): { annual: number; monthly: number } {
  const baseRates: Record<string, number> = {
    'extreme': 0.015,
    'high': 0.008,
    'moderate': 0.003,
    'low': 0.002,
    'minimal': 0.001,
  };

  const rate = baseRates[riskLevel] || 0.003;
  const annual = Math.round(propertyValue * rate);
  const capped = Math.min(Math.max(annual, 400), 15000);

  return {
    annual: capped,
    monthly: Math.round(capped / 12),
  };
}

async function fetchNfipClaims(censusTract: string): Promise<NfipClaimsData | null> {
  try {
    const params = new URLSearchParams({
      '$filter': `startswith(censusGeoid,'${censusTract}')`,
      '$select': 'censusGeoid,amountPaidOnBuildingClaim,amountPaidOnContentsClaim,yearOfLoss',
      '$top': '5000',
      '$format': 'json',
    });

    console.log(`[NFIP] Querying claims for census tract ${censusTract}`);
    const response = await fetch(`${NFIP_CLAIMS_URL}?${params}`, {
      headers: { 'User-Agent': 'ScoreCasa/1.0 (contact@scorecasa.com)' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[NFIP] API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    // OpenFEMA v2 returns data under the camelCase dataset name
    const claims: any[] = data?.NfipClaims || data?.nfipClaims || data?.ClaimDataSets || data?.data || [];

    console.log(`[NFIP] Found ${claims.length} claims for tract ${censusTract}`);

    if (claims.length === 0) {
      return {
        totalClaimsPaid: 0,
        totalPayoutUsd: 0,
        mostRecentClaimYear: null,
        claimActivity: 'none',
        claimActivityLabel: 'No Recorded Claims',
        insight: 'No flood insurance claims have been recorded in this census tract through the NFIP. This is a positive signal, though it does not guarantee the area will never flood.',
        censusTract,
      };
    }

    const totalPaid = claims.length;
    const totalPayout = claims.reduce((sum: number, c: any) => {
      const building = parseFloat(String(c.amountPaidOnBuildingClaim || 0)) || 0;
      const contents = parseFloat(String(c.amountPaidOnContentsClaim || 0)) || 0;
      return sum + building + contents;
    }, 0);

    const years = claims
      .map((c: any) => parseInt(String(c.yearOfLoss || 0)))
      .filter((y: number) => y > 1970);
    const mostRecent = years.length > 0 ? Math.max(...years) : null;

    let claimActivity: NfipClaimsData['claimActivity'];
    let claimActivityLabel: string;
    let insight: string;

    if (totalPaid <= 2) {
      claimActivity = 'low';
      claimActivityLabel = 'Low Claim Activity';
      insight = `${totalPaid} flood insurance claim${totalPaid === 1 ? '' : 's'} recorded in this census tract${mostRecent ? `, most recently in ${mostRecent}` : ''}. Low historical flood loss activity — a positive signal even in a mapped flood zone.`;
    } else if (totalPaid <= 10) {
      claimActivity = 'moderate';
      claimActivityLabel = 'Moderate Claim Activity';
      insight = `${totalPaid} flood insurance claims recorded in this census tract${mostRecent ? ` (most recently ${mostRecent})` : ''}. Moderate flood loss history — review flood zone designation carefully and factor insurance costs into your budget.`;
    } else {
      claimActivity = 'high';
      claimActivityLabel = 'High Claim Activity';
      insight = `${totalPaid} flood insurance claims totaling ~$${(totalPayout / 1000).toFixed(0)}K recorded in this census tract${mostRecent ? ` (most recently ${mostRecent})` : ''}. High repetitive loss history. This may significantly affect flood insurance availability and premiums.`;
    }

    return {
      totalClaimsPaid: totalPaid,
      totalPayoutUsd: Math.round(totalPayout),
      mostRecentClaimYear: mostRecent,
      claimActivity,
      claimActivityLabel,
      insight,
      censusTract,
    };
  } catch (error: any) {
    console.error('[NFIP] Error fetching claims:', error.message);
    return null;
  }
}

export async function fetchFloodRiskData(lat: number, lon: number, propertyValue?: number, censusTract?: string | null): Promise<FloodRiskData> {
  console.log(`[Flood Risk] Querying FEMA NFHL for coordinates: ${lat}, ${lon}`);

  try {
    const params = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DEPTH',
      returnGeometry: 'false',
      f: 'json',
    });

    // FEMA's own server resets server-to-server connections, so try Esri's public
    // copy of the same FEMA flood hazard layer first, then FEMA directly.
    let data: FemaFloodZoneResponse | null = null;
    for (const base of [ESRI_FLOOD_URL, FEMA_NFHL_URL]) {
      try {
        const response = await fetch(`${base}?${params}`, {
          headers: { 'User-Agent': 'ScoreCasa/1.0 (https://scorecasa.com)' },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json: any = await response.json();
        if (json?.error) throw new Error(json.error.message || 'query error');
        data = json;
        break;
      } catch (err: any) {
        console.log(`[Flood Risk] ${base} failed: ${err.message}`);
      }
    }
    if (!data) throw new Error('No flood zone source reachable');

    if (!data.features || data.features.length === 0) {
      console.log('[Flood Risk] No flood zone data available for this location');
      return buildDefaultResult(lat, lon, propertyValue);
    }

    const feature = data.features[0];
    const zoneCode = feature.attributes.FLD_ZONE || 'X';
    const zoneSubType = feature.attributes.ZONE_SUBTY || '';
    const sfha = feature.attributes.SFHA_TF === 'T';
    const baseFloodElevation = feature.attributes.STATIC_BFE || null;

    const zoneInfo = classifyFloodZone(zoneCode, zoneSubType);
    const floodScore = calculateFloodScore(zoneInfo.riskLevel);
    const estimatedValue = propertyValue || 350000;
    const insuranceCost = estimateFloodInsuranceCost(zoneInfo.riskLevel, estimatedValue);

    console.log(`[Flood Risk] Zone: ${zoneCode}, Risk: ${zoneInfo.riskLevel}, Score: ${floodScore}, Insurance Required: ${zoneInfo.insuranceRequired}`);

    // Fetch NFIP claim history in parallel if census tract is known
    const nfipClaims = censusTract ? await fetchNfipClaims(censusTract).catch(() => null) : null;

    return {
      floodZone: zoneCode,
      floodZoneSubType: zoneSubType || null,
      riskLevel: zoneInfo.riskLevel,
      riskLabel: zoneInfo.label,
      description: zoneInfo.description,
      color: zoneInfo.color,
      insuranceRequired: zoneInfo.insuranceRequired,
      isSpecialFloodHazardArea: sfha,
      baseFloodElevation,
      floodScore,
      estimatedInsurance: {
        annual: insuranceCost.annual,
        monthly: insuranceCost.monthly,
        note: zoneInfo.insuranceRequired
          ? 'Flood insurance is federally required for properties in this zone with a mortgage from a federally regulated lender.'
          : 'Flood insurance is not required but may be recommended. Private flood policies are often available at lower cost.',
      },
      nfipClaims,
      dataSource: 'FEMA National Flood Hazard Layer (NFHL) + OpenFEMA NFIP Claims',
      lat,
      lon,
    };
  } catch (error: any) {
    console.error('[Flood Risk] Error fetching FEMA data:', error.message);
    return buildDefaultResult(lat, lon, propertyValue);
  }
}

function buildDefaultResult(lat: number, lon: number, propertyValue?: number): FloodRiskData {
  const estimatedValue = propertyValue || 350000;
  const insuranceCost = estimateFloodInsuranceCost('low', estimatedValue);

  return {
    floodZone: 'UNKNOWN',
    floodZoneSubType: null,
    riskLevel: 'low',
    riskLabel: 'Undetermined Risk',
    description: 'Flood zone data is not available for this location. The area may not be mapped by FEMA, or the data could not be retrieved.',
    color: '#a3a3a3',
    insuranceRequired: false,
    isSpecialFloodHazardArea: false,
    baseFloodElevation: null,
    floodScore: 50,
    estimatedInsurance: {
      annual: insuranceCost.annual,
      monthly: insuranceCost.monthly,
      note: 'Flood zone could not be determined. Consider consulting local flood maps or a flood insurance agent.',
    },
    dataSource: 'FEMA NFHL (data unavailable)',
    lat,
    lon,
  };
}

export const FEMA_WMS_URL = 'https://hazards.fema.gov/gis/nfhl/services/public/NFHLWMS/MapServer/WMSServer';
