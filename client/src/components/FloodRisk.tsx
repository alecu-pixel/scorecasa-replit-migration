import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Droplets, AlertTriangle, Shield, DollarSign, Info, MapPin, Loader2, FileText, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FloodRiskData, NfipClaimsData } from '@shared/schema';

interface FloodRiskProps {
  data: FloodRiskData | null;
}

const FLOOD_ZONE_INFO: Record<string, { riskLevel: string; label: string; description: string; insuranceRequired: boolean }> = {
  'V': { riskLevel: 'extreme', label: 'Coastal Extreme Risk', description: 'Coastal areas with additional hazards from storm-induced velocity wave action. These properties face the highest flood risk.', insuranceRequired: true },
  'VE': { riskLevel: 'extreme', label: 'Coastal Extreme Risk', description: 'Coastal flood zone with base flood elevations determined. Extremely high risk of flooding from storm surge.', insuranceRequired: true },
  'A': { riskLevel: 'high', label: 'High Risk', description: 'Areas with a 1% annual chance of flooding (100-year floodplain). No base flood elevations determined.', insuranceRequired: true },
  'AE': { riskLevel: 'high', label: 'High Risk', description: 'Areas with a 1% annual chance of flooding with base flood elevations determined. Flood insurance is federally required for mortgages.', insuranceRequired: true },
  'AH': { riskLevel: 'high', label: 'High Risk - Shallow Flooding', description: 'Areas with a 1% annual chance of shallow flooding (1-3 feet). Usually ponding areas.', insuranceRequired: true },
  'AO': { riskLevel: 'high', label: 'High Risk - Sheet Flow', description: 'Areas with a 1% annual chance of shallow flooding in the form of sheet flow, with average depths of 1-3 feet.', insuranceRequired: true },
  'AR': { riskLevel: 'high', label: 'High Risk - Restoration', description: 'Areas with temporarily increased flood risk due to restoration of a flood control system (e.g., levee under repair).', insuranceRequired: true },
  'A99': { riskLevel: 'high', label: 'High Risk - Future Protection', description: 'Areas protected by a federal flood protection system under construction. 1% annual chance of flooding.', insuranceRequired: true },
  'X_SHADED': { riskLevel: 'moderate', label: 'Moderate Risk', description: 'Areas with 0.2% annual chance of flooding (500-year floodplain). Flood insurance is recommended but not required.', insuranceRequired: false },
  'X': { riskLevel: 'minimal', label: 'Minimal Risk', description: 'Areas outside the 500-year floodplain. Low risk of flooding, though localized flooding can still occur.', insuranceRequired: false },
  'D': { riskLevel: 'low', label: 'Undetermined Risk', description: 'Areas where flood hazards are undetermined but possible. No analysis has been conducted for this area.', insuranceRequired: false },
};

function classifyZone(zone: string, subType?: string | null) {
  const normalized = zone?.toUpperCase()?.trim() || '';
  if (normalized === 'X' && subType && (subType.includes('0.2') || subType.toUpperCase().includes('SHADED'))) {
    return FLOOD_ZONE_INFO['X_SHADED'];
  }
  if (FLOOD_ZONE_INFO[normalized]) return FLOOD_ZONE_INFO[normalized];
  if (normalized.startsWith('V')) return FLOOD_ZONE_INFO['V'];
  if (normalized.startsWith('A')) return FLOOD_ZONE_INFO['A'];
  return FLOOD_ZONE_INFO['X'];
}

function calcFloodScore(riskLevel: string): number {
  switch (riskLevel) {
    case 'minimal': return 95;
    case 'low': return 70;
    case 'moderate': return 50;
    case 'high': return 25;
    case 'extreme': return 10;
    default: return 50;
  }
}

function estimateInsurance(riskLevel: string, propertyValue: number) {
  const rates: Record<string, number> = { extreme: 0.015, high: 0.008, moderate: 0.003, low: 0.002, minimal: 0.001 };
  const rate = rates[riskLevel] || 0.003;
  const annual = Math.min(Math.max(Math.round(propertyValue * rate), 400), 15000);
  return { annual, monthly: Math.round(annual / 12) };
}

async function queryFemaClientSide(lat: number, lon: number): Promise<FloodRiskData | null> {
  const url = `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DEPTH&returnGeometry=false&f=json`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) return null;

  const data = await resp.json();
  if (!data.features || data.features.length === 0) return null;

  const attrs = data.features[0].attributes;
  const zoneCode = attrs.FLD_ZONE || 'X';
  const zoneSubType = attrs.ZONE_SUBTY || '';
  const sfha = attrs.SFHA_TF === 'T';
  const bfe = attrs.STATIC_BFE || null;

  const info = classifyZone(zoneCode, zoneSubType);
  const riskLevel = info.riskLevel as 'extreme' | 'high' | 'moderate' | 'low' | 'minimal';
  const score = calcFloodScore(riskLevel);
  const ins = estimateInsurance(riskLevel, 350000);

  return {
    floodZone: zoneCode,
    floodZoneSubType: zoneSubType || null,
    riskLevel,
    riskLabel: info.label,
    description: info.description,
    color: '#dc2626',
    insuranceRequired: info.insuranceRequired,
    isSpecialFloodHazardArea: sfha,
    baseFloodElevation: bfe,
    floodScore: score,
    estimatedInsurance: {
      annual: ins.annual,
      monthly: ins.monthly,
      note: info.insuranceRequired
        ? 'Flood insurance is federally required for properties in this zone with a mortgage from a federally regulated lender.'
        : 'Flood insurance is not required but may be recommended. Private flood policies are often available at lower cost.',
    },
    dataSource: 'FEMA National Flood Hazard Layer (NFHL)',
    lat,
    lon,
  };
}

function getRiskStyles(riskLevel: string) {
  switch (riskLevel) {
    case 'minimal':
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-400', badgeBorder: 'border-emerald-500/30' };
    case 'low':
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-400', badgeBorder: 'border-blue-500/30' };
    case 'moderate':
      return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badgeBg: 'bg-yellow-500/20', badgeText: 'text-yellow-400', badgeBorder: 'border-yellow-500/30' };
    case 'high':
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badgeBg: 'bg-red-500/20', badgeText: 'text-red-400', badgeBorder: 'border-red-500/30' };
    case 'extreme':
      return { bg: 'bg-red-700/10', border: 'border-red-700/30', text: 'text-red-500', badgeBg: 'bg-red-700/20', badgeText: 'text-red-500', badgeBorder: 'border-red-700/30' };
    default:
      return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', badgeBg: 'bg-gray-500/20', badgeText: 'text-gray-400', badgeBorder: 'border-gray-500/30' };
  }
}

function getScoreDisplay(score: number) {
  if (score >= 80) return { label: 'Low Risk', color: 'text-emerald-400' };
  if (score >= 60) return { label: 'Moderate Risk', color: 'text-blue-400' };
  if (score >= 40) return { label: 'Elevated Risk', color: 'text-yellow-400' };
  if (score >= 20) return { label: 'High Risk', color: 'text-red-400' };
  return { label: 'Extreme Risk', color: 'text-red-500' };
}

export default function FloodRisk({ data }: FloodRiskProps) {
  const [resolvedData, setResolvedData] = useState<FloodRiskData | null>(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data && data.floodZone !== 'UNKNOWN') {
      setResolvedData(data);
      return;
    }

    if (data && data.floodZone === 'UNKNOWN' && data.lat && data.lon) {
      setLoading(true);
      queryFemaClientSide(data.lat, data.lon)
        .then((result) => {
          if (result) {
            setResolvedData(result);
          } else {
            setResolvedData(data);
          }
        })
        .catch(() => {
          setResolvedData(data);
        })
        .finally(() => setLoading(false));
    } else {
      setResolvedData(data);
    }
  }, [data]);

  if (!resolvedData) {
    return (
      <Card className="p-6 glass-card border-gray-700/50" data-testid="card-flood-risk-unavailable">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
            <Droplets className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Flood Risk Assessment</h3>
            <p className="text-sm text-gray-400">Flood zone data unavailable</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          FEMA flood zone data is not available for this location. The area may not be mapped.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 glass-card border-gray-700/50" data-testid="card-flood-risk-loading">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-white">Flood Risk Assessment</h3>
            <p className="text-sm text-gray-400">Querying FEMA flood zone data...</p>
          </div>
        </div>
      </Card>
    );
  }

  const styles = getRiskStyles(resolvedData.riskLevel);
  const scoreDisplay = getScoreDisplay(resolvedData.floodScore);

  return (
    <Card className="p-6 glass-card border-gray-700/50" data-testid="card-flood-risk">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${styles.bg} border ${styles.border}`}>
            <Droplets className={`w-6 h-6 ${styles.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Flood Risk Assessment</h3>
            <p className="text-sm text-gray-400">FEMA National Flood Hazard Layer</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreDisplay.color}`} data-testid="text-flood-score">
              {resolvedData.floodScore}/100
            </div>
            <p className="text-xs text-gray-500">{scoreDisplay.label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${styles.bg} border ${styles.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className={`w-4 h-4 ${styles.text}`} />
            <span className="text-sm font-medium text-gray-300">Flood Zone</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xl font-bold ${styles.text}`} data-testid="text-flood-zone">
              Zone {resolvedData.floodZone}
            </span>
            <Badge className={`${styles.badgeBg} ${styles.badgeText} border ${styles.badgeBorder}`} data-testid="badge-flood-risk-level">
              {resolvedData.riskLabel}
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-2">{resolvedData.description}</p>
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Insurance Impact</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Estimated based on FEMA zone classification and typical NFIP rates. Actual premiums vary by property.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Est. Annual Premium</span>
              <span className="text-lg font-semibold text-white" data-testid="text-flood-insurance-annual">
                ${resolvedData.estimatedInsurance.annual.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Est. Monthly Cost</span>
              <span className="text-sm font-medium text-gray-300" data-testid="text-flood-insurance-monthly">
                ${resolvedData.estimatedInsurance.monthly.toLocaleString()}/mo
              </span>
            </div>
            {resolvedData.insuranceRequired ? (
              <div className="flex items-start gap-2 mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-red-400">Flood insurance is federally required for mortgages in this zone</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-emerald-400">Flood insurance not required but may be recommended</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {resolvedData.isSpecialFloodHazardArea && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Special Flood Hazard Area (SFHA)</p>
            <p className="text-xs text-gray-400 mt-1">
              This property is in a Special Flood Hazard Area. Lenders will require flood insurance for federally-backed mortgages. This may also affect property value and resale potential.
            </p>
          </div>
        </div>
      )}

      {/* NFIP Claims History Panel */}
      {resolvedData.nfipClaims !== undefined && (
        <NfipClaimsPanel claims={resolvedData.nfipClaims} />
      )}

      <Accordion type="single" collapsible className="border-gray-700/50">
        <AccordionItem value="zone-guide" className="border-gray-700/50">
          <AccordionTrigger className="text-sm text-gray-400 hover:text-white" data-testid="button-flood-zone-guide">
            FEMA Flood Zone Guide
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <ZoneRow zone="V / VE" risk="Extreme" color="text-red-500" desc="Coastal areas with storm surge wave action" />
              <ZoneRow zone="A / AE" risk="High" color="text-red-400" desc="100-year floodplain (1% annual chance)" />
              <ZoneRow zone="AO / AH" risk="High" color="text-orange-400" desc="Shallow flooding (1-3 ft depths)" />
              <ZoneRow zone="X (Shaded)" risk="Moderate" color="text-yellow-400" desc="500-year floodplain (0.2% annual chance)" />
              <ZoneRow zone="X (Unshaded)" risk="Minimal" color="text-emerald-400" desc="Outside mapped floodplains" />
              <ZoneRow zone="D" risk="Undetermined" color="text-gray-400" desc="No analysis conducted" />
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Source: FEMA National Flood Hazard Layer (NFHL). Flood zone designations are updated periodically and may not reflect recent changes.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="insurance-info" className="border-gray-700/50">
          <AccordionTrigger className="text-sm text-gray-400 hover:text-white" data-testid="button-flood-insurance-info">
            Understanding Flood Insurance
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2 text-sm text-gray-400">
              <p>
                The National Flood Insurance Program (NFIP) provides flood insurance to homeowners, renters, and businesses. Properties in high-risk flood zones (A and V zones) with federally-backed mortgages are required to carry flood insurance.
              </p>
              <p>
                Average NFIP premiums vary significantly by zone and property characteristics. Under FEMA's Risk Rating 2.0 methodology (effective 2021), premiums are calculated based on individual property risk factors rather than just zone designation.
              </p>
              <p>
                Private flood insurance is also available and may offer lower premiums or broader coverage. Shop multiple providers for the best rates.
              </p>
              <p className="text-xs text-gray-500">
                Insurance estimates shown are approximate based on zone classification and typical NFIP rates. Actual premiums depend on property elevation, building characteristics, and claims history.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

function getNfipActivityStyles(activity: NfipClaimsData['claimActivity'] | undefined | null) {
  switch (activity) {
    case 'none':
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dotColor: 'bg-emerald-400' };
    case 'low':
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dotColor: 'bg-blue-400' };
    case 'moderate':
      return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dotColor: 'bg-yellow-400' };
    case 'high':
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dotColor: 'bg-red-400' };
    default:
      return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', dotColor: 'bg-gray-400' };
  }
}

function NfipClaimsPanel({ claims }: { claims: NfipClaimsData | null | undefined }) {
  if (claims === null || claims === undefined) return null;

  const s = getNfipActivityStyles(claims.claimActivity);

  return (
    <div className={`mb-4 p-4 rounded-lg ${s.bg} border ${s.border}`} data-testid="card-nfip-claims">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${s.text}`} />
          <span className="text-sm font-semibold text-gray-200">NFIP Flood Claim History</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-gray-500" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Historical flood insurance claims paid through the National Flood Insurance Program (NFIP) for this census tract. Source: OpenFEMA, updated every 40–60 days.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Badge className={`${s.bg} ${s.text} border ${s.border} flex items-center gap-1.5`} data-testid="badge-nfip-activity">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`} />
          {claims.claimActivityLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Claims Paid (1978–present)</p>
          <p className={`text-xl font-bold ${s.text}`} data-testid="text-nfip-claim-count">
            {claims.totalClaimsPaid.toLocaleString()}
          </p>
        </div>
        {claims.totalClaimsPaid > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total Payouts</p>
            <p className="text-xl font-bold text-gray-200" data-testid="text-nfip-payout">
              ${claims.totalPayoutUsd >= 1000000
                ? `${(claims.totalPayoutUsd / 1000000).toFixed(1)}M`
                : claims.totalPayoutUsd >= 1000
                  ? `${(claims.totalPayoutUsd / 1000).toFixed(0)}K`
                  : claims.totalPayoutUsd.toLocaleString()}
            </p>
          </div>
        )}
        {claims.mostRecentClaimYear && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Most Recent Claim</p>
            <p className="text-base font-semibold text-gray-300" data-testid="text-nfip-recent-year">
              {claims.mostRecentClaimYear}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{claims.insight}</p>

      <p className="text-xs text-gray-600 mt-2">
        Census tract {claims.censusTract} · Source: OpenFEMA NFIP Redacted Claims
      </p>
    </div>
  );
}

function ZoneRow({ zone, risk, color, desc }: { zone: string; risk: string; color: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-mono font-semibold min-w-[100px] ${color}`}>{zone}</span>
      <span className="text-sm text-gray-300 min-w-[90px]">{risk}</span>
      <span className="text-sm text-gray-500">{desc}</span>
    </div>
  );
}
