import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Users, DollarSign, Home, Timer, BarChart3, ShieldCheck, AlertTriangle } from "lucide-react";
import { ConfidenceBadge, ForecastRange, SourceAgreement, DataDisclaimer, buildCrossValidationSignals } from '@/components/DataConfidence';
import type { ForecastDisplayData, ComprehensiveAffordabilityData, GrowthData } from "@shared/schema";

interface AppreciationOutlookProps {
  forecastData?: ForecastDisplayData | null;
  affordabilityData?: ComprehensiveAffordabilityData | null;
  demographics?: GrowthData | null;
  medianHomeValue?: number;
  mode?: 'homebuyer' | 'investor';
}

type Verdict = 'strong_growth' | 'moderate_growth' | 'stable' | 'moderate_decline' | 'decline';

interface OutlookResult {
  verdict: Verdict;
  label: string;
  shortAnswer: string;
  confidence: number;
  signals: { label: string; value: string; positive: boolean; icon: typeof TrendingUp }[];
}

function computeOutlook(props: AppreciationOutlookProps): OutlookResult {
  const { forecastData, affordabilityData, demographics } = props;
  let score = 0;
  let factors = 0;
  const signals: OutlookResult['signals'] = [];

  const hvGrowth = forecastData?.homeValueForecast?.forecastGrowth;
  if (hvGrowth != null) {
    const weight = 30;
    if (hvGrowth >= 5) score += weight;
    else if (hvGrowth >= 2) score += weight * 0.7;
    else if (hvGrowth >= 0) score += weight * 0.4;
    else if (hvGrowth >= -2) score += weight * 0.1;
    else score -= weight * 0.3;
    factors += weight;
    signals.push({
      label: props.mode === 'homebuyer' ? 'Price Trend (1yr)' : '1-Year Value Forecast',
      value: `${hvGrowth >= 0 ? '+' : ''}${hvGrowth.toFixed(1)}%`,
      positive: hvGrowth >= 0,
      icon: TrendingUp,
    });
  }

  const popGrowth = demographics?.populationGrowth5yr;
  if (popGrowth != null) {
    const weight = 15;
    if (popGrowth >= 5) score += weight;
    else if (popGrowth >= 2) score += weight * 0.7;
    else if (popGrowth >= 0) score += weight * 0.4;
    else score -= weight * 0.2;
    factors += weight;
    signals.push({
      label: 'Population Growth (5yr)',
      value: `${popGrowth >= 0 ? '+' : ''}${popGrowth.toFixed(1)}%`,
      positive: popGrowth >= 0,
      icon: Users,
    });
  }

  const incomeGrowth = demographics?.incomeGrowth5yr;
  if (incomeGrowth != null) {
    const weight = 15;
    if (incomeGrowth >= 10) score += weight;
    else if (incomeGrowth >= 5) score += weight * 0.7;
    else if (incomeGrowth >= 0) score += weight * 0.4;
    else score -= weight * 0.2;
    factors += weight;
    signals.push({
      label: 'Income Growth (5yr)',
      value: `${incomeGrowth >= 0 ? '+' : ''}${incomeGrowth.toFixed(1)}%`,
      positive: incomeGrowth >= 0,
      icon: DollarSign,
    });
  }

  const housingGrowth = demographics?.housingGrowth5yr;
  if (housingGrowth != null) {
    const weight = 10;
    if (housingGrowth >= 5) score += weight;
    else if (housingGrowth >= 2) score += weight * 0.6;
    else if (housingGrowth >= 0) score += weight * 0.3;
    else score -= weight * 0.2;
    factors += weight;
    signals.push({
      label: 'Housing Growth (5yr)',
      value: `${housingGrowth >= 0 ? '+' : ''}${housingGrowth.toFixed(1)}%`,
      positive: housingGrowth >= 0,
      icon: Home,
    });
  }

  const velocity = forecastData?.marketVelocity;
  if (velocity) {
    const weight = 15;
    if (velocity.marketSpeed === 'fast') score += weight;
    else if (velocity.marketSpeed === 'moderate') score += weight * 0.5;
    else score += weight * 0.1;
    factors += weight;
    signals.push({
      label: props.mode === 'homebuyer' ? 'Competition Level' : 'Market Speed',
      value: `${velocity.daysToPending} days to pending`,
      positive: velocity.marketSpeed === 'fast' || velocity.marketSpeed === 'moderate',
      icon: Timer,
    });

    if (velocity.saleToListRatio) {
      const weight2 = 10;
      const ratio = velocity.saleToListRatio;
      if (ratio >= 1.0) score += weight2;
      else if (ratio >= 0.97) score += weight2 * 0.6;
      else score += weight2 * 0.2;
      factors += weight2;
      signals.push({
        label: props.mode === 'homebuyer' ? 'Pricing Power' : 'Sale-to-List Ratio',
        value: `${(ratio * 100).toFixed(1)}%`,
        positive: ratio >= 0.97,
        icon: BarChart3,
      });
    }
  }

  const overval = affordabilityData?.overvaluation;
  if (overval) {
    const weight = 5;
    if (overval.overvaluationLabel === 'undervalued' || overval.overvaluationLabel === 'severely_undervalued') {
      score += weight;
    } else if (overval.overvaluationLabel === 'fairly_valued') {
      score += weight * 0.6;
    } else if (overval.overvaluationLabel === 'overvalued') {
      score += weight * 0.2;
    } else {
      score -= weight * 0.3;
    }
    factors += weight;
  }

  const pct = factors > 0 ? (score / factors) * 100 : 50;
  const confidence = Math.min(100, Math.round((factors / 100) * 100));

  let verdict: Verdict;
  let label: string;
  let shortAnswer: string;

  const isHomebuyer = props.mode === 'homebuyer';

  if (pct >= 80) {
    verdict = 'strong_growth';
    label = isHomebuyer ? 'Excellent Buying Conditions' : 'Strong Appreciation Expected';
    shortAnswer = isHomebuyer
      ? 'Yes — market conditions are highly favorable for a home purchase. Strong fundamentals support a stable, appreciating asset for long-term ownership.'
      : 'Yes — this property is well-positioned for strong value growth based on market forecasts, demographic momentum, and buyer demand.';
  } else if (pct >= 55) {
    verdict = 'moderate_growth';
    label = isHomebuyer ? 'Good Time to Buy' : 'Moderate Growth Likely';
    shortAnswer = isHomebuyer
      ? 'Generally yes — conditions are balanced and this appears to be a reasonable time to buy, with steady value growth expected.'
      : 'Likely yes — multiple indicators point to steady appreciation, though growth may be gradual rather than dramatic.';
  } else if (pct >= 40) {
    verdict = 'stable';
    label = isHomebuyer ? 'Stable Market — Buy with Confidence' : 'Stable / Flat Outlook';
    shortAnswer = isHomebuyer
      ? 'Possibly — the market is stable but not surging. A solid choice if the home meets your lifestyle needs; significant short-term price swings in either direction are unlikely.'
      : 'Possibly — the market shows mixed signals. Value may hold steady but significant appreciation is not guaranteed.';
  } else if (pct >= 20) {
    verdict = 'moderate_decline';
    label = isHomebuyer ? 'Consider Waiting or Negotiating' : 'Caution — Weak Growth';
    shortAnswer = isHomebuyer
      ? 'Cautiously — some indicators suggest a cooling market. Consider negotiating on price and budget for a longer selling timeline if your plans change.'
      : 'Unlikely in the short term — several indicators suggest cooling demand or unfavorable conditions for appreciation.';
  } else {
    verdict = 'decline';
    label = isHomebuyer ? "Buyer's Market — Negotiate Hard" : 'Decline Risk';
    shortAnswer = isHomebuyer
      ? "This market shows signs of softening. As a buyer you have negotiating leverage — but evaluate your long-term plans carefully before committing."
      : 'No — current data signals suggest this market may face depreciation. Proceed with caution.';
  }

  return { verdict, label, shortAnswer, confidence, signals };
}

const verdictConfig: Record<Verdict, { bg: string; border: string; textColor: string; icon: typeof TrendingUp; badgeBg: string }> = {
  strong_growth: { bg: 'from-emerald-500/20 to-emerald-900/10', border: 'border-emerald-500/40', textColor: 'text-emerald-400', icon: TrendingUp, badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  moderate_growth: { bg: 'from-green-500/15 to-green-900/10', border: 'border-green-500/30', textColor: 'text-green-400', icon: ArrowUpRight, badgeBg: 'bg-green-500/20 text-green-300 border-green-500/30' },
  stable: { bg: 'from-yellow-500/15 to-yellow-900/10', border: 'border-yellow-500/30', textColor: 'text-yellow-400', icon: Minus, badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  moderate_decline: { bg: 'from-orange-500/15 to-orange-900/10', border: 'border-orange-500/30', textColor: 'text-orange-400', icon: ArrowDownRight, badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  decline: { bg: 'from-red-500/20 to-red-900/10', border: 'border-red-500/40', textColor: 'text-red-400', icon: TrendingDown, badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

export default function AppreciationOutlook({ forecastData, affordabilityData, demographics, medianHomeValue, mode = 'investor' }: AppreciationOutlookProps) {
  const outlook = computeOutlook({ forecastData, affordabilityData, demographics, medianHomeValue, mode });
  const config = verdictConfig[outlook.verdict];
  const VerdictIcon = config.icon;

  const overvalLabel = affordabilityData?.overvaluation?.overvaluationLabel;
  const overvalPct = affordabilityData?.overvaluation?.overvaluationPercent;
  const timingSignal = affordabilityData?.marketTimingSignal;

  const isHomebuyer = mode === 'homebuyer';

  return (
    <Card className={`overflow-visible bg-gradient-to-br ${config.bg} ${config.border} border`} data-testid="card-appreciation-outlook">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${config.bg} border ${config.border}`}>
                <VerdictIcon className={`w-8 h-8 ${config.textColor}`} data-testid="icon-verdict" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-1">
                  {isHomebuyer ? 'Is This a Good Home to Buy?' : 'Will This Property Appreciate?'}
                </p>
                <h3 className={`text-2xl md:text-3xl font-bold ${config.textColor}`} data-testid="text-verdict-label">
                  {outlook.label}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {timingSignal && (
                <Badge className={`no-default-hover-elevate no-default-active-elevate ${
                  timingSignal.signal === 'buy' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  timingSignal.signal === 'wait' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                  'bg-orange-500/20 text-orange-300 border-orange-500/30'
                }`} data-testid="badge-timing-signal">
                  {timingSignal.signal === 'buy' ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  {timingSignal.signal === 'buy'
                    ? 'Good Time to Buy'
                    : timingSignal.signal === 'wait'
                      ? (isHomebuyer ? 'Price May Be Elevated' : 'Consider Waiting')
                      : 'Proceed with Caution'}
                </Badge>
              )}
              {overvalLabel && (
                <Badge className={`no-default-hover-elevate no-default-active-elevate ${
                  overvalLabel === 'undervalued' || overvalLabel === 'severely_undervalued' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  overvalLabel === 'fairly_valued' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                  'bg-orange-500/20 text-orange-300 border-orange-500/30'
                }`} data-testid="badge-valuation">
                  {overvalLabel === 'undervalued' || overvalLabel === 'severely_undervalued' ? 'Undervalued' :
                   overvalLabel === 'fairly_valued' ? 'Fairly Valued' :
                   overvalLabel === 'overvalued' ? `Overvalued ${overvalPct ? `(${overvalPct.toFixed(0)}%)` : ''}` :
                   `Severely Overvalued ${overvalPct ? `(${overvalPct.toFixed(0)}%)` : ''}`}
                </Badge>
              )}
            </div>
          </div>

          <p className="text-base md:text-lg text-gray-300 leading-relaxed" data-testid="text-verdict-summary">
            {outlook.shortAnswer}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="grid-signals">
            {outlook.signals.map((signal, i) => {
              const SigIcon = signal.icon;
              return (
                <div key={i} className="glass-card rounded-lg p-3 border border-gray-700/40" data-testid={`signal-${i}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <SigIcon className={`w-4 h-4 ${signal.positive ? 'text-emerald-400' : 'text-red-400'}`} />
                    <span className="text-xs text-gray-500 truncate">{signal.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${signal.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {signal.value}
                  </span>
                </div>
              );
            })}
          </div>

          {forecastData?.homeValueForecast && medianHomeValue && (
            <div className="glass-card rounded-lg p-4 border border-gray-700/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Value</p>
                  <p className="text-xl font-bold text-white" data-testid="text-current-value">${medianHomeValue.toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 ${config.textColor}`}>
                  <VerdictIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{forecastData.homeValueForecast.forecastGrowth >= 0 ? '+' : ''}{forecastData.homeValueForecast.forecastGrowth.toFixed(1)}%</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Projected Value (1yr)</p>
                  <p className={`text-xl font-bold ${config.textColor}`} data-testid="text-projected-value">
                    ${forecastData.homeValueForecast.forecastedValue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <ForecastRange value={forecastData.homeValueForecast.forecastedValue} marginPercent={5} format="currency" label="Estimated range" />
              </div>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    outlook.verdict === 'strong_growth' ? 'bg-emerald-500' :
                    outlook.verdict === 'moderate_growth' ? 'bg-green-500' :
                    outlook.verdict === 'stable' ? 'bg-yellow-500' :
                    outlook.verdict === 'moderate_decline' ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, 50 + (forecastData.homeValueForecast.forecastGrowth * 5)))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <ConfidenceBadge sourceKey="zillow_home" compact />
                <p className="text-xs text-gray-500">
                  Based on Zillow Research Data for {forecastData.homeValueForecast.regionName}
                </p>
              </div>
            </div>
          )}

          <SourceAgreement
            signals={buildCrossValidationSignals(forecastData, affordabilityData, demographics)}
          />

          <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-700/30 gap-2 flex-wrap">
            <span>Confidence: {outlook.confidence}% ({outlook.signals.length} data points analyzed)</span>
            <span>Sources: Zillow, Census Bureau, Market Data{isHomebuyer ? ' (buyer perspective)' : ''}</span>
          </div>

          <DataDisclaimer variant="inline" />
        </div>
      </CardContent>
    </Card>
  );
}
