import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Home, 
  Building2, 
  Briefcase, 
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Percent,
  BarChart3,
  Target,
  Scale,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
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
import type { ComprehensiveAffordabilityData, RateDataPoint } from '@shared/schema';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface AffordabilityMetricsProps {
  data: ComprehensiveAffordabilityData | null;
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'B': return 'bg-lime-500/20 text-lime-400 border-lime-500/30';
    case 'C': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'D': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'F': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getSignalIcon = (signal: 'buy' | 'wait' | 'caution') => {
  switch (signal) {
    case 'buy': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    case 'wait': return <Clock className="w-5 h-5 text-yellow-400" />;
    case 'caution': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
  }
};

const getSignalLabel = (signal: 'buy' | 'wait' | 'caution') => {
  switch (signal) {
    case 'buy': return 'Favorable Conditions';
    case 'wait': return 'Monitor Market';
    case 'caution': return 'Proceed With Caution';
  }
};

const TrendIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Minus className="w-3 h-3" />
        <span className="text-xs">Stable</span>
      </div>
    );
  }
  
  if (isPositive) {
    return (
      <div className="flex items-center gap-1 text-emerald-400">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs">+{Math.abs(value).toFixed(2)}%</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-red-400">
      <TrendingDown className="w-3 h-3" />
      <span className="text-xs">{value.toFixed(2)}%</span>
    </div>
  );
};

export default function AffordabilityMetrics({ data }: AffordabilityMetricsProps) {
  const [timingExpanded, setTimingExpanded] = useState(false);
  if (!data) {
    return (
      <Card className="p-6 glass-card border-gray-700/50" data-testid="card-affordability-unavailable">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
            <DollarSign className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Affordability Analysis</h3>
            <p className="text-sm text-gray-400">Data unavailable</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Detailed affordability metrics could not be calculated for this area.
        </p>
      </Card>
    );
  }

  const { 
    mortgageTrends, 
    overvaluation, 
    buyVsRent, 
    propertyTax, 
    affordabilityScore,
    fairMarketRent,
    buildingPermits,
    employment,
    marketTimingSignal,
    investmentGrade 
  } = data;

  return (
    <div className="space-y-6" data-testid="affordability-metrics">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 glass-card border-gray-700/50" data-testid="card-investment-grade">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-300">Investment Grade</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Overall investment rating based on affordability, valuation, employment, and buy vs rent analysis.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`text-2xl font-bold px-4 py-2 ${getGradeColor(investmentGrade.grade)}`}>
              {investmentGrade.grade}
            </Badge>
            <span className="text-xs text-gray-400">{investmentGrade.score}/100 pts</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{investmentGrade.summary}</p>
        </Card>

        <Card className="p-4 glass-card border-gray-700/50" data-testid="card-market-timing">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-300">Market Timing</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Signal based on current market conditions including prices, rates, and trends. Click "Show details" for the full mathematical breakdown.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {getSignalIcon(marketTimingSignal.signal)}
            <span className="text-lg font-semibold text-white">{getSignalLabel(marketTimingSignal.signal)}</span>
          </div>
          {marketTimingSignal.buyScore !== undefined && marketTimingSignal.maxScore !== undefined && marketTimingSignal.maxScore > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400" data-testid="text-buy-score">
                Buy Score: {marketTimingSignal.buyScore} / {marketTimingSignal.maxScore}
              </span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${marketTimingSignal.buyScore >= 3 ? 'bg-emerald-500' : marketTimingSignal.buyScore >= 1 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(0, (marketTimingSignal.buyScore / marketTimingSignal.maxScore) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-400">
            {marketTimingSignal.confidence}% confidence
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {marketTimingSignal.factors.slice(0, 3).map((factor, idx) => (
              <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0.5">
                {factor}
              </Badge>
            ))}
          </div>
          {marketTimingSignal.reasoning && marketTimingSignal.reasoning.length > 0 && (
            <>
              <button 
                onClick={() => setTimingExpanded(!timingExpanded)}
                className="mt-3 text-xs text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                data-testid="button-timing-reasoning"
              >
                {timingExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {timingExpanded ? 'Hide' : 'Show'} scoring details
              </button>
              {timingExpanded && (
                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200" data-testid="timing-reasoning-details">
                  {marketTimingSignal.reasoning.map((r, idx) => (
                    <div key={idx} className="bg-gray-800/50 rounded-md p-3 border border-gray-700/30">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-gray-200">{r.factor}</span>
                        <span className={`text-xs font-mono ${r.impact.includes('+') ? 'text-emerald-400' : r.impact.includes('-') ? 'text-red-400' : 'text-gray-400'}`}>{r.impact}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-mono text-cyan-400">{r.value}</span>
                        <span className="text-gray-600 text-xs">vs</span>
                        <span className="text-xs text-gray-500">{r.benchmark}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{r.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="p-4 glass-card border-gray-700/50" data-testid="card-affordability-score">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-300">Affordability</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>How affordable homes are relative to median household income in this area.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="text-2xl font-bold" 
              style={{ color: affordabilityScore.color }}
            >
              {affordabilityScore.score}/10
            </span>
            <Badge 
              className="text-xs" 
              style={{ backgroundColor: affordabilityScore.color + '20', color: affordabilityScore.color }}
            >
              {affordabilityScore.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {affordabilityScore.monthlyPaymentToIncome.toFixed(0)}% of income for mortgage
          </p>
        </Card>

        <Card className="p-4 glass-card border-gray-700/50" data-testid="card-overvaluation">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-300">Valuation</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>How current prices compare to historical price-to-income ratios.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="text-lg font-bold" 
              style={{ color: overvaluation.overvaluationColor }}
            >
              {overvaluation.overvaluationPercent > 0 ? '+' : ''}{overvaluation.overvaluationPercent.toFixed(0)}%
            </span>
            <span className="text-xs text-gray-400">
              {overvaluation.overvaluationLabel.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Value/Income: {overvaluation.valueToIncomeRatio.toFixed(1)}x (avg: {overvaluation.historicalAverageRatio}x)
          </p>
        </Card>
      </div>

      <Accordion type="single" collapsible className="space-y-4" defaultValue="tier1">
        <AccordionItem value="tier1" className="border-0">
          <AccordionTrigger className="bg-gray-800/50 hover:bg-gray-800 px-4 py-3 rounded-lg text-white">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span>Affordability & Cost Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 glass-card border-gray-700/50 lg:col-span-2" data-testid="card-mortgage-trends">
                <div className="flex items-center gap-2 mb-3">
                  <Percent className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-white">Mortgage Rate Trends</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Current Rate</span>
                      <span className="text-lg font-semibold text-white">{mortgageTrends.currentRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Week Over Week</span>
                      <TrendIndicator value={mortgageTrends.weekOverWeekChange} inverted />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Year Over Year</span>
                      <TrendIndicator value={mortgageTrends.yearOverYearChange} inverted />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Trend</span>
                      <Badge variant="outline" className="capitalize">{mortgageTrends.trendDirection}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Historical Avg</span>
                      <span className="text-white">{mortgageTrends.historicalAverage}%</span>
                    </div>
                  </div>
                  {mortgageTrends.historicalRates && mortgageTrends.historicalRates.length > 2 && (
                    <div className="h-32" data-testid="chart-mortgage-rates">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mortgageTrends.historicalRates}>
                          <defs>
                            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString('en-US', { month: 'short' });
                            }}
                            axisLine={{ stroke: '#374151' }}
                            tickLine={false}
                          />
                          <YAxis 
                            domain={['dataMin - 0.2', 'dataMax + 0.2']}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                          />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#9ca3af' }}
                            formatter={(value: number) => [`${value}%`, 'Rate']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            fill="url(#rateGradient)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2">
                  {mortgageTrends.rateOutlook}
                </p>
              </Card>

              <Card className="p-4 glass-card border-gray-700/50" data-testid="card-buy-vs-rent">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-white">Buy vs Rent</span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {buyVsRent.basis === 'property' ? 'This home' : 'ZIP average'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Monthly Mortgage</span>
                    <span className="text-white">${buyVsRent.monthlyMortgagePayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Monthly Rent</span>
                    <span className="text-white">${buyVsRent.monthlyRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Differential</span>
                    <span className={buyVsRent.buyVsRentDifferential > 0 ? 'text-orange-400' : 'text-emerald-400'}>
                      {buyVsRent.buyVsRentDifferential > 0 ? '+' : ''}{buyVsRent.buyVsRentDifferential.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Recommendation</span>
                    <Badge className={
                      buyVsRent.recommendation === 'buy' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : buyVsRent.recommendation === 'rent' 
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }>
                      {buyVsRent.recommendation.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2">
                  {buyVsRent.breakEvenYears > 0
                    ? `Buying beats renting after ~${buyVsRent.breakEvenYears} year${buyVsRent.breakEvenYears === 1 ? '' : 's'}`
                    : 'Buying does not beat renting within 30 years'}
                  {buyVsRent.homeValueUsed ? (
                    <span className="block mt-1 text-gray-500">
                      Price ${buyVsRent.homeValueUsed.toLocaleString()} ({buyVsRent.homeValueSource}), 20% down.
                      Rent: {buyVsRent.rentSource}.
                    </span>
                  ) : null}
                </p>
              </Card>

              <Card className="p-4 glass-card border-gray-700/50" data-testid="card-property-tax">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white">Property Tax</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Annual Tax</span>
                    <span className="text-white">${propertyTax.estimatedAnnualTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Monthly</span>
                    <span className="text-white">${propertyTax.estimatedMonthlyTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Effective Rate</span>
                    <span className="text-white">{propertyTax.effectiveTaxRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Tax Burden</span>
                    <Badge variant="outline" className={
                      propertyTax.taxBurdenLevel === 'high' 
                        ? 'text-red-400 border-red-400/30' 
                        : propertyTax.taxBurdenLevel === 'low' 
                          ? 'text-emerald-400 border-emerald-400/30'
                          : 'text-yellow-400 border-yellow-400/30'
                    }>
                      {propertyTax.taxBurdenLevel}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2">
                  {propertyTax.vsStateAverage}
                  {propertyTax.homeValueUsed ? (
                    <span className="block mt-1 text-gray-500">
                      On ${propertyTax.homeValueUsed.toLocaleString()} at {propertyTax.rateSource === 'Local rate (Zillow)' ? 'the local rate (Zillow)' : 'the state average rate'}.
                    </span>
                  ) : null}
                </p>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tier2" className="border-0">
          <AccordionTrigger className="bg-gray-800/50 hover:bg-gray-800 px-4 py-3 rounded-lg text-white">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <span>Market & Economic Indicators</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-4 glass-card border-gray-700/50" data-testid="card-employment">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-white">Job Market ({employment.stateName})</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Unemployment</span>
                    <span className="text-white">{employment.unemploymentRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">vs National</span>
                    <span className={employment.vsNationalUnemployment < 0 ? 'text-emerald-400' : 'text-orange-400'}>
                      {employment.vsNationalUnemployment > 0 ? '+' : ''}{employment.vsNationalUnemployment.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Job Market</span>
                    <Badge className={
                      employment.jobMarketStrength === 'strong'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : employment.jobMarketStrength === 'weak'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                    }>
                      {employment.jobMarketStrength}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {employment.topIndustries.map((industry, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">{employment.economicOutlook}</p>
              </Card>

              <Card className="p-4 glass-card border-gray-700/50" data-testid="card-building-permits">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-white">Construction Activity</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Units</span>
                    <span className="text-white">{buildingPermits.totalUnits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">YoY Change</span>
                    <TrendIndicator value={buildingPermits.yearOverYearChange} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Permit Trend</span>
                    <Badge variant="outline" className="capitalize">{buildingPermits.permitTrend}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Supply Outlook</span>
                    <Badge className={
                      buildingPermits.supplyOutlook === 'expanding'
                        ? 'bg-blue-500/20 text-blue-400'
                        : buildingPermits.supplyOutlook === 'contracting'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }>
                      {buildingPermits.supplyOutlook}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2">
                  {buildingPermits.insight}
                </p>
              </Card>

              <Card className="p-4 glass-card border-gray-700/50" data-testid="card-fair-market-rent">
                <div className="flex items-center gap-2 mb-3">
                  <PiggyBank className="w-4 h-4 text-pink-400" />
                  <span className="font-medium text-white">Section 8 / FMR</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">2BR FMR</span>
                    <span className="text-white">${fairMarketRent.fmr.twoBedroom.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Market Rent</span>
                    <span className="text-white">${fairMarketRent.marketRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">FMR vs Market</span>
                    <span className={fairMarketRent.fmrVsMarket >= 0 ? 'text-emerald-400' : 'text-orange-400'}>
                      {fairMarketRent.fmrVsMarket > 0 ? '+' : ''}{fairMarketRent.fmrVsMarket.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Section 8 Viable</span>
                    {fairMarketRent.section8Viable ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 border-t border-gray-700 pt-2">
                  {fairMarketRent.rentalStrategyRecommendation}
                </p>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        <span>Data sources:</span>
        {data.dataCompleteness.dataSources.map((source, idx) => (
          <Badge key={idx} variant="outline" className="text-xs text-gray-500 border-gray-600">
            {source}
          </Badge>
        ))}
      </div>
    </div>
  );
}
