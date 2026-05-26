import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, TrendingUp, Users, GraduationCap, Shield, MapPin, DollarSign, Droplets, BarChart3, Target, Clock } from 'lucide-react';
import type { PropertyAnalysisResult } from '@shared/schema';

interface PropertyComparisonProps {
  properties: PropertyAnalysisResult[];
  onBack: () => void;
}

type MetricRow = {
  label: string;
  icon: React.ElementType;
  category: string;
  getValue: (p: PropertyAnalysisResult) => number | string | null;
  format: (v: number | string | null) => string;
  higherIsBetter: boolean;
  isNumeric: boolean;
};

const metricRows: MetricRow[] = [
  {
    label: 'Overall Score',
    icon: BarChart3,
    category: 'Investment Score',
    getValue: (p) => p.score,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Investment Grade',
    icon: Target,
    category: 'Investment Score',
    getValue: (p) => p.affordabilityData?.investmentGrade?.grade ?? null,
    format: (v) => v != null ? String(v) : 'N/A',
    higherIsBetter: false,
    isNumeric: false,
  },
  {
    label: 'Market Timing',
    icon: Clock,
    category: 'Investment Score',
    getValue: (p) => p.affordabilityData?.marketTimingSignal?.signal ?? null,
    format: (v) => {
      if (v === 'buy') return 'Buy Signal';
      if (v === 'wait') return 'Wait Signal';
      if (v === 'caution') return 'Caution';
      return 'N/A';
    },
    higherIsBetter: false,
    isNumeric: false,
  },
  {
    label: 'Estimated Price',
    icon: DollarSign,
    category: 'Pricing',
    getValue: (p) => p.estimatedPropertyPrice?.price ?? null,
    format: (v) => v != null ? `$${Number(v).toLocaleString()}` : 'N/A',
    higherIsBetter: false,
    isNumeric: true,
  },
  {
    label: 'Median Home Value',
    icon: DollarSign,
    category: 'Pricing',
    getValue: (p) => p.demographics?.medianHomeValue ?? p.marketData?.medianHomeValue ?? null,
    format: (v) => v != null ? `$${Number(v).toLocaleString()}` : 'N/A',
    higherIsBetter: false,
    isNumeric: true,
  },
  {
    label: 'Cap Rate',
    icon: TrendingUp,
    category: 'Returns',
    getValue: (p) => {
      const rent = p.demographics?.medianRent;
      const price = p.estimatedPropertyPrice?.price || p.demographics?.medianHomeValue;
      if (!rent || !price || price === 0) return null;
      const annualRent = rent * 12;
      const expenses = annualRent * 0.40;
      const noi = annualRent - expenses;
      return Number(((noi / price) * 100).toFixed(2));
    },
    format: (v) => v != null ? `${Number(v).toFixed(2)}%` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Cash-on-Cash Return',
    icon: DollarSign,
    category: 'Returns',
    getValue: (p) => {
      const rent = p.demographics?.medianRent;
      const price = p.estimatedPropertyPrice?.price || p.demographics?.medianHomeValue;
      if (!rent || !price || price === 0) return null;
      const downPayment = price * 0.25;
      const closingCosts = price * 0.03;
      const totalCashInvested = downPayment + closingCosts;
      const loanAmount = price * 0.75;
      const monthlyRate = 0.07 / 12;
      const numPayments = 360;
      const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      const annualRent = rent * 12;
      const expenses = annualRent * 0.40;
      const annualCashFlow = annualRent - expenses - (monthlyMortgage * 12);
      return Number(((annualCashFlow / totalCashInvested) * 100).toFixed(2));
    },
    format: (v) => v != null ? `${Number(v).toFixed(2)}%` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Monthly Cash Flow',
    icon: DollarSign,
    category: 'Returns',
    getValue: (p) => {
      const rent = p.demographics?.medianRent;
      const price = p.estimatedPropertyPrice?.price || p.demographics?.medianHomeValue;
      if (!rent || !price || price === 0) return null;
      const loanAmount = price * 0.75;
      const monthlyRate = 0.07 / 12;
      const numPayments = 360;
      const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      const monthlyExpenses = (rent * 0.40);
      return Math.round(rent - monthlyExpenses - monthlyMortgage);
    },
    format: (v) => {
      if (v == null) return 'N/A';
      const num = Number(v);
      return `${num >= 0 ? '+' : ''}$${num.toLocaleString()}/mo`;
    },
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Rent-to-Price Ratio',
    icon: DollarSign,
    category: 'Returns',
    getValue: (p) => {
      const rent = p.demographics?.medianRent;
      const price = p.estimatedPropertyPrice?.price || p.demographics?.medianHomeValue;
      if (!rent || !price || price === 0) return null;
      return Number(((rent / price) * 100).toFixed(3));
    },
    format: (v) => v != null ? `${Number(v).toFixed(2)}%` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Market Strength',
    icon: TrendingUp,
    category: 'Scores',
    getValue: (p) => p.scoreBreakdown?.[0]?.score ?? null,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Demographics',
    icon: Users,
    category: 'Scores',
    getValue: (p) => p.scoreBreakdown?.[1]?.score ?? null,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'School Quality',
    icon: GraduationCap,
    category: 'Scores',
    getValue: (p) => p.scoreBreakdown?.[2]?.score ?? null,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Safety',
    icon: Shield,
    category: 'Scores',
    getValue: (p) => p.scoreBreakdown?.[3]?.score ?? null,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Walkability',
    icon: MapPin,
    category: 'Scores',
    getValue: (p) => p.scoreBreakdown?.[4]?.score ?? null,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Rental Potential',
    icon: DollarSign,
    category: 'Scores',
    getValue: (p) => p.scoreBreakdown?.[5]?.score ?? null,
    format: (v) => v != null ? `${Number(v).toFixed(1)} / 10` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Median Rent',
    icon: DollarSign,
    category: 'Rental',
    getValue: (p) => p.demographics?.medianRent ?? null,
    format: (v) => v != null ? `$${Number(v).toLocaleString()}/mo` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: '1-Year Home Forecast',
    icon: TrendingUp,
    category: 'Forecasts',
    getValue: (p) => p.forecastData?.homeValueForecast?.forecastGrowth ?? null,
    format: (v) => v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: '1-Year Rent Forecast',
    icon: TrendingUp,
    category: 'Forecasts',
    getValue: (p) => p.forecastData?.rentForecast?.forecastGrowth ?? null,
    format: (v) => v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%` : 'N/A',
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    label: 'Flood Risk',
    icon: Droplets,
    category: 'Risk',
    getValue: (p) => p.floodRisk?.riskLevel ?? null,
    format: (v) => {
      if (v == null) return 'N/A';
      const labels: Record<string, string> = { minimal: 'Minimal', low: 'Low', moderate: 'Moderate', high: 'High', extreme: 'Extreme' };
      return labels[String(v)] || String(v);
    },
    higherIsBetter: false,
    isNumeric: false,
  },
  {
    label: 'Flood Insurance',
    icon: Droplets,
    category: 'Risk',
    getValue: (p) => p.floodRisk?.estimatedInsurance?.annual ?? null,
    format: (v) => v != null ? `$${Number(v).toLocaleString()}/yr` : 'N/A',
    higherIsBetter: false,
    isNumeric: true,
  },
  {
    label: 'Overvaluation',
    icon: TrendingUp,
    category: 'Risk',
    getValue: (p) => p.affordabilityData?.overvaluation?.overvaluationPercent ?? null,
    format: (v) => v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%` : 'N/A',
    higherIsBetter: false,
    isNumeric: true,
  },
];

function getBestIndex(values: (number | string | null)[], higherIsBetter: boolean, isNumeric: boolean): number {
  if (!isNumeric) {
    if (values.every(v => v == null)) return -1;
    const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
    const riskOrder = ['minimal', 'low', 'moderate', 'high', 'extreme'];
    const signalOrder = ['buy', 'caution', 'wait'];

    const firstNonNull = values.find(v => v != null);
    if (typeof firstNonNull === 'string' && gradeOrder.includes(firstNonNull)) {
      let bestIdx = -1;
      let bestRank = 999;
      values.forEach((v, i) => {
        if (v == null) return;
        const rank = gradeOrder.indexOf(String(v));
        if (rank !== -1 && rank < bestRank) { bestRank = rank; bestIdx = i; }
      });
      return bestIdx;
    }
    if (typeof firstNonNull === 'string' && riskOrder.includes(firstNonNull)) {
      let bestIdx = -1;
      let bestRank = 999;
      values.forEach((v, i) => {
        if (v == null) return;
        const rank = riskOrder.indexOf(String(v));
        if (rank !== -1 && rank < bestRank) { bestRank = rank; bestIdx = i; }
      });
      return bestIdx;
    }
    if (typeof firstNonNull === 'string' && signalOrder.includes(firstNonNull)) {
      let bestIdx = -1;
      let bestRank = 999;
      values.forEach((v, i) => {
        if (v == null) return;
        const rank = signalOrder.indexOf(String(v));
        if (rank !== -1 && rank < bestRank) { bestRank = rank; bestIdx = i; }
      });
      return bestIdx;
    }
    return -1;
  }

  const numericValues = values.map(v => v != null ? Number(v) : null);
  const validValues = numericValues.filter((v): v is number => v != null);
  if (validValues.length === 0) return -1;
  const allSame = validValues.every(v => v === validValues[0]);
  if (allSame) return -1;

  const bestVal = higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
  return numericValues.indexOf(bestVal);
}

function shortenAddress(address: string): string {
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  return address.length > 30 ? address.substring(0, 30) + '...' : address;
}

export default function PropertyComparison({ properties, onBack }: PropertyComparisonProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(metricRows.map(r => r.category)));

  const winsCount = properties.map(() => 0);
  metricRows.forEach(metric => {
    const values = properties.map(p => metric.getValue(p));
    const bestIdx = getBestIndex(values, metric.higherIsBetter, metric.isNumeric);
    if (bestIdx >= 0) winsCount[bestIdx]++;
  });
  const maxWins = Math.max(...winsCount);
  const overallBestIdx = maxWins > 0 ? winsCount.indexOf(maxWins) : -1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400" data-testid="button-back-compare">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Button>
        <h2 className="text-xl font-semibold text-white">Side-by-Side Comparison</h2>
        <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
          {properties.length} Properties
        </Badge>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${properties.length}, 1fr)` }}>
        {properties.map((p, i) => (
          <Card key={i} className={`glass-card ${i === overallBestIdx ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-gray-700/50'}`} data-testid={`compare-property-header-${i}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                {i === overallBestIdx && (
                  <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate" title={p.address} data-testid={`compare-address-${i}`}>
                    {shortenAddress(p.address)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">ZIP: {p.zipCode}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold text-cyan-400" data-testid={`compare-score-${i}`}>{p.score != null ? p.score.toFixed(1) : 'N/A'}</span>
                    {p.score != null && <span className="text-xs text-gray-500">/ 10</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Wins {winsCount[i]} of {metricRows.length} metrics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.map(category => {
        const categoryMetrics = metricRows.filter(r => r.category === category);
        const isExpanded = expandedCategory === null || expandedCategory === category;

        return (
          <Card key={category} className="glass-card border-gray-700/50">
            <CardHeader className="cursor-pointer py-3 px-4" onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}>
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-gray-400 flex items-center justify-between gap-2">
                {category}
                <span className="text-xs text-gray-600">{isExpanded ? 'collapse' : 'expand'}</span>
              </CardTitle>
            </CardHeader>
            {isExpanded && (
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-0">
                  {categoryMetrics.map((metric, mIdx) => {
                    const values = properties.map(p => metric.getValue(p));
                    const bestIdx = getBestIndex(values, metric.higherIsBetter, metric.isNumeric);

                    return (
                      <div
                        key={metric.label}
                        className={`grid items-center gap-3 py-2.5 ${mIdx > 0 ? 'border-t border-gray-800/50' : ''}`}
                        style={{ gridTemplateColumns: `160px repeat(${properties.length}, 1fr)` }}
                        data-testid={`compare-row-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-2">
                          <metric.icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-400 truncate">{metric.label}</span>
                        </div>
                        {values.map((v, pi) => (
                          <div
                            key={pi}
                            className={`text-sm font-medium text-center rounded-md py-1.5 px-2 ${
                              bestIdx === pi
                                ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20'
                                : 'text-gray-300'
                            }`}
                            data-testid={`compare-value-${metric.label.toLowerCase().replace(/\s+/g, '-')}-${pi}`}
                          >
                            {metric.format(v)}
                            {bestIdx === pi && (
                              <Trophy className="w-3 h-3 text-amber-400 inline ml-1.5" />
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="text-center pt-4">
        <Button variant="ghost" onClick={onBack} className="text-gray-400" data-testid="button-back-compare-bottom">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}