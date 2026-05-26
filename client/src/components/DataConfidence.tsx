import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Info,
  CheckCircle,
  AlertTriangle,
  Database,
  Clock
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface DataSourceInfo {
  name: string;
  confidence: ConfidenceLevel;
  description: string;
  lastUpdated?: string;
  accuracyNote: string;
  marginOfError?: string;
}

const SOURCE_REGISTRY: Record<string, DataSourceInfo> = {
  zillow_home: {
    name: 'Zillow Research Data',
    confidence: 'medium',
    description: 'Zillow Home Value Index (ZHVI) forecasts based on regional trends and historical patterns.',
    accuracyNote: 'Zillow forecasts have a median error of 2-7% depending on the market. Accuracy varies by region — areas with more transaction data tend to be more precise.',
    marginOfError: '±3-7%',
  },
  zillow_rent: {
    name: 'Zillow Observed Rent Index',
    confidence: 'medium',
    description: 'Rent forecasts from Zillow\'s observed rent data based on regional rental market trends.',
    accuracyNote: 'Zillow rent forecasts reflect metro/ZIP-level averages and may not capture property-specific factors like condition, upgrades, or micro-location.',
    marginOfError: '±5-10%',
  },
  zillow_velocity: {
    name: 'Zillow Market Metrics',
    confidence: 'high',
    description: 'Days to pending, sale-to-list ratios based on actual MLS transaction data reported to Zillow.',
    accuracyNote: 'Based on actual completed transactions. These are historical measurements, not predictions — accuracy is high for the reported period.',
  },
  census: {
    name: 'US Census Bureau (ACS)',
    confidence: 'high',
    description: 'American Community Survey data collected annually by the US Census Bureau. Government-verified statistics.',
    accuracyNote: 'Official government data with well-documented methodology. ACS data has a 1-2 year lag — values reflect the most recent survey period.',
    marginOfError: '±1-3% (varies by sample size)',
  },
  fred: {
    name: 'Federal Reserve (FRED)',
    confidence: 'high',
    description: 'Federal Reserve Economic Data — mortgage rate averages from Freddie Mac Primary Mortgage Market Survey.',
    accuracyNote: 'Authoritative source for mortgage rate benchmarks. Values represent weekly national averages, not individual lender rates.',
  },
  rentcast: {
    name: 'RentCast API',
    confidence: 'medium',
    description: 'Property-specific rental estimates based on comparable properties in the immediate area.',
    accuracyNote: 'Estimates are based on nearby comparable rentals. Accuracy improves with more comparable properties. Individual property condition and features may cause actual rent to differ.',
    marginOfError: '±5-15%',
  },
  bls: {
    name: 'Bureau of Labor Statistics',
    confidence: 'high',
    description: 'Official employment and labor force statistics from the US Bureau of Labor Statistics.',
    accuracyNote: 'Government economic data with standardized methodology. State-level data is highly reliable. Monthly updates reflect the most recent employment survey.',
  },
  fbi: {
    name: 'FBI Crime Data (UCR)',
    confidence: 'medium',
    description: 'Uniform Crime Reporting statistics compiled by the FBI from law enforcement agencies nationwide.',
    accuracyNote: 'Not all agencies report consistently. Data has a 1-2 year lag. State-level aggregates may not reflect local neighborhood conditions.',
    marginOfError: 'Varies by jurisdiction',
  },
  osm: {
    name: 'OpenStreetMap',
    confidence: 'medium',
    description: 'Community-maintained geographic data including points of interest, amenities, and infrastructure.',
    accuracyNote: 'Coverage varies by region. Urban areas tend to have more complete data. Some businesses may be missing or outdated.',
  },
  fema: {
    name: 'FEMA NFHL',
    confidence: 'high',
    description: 'National Flood Hazard Layer — official flood zone maps maintained by the Federal Emergency Management Agency.',
    accuracyNote: 'Official federal flood zone designations used by insurance companies and lenders. Maps are periodically updated but may not reflect very recent changes.',
  },
};

const confidenceConfig = {
  high: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: ShieldCheck,
    label: 'High Confidence',
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: Shield,
    label: 'Moderate Confidence',
  },
  low: {
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    icon: ShieldAlert,
    label: 'Low Confidence',
  },
};

interface ConfidenceBadgeProps {
  sourceKey: string;
  compact?: boolean;
  lastUpdated?: string;
}

export function ConfidenceBadge({ sourceKey, compact = false, lastUpdated }: ConfidenceBadgeProps) {
  const source = SOURCE_REGISTRY[sourceKey];
  if (!source) return null;

  const config = confidenceConfig[source.confidence];
  const Icon = config.icon;
  const updatedStr = lastUpdated || source.lastUpdated;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 text-xs ${config.color}`} data-testid={`confidence-badge-${sourceKey}`}>
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm glass border-gray-700">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-200">{source.name}</p>
            <p className="text-xs text-gray-400">{source.accuracyNote}</p>
            {source.marginOfError && (
              <p className="text-xs text-gray-500">Typical margin: {source.marginOfError}</p>
            )}
            {updatedStr && (
              <p className="text-xs text-gray-600">Last updated: {updatedStr}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${config.bg} ${config.color} ${config.border} text-xs gap-1`}
          data-testid={`confidence-badge-${sourceKey}`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
          {source.marginOfError && <span className="text-gray-500 ml-0.5">({source.marginOfError})</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm glass border-gray-700">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-200">{source.name}</p>
          <p className="text-xs text-gray-400">{source.accuracyNote}</p>
          {updatedStr && (
            <p className="text-xs text-gray-600">Last updated: {updatedStr}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface ForecastRangeProps {
  value: number;
  marginPercent: number;
  format: 'currency' | 'percent';
  label?: string;
}

export function ForecastRange({ value, marginPercent, format, label }: ForecastRangeProps) {
  if (value == null || !isFinite(value) || marginPercent <= 0) return null;
  
  const low = value * (1 - marginPercent / 100);
  const high = value * (1 + marginPercent / 100);

  const formatValue = (v: number) => {
    if (format === 'currency') return `$${Math.round(v).toLocaleString()}`;
    if (format === 'percent') return `${v.toFixed(1)}%`;
    return v.toString();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="forecast-range">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{label || 'Range'}:</span>
        <span className="text-xs font-mono text-gray-400">{formatValue(low)}</span>
        <span className="text-gray-600">—</span>
        <span className="text-xs font-mono text-gray-400">{formatValue(high)}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-gray-600 hover:text-gray-400 transition-colors cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs glass border-gray-700">
          <p className="text-xs text-gray-300">
            Based on typical accuracy margins for this data source. 
            The actual value may fall anywhere within this range.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SourceAgreementProps {
  signals: { label: string; agrees: boolean; detail: string }[];
}

export function SourceAgreement({ signals }: SourceAgreementProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (!signals || signals.length === 0) return null;
  
  const agreeCount = signals.filter(s => s.agrees).length;
  const totalCount = signals.length;
  const agreementRatio = totalCount > 0 ? agreeCount / totalCount : 0;

  const getAgreementStatus = () => {
    if (agreementRatio >= 0.75) return { label: 'Sources Agree', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: CheckCircle };
    if (agreementRatio >= 0.5) return { label: 'Mixed Signals', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: AlertTriangle };
    return { label: 'Sources Diverge', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: AlertTriangle };
  };

  const status = getAgreementStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-2" data-testid="source-agreement">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 group"
        data-testid="button-source-agreement"
      >
        <Badge variant="outline" className={`${status.bg} ${status.color} ${status.border} text-xs gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {status.label} ({agreeCount}/{totalCount})
        </Badge>
        {expanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" />}
      </button>
      {expanded && (
        <div className="space-y-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200" data-testid="source-agreement-details">
          {signals.map((signal, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {signal.agrees ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="text-gray-300 font-medium">{signal.label}: </span>
                <span className="text-gray-500">{signal.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DataDisclaimerProps {
  variant?: 'inline' | 'section';
}

export function DataDisclaimer({ variant = 'inline' }: DataDisclaimerProps) {
  const [expanded, setExpanded] = useState(false);

  if (variant === 'inline') {
    return (
      <div className="text-xs text-gray-600 flex items-start gap-1.5 leading-relaxed" data-testid="data-disclaimer-inline">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>
          Forecasts are estimates based on historical trends and may not reflect future market conditions. 
          Always consult a local real estate professional before making investment decisions.
        </span>
      </div>
    );
  }

  return (
    <div className="border border-gray-700/30 rounded-md" data-testid="data-disclaimer-section">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        data-testid="button-about-data"
      >
        <span className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          About This Data — Sources, Accuracy & Limitations
        </span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200" data-testid="about-data-details">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Data Sources & Confidence Levels</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: 'census', label: 'Demographics & Growth' },
                { key: 'fred', label: 'Mortgage Rates' },
                { key: 'zillow_home', label: 'Home Value Forecasts' },
                { key: 'zillow_rent', label: 'Rent Forecasts' },
                { key: 'zillow_velocity', label: 'Market Velocity' },
                { key: 'rentcast', label: 'Rental Estimates' },
                { key: 'bls', label: 'Employment Data' },
                { key: 'fbi', label: 'Crime Statistics' },
                { key: 'osm', label: 'Walkability Data' },
                { key: 'fema', label: 'Flood Zones' },
              ].map(({ key, label }) => {
                const source = SOURCE_REGISTRY[key];
                if (!source) return null;
                const conf = confidenceConfig[source.confidence];
                const ConfIcon = conf.icon;
                return (
                  <div key={key} className="flex items-center gap-2 text-xs py-1.5">
                    <ConfIcon className={`w-3.5 h-3.5 ${conf.color} flex-shrink-0`} />
                    <span className="text-gray-400">{label}</span>
                    <span className={`ml-auto ${conf.color} font-medium`}>{conf.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-700/30">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Important Limitations</h4>
            <ul className="space-y-1.5 text-xs text-gray-500 leading-relaxed">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500/70" />
                <span><strong className="text-gray-400">Forecasts are not guarantees.</strong> All projections are based on historical patterns that may not continue. Local market conditions, policy changes, and economic events can cause actual outcomes to differ significantly.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500/70" />
                <span><strong className="text-gray-400">Zillow estimates have known accuracy limits.</strong> Zestimate valuations carry a median error of 2-7% nationwide. In markets with fewer transactions, error margins can be higher.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500/70" />
                <span><strong className="text-gray-400">Regional vs. property-level data.</strong> Many data sources provide ZIP code or metro-level averages. Individual properties may deviate based on condition, features, and micro-location.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-600" />
                <span><strong className="text-gray-400">Data freshness.</strong> Some government data has a 1-2 year lag. Zillow data is refreshed monthly. Market conditions may have changed since the last data update.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-gray-700/30">
            <p className="text-xs text-gray-600 leading-relaxed">
              ScoreCasa aggregates data from multiple authoritative sources to provide informed estimates, not financial advice. 
              We show confidence levels and accuracy ranges so you can weigh each data point appropriately. 
              Always verify key data points independently and consult qualified real estate and financial professionals before making investment decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function buildCrossValidationSignals(
  forecastData?: { homeValueForecast?: { forecastGrowth: number } | null; marketVelocity?: { marketSpeed: string; saleToListRatio: number } | null } | null,
  affordabilityData?: { marketTimingSignal?: { signal: string } | null; overvaluation?: { overvaluationPercent: number } | null } | null,
  demographics?: { populationGrowth5yr?: number | null; incomeGrowth5yr?: number | null } | null
): { label: string; agrees: boolean; detail: string }[] {
  if (!forecastData && !affordabilityData && !demographics) return [];
  
  const signals: { label: string; agrees: boolean; detail: string }[] = [];
  const hvGrowth = forecastData?.homeValueForecast?.forecastGrowth;
  const isGrowthPositive = hvGrowth != null && hvGrowth > 0;

  if (demographics?.populationGrowth5yr != null) {
    const popGrow = demographics.populationGrowth5yr > 0;
    signals.push({
      label: 'Population Trend (Census)',
      agrees: popGrow === isGrowthPositive,
      detail: popGrow 
        ? `Growing population (+${demographics.populationGrowth5yr.toFixed(1)}%) supports demand — aligns with ${isGrowthPositive ? 'growth' : 'the'} forecast`
        : `Declining population (${demographics.populationGrowth5yr.toFixed(1)}%) may weaken demand — ${isGrowthPositive ? 'diverges from growth forecast' : 'consistent with weak outlook'}`
    });
  }

  if (demographics?.incomeGrowth5yr != null) {
    const incGrow = demographics.incomeGrowth5yr > 2;
    signals.push({
      label: 'Income Growth (Census)',
      agrees: incGrow === isGrowthPositive,
      detail: incGrow
        ? `Rising incomes (+${demographics.incomeGrowth5yr.toFixed(1)}%) increase buying power — ${isGrowthPositive ? 'corroborates' : 'contrasts with'} forecast`
        : `Flat/low income growth (${demographics.incomeGrowth5yr.toFixed(1)}%) limits buying power — ${isGrowthPositive ? 'contrasts with growth forecast' : 'consistent with outlook'}`
    });
  }

  if (forecastData?.marketVelocity) {
    const fastMarket = forecastData.marketVelocity.marketSpeed === 'fast' || forecastData.marketVelocity.marketSpeed === 'moderate';
    signals.push({
      label: 'Market Velocity (Zillow)',
      agrees: fastMarket === isGrowthPositive,
      detail: fastMarket
        ? `Active market (${forecastData.marketVelocity.marketSpeed} pace) signals strong demand — ${isGrowthPositive ? 'supports' : 'contrasts with'} forecast`
        : `Slow market pace may indicate cooling demand — ${isGrowthPositive ? 'diverges from growth forecast' : 'consistent with outlook'}`
    });
  }

  if (forecastData?.marketVelocity?.saleToListRatio != null) {
    const sellersFavor = forecastData.marketVelocity.saleToListRatio >= 0.97;
    signals.push({
      label: 'Sale-to-List Ratio (Zillow)',
      agrees: sellersFavor === isGrowthPositive,
      detail: sellersFavor
        ? `Ratio of ${(forecastData.marketVelocity.saleToListRatio * 100).toFixed(1)}% shows competitive buying — ${isGrowthPositive ? 'supports' : 'contrasts with'} forecast`
        : `Low ratio (${(forecastData.marketVelocity.saleToListRatio * 100).toFixed(1)}%) suggests buyers have leverage — ${isGrowthPositive ? 'contrasts with growth' : 'consistent with weak'} outlook`
    });
  }

  if (affordabilityData?.overvaluation) {
    const notOvervalued = affordabilityData.overvaluation.overvaluationPercent < 20;
    signals.push({
      label: 'Valuation Check (Census/FRED)',
      agrees: notOvervalued === isGrowthPositive,
      detail: notOvervalued
        ? `Prices within historical norms (${affordabilityData.overvaluation.overvaluationPercent.toFixed(0)}% vs avg) — ${isGrowthPositive ? 'room for growth' : 'may be near bottom'}`
        : `Elevated valuations (${affordabilityData.overvaluation.overvaluationPercent.toFixed(0)}% above avg) — ${isGrowthPositive ? 'growth may be limited' : 'correction possible'}`
    });
  }

  return signals;
}
