import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Target, TrendingUp, Home, BarChart2 } from 'lucide-react';
import type { ScoreReasoning } from '@shared/schema';

type ScoringMode = 'homebuyer' | 'investor';

interface ScoreBreakdownItem {
  label: string;
  score: number;
  weight: number;
  reasoning?: ScoreReasoning[];
}

interface ScoreDisplayProps {
  score: number;
  scoreBreakdown: ScoreBreakdownItem[];
  onModeChange?: (mode: ScoringMode) => void;
}

const HOMEBUYER_WEIGHTS: Record<string, number> = {
  'Market Strength': 0.25,
  'Demographic Trends': 0.20,
  'School Quality': 0.20,
  'Safety Score': 0.15,
  'Walkability': 0.10,
  'Rental Potential': 0.10,
};

const INVESTOR_WEIGHTS: Record<string, number> = {
  'Market Strength': 0.30,
  'Rental Potential': 0.25,
  'Demographic Trends': 0.20,
  'Safety Score': 0.10,
  'Walkability': 0.10,
  'School Quality': 0.05,
};

function computeModeScore(breakdown: ScoreBreakdownItem[], weights: Record<string, number>): number {
  let total = 0;
  let totalWeight = 0;
  for (const item of breakdown) {
    const w = weights[item.label] ?? item.weight;
    total += item.score * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return parseFloat((total / totalWeight / 10).toFixed(1));
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-cyan-400';
  if (score >= 4) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreGlow(score: number) {
  if (score >= 8) return '0 0 40px rgba(52,211,153,0.5), 0 0 80px rgba(52,211,153,0.25)';
  if (score >= 6) return '0 0 40px rgba(0,217,255,0.5), 0 0 80px rgba(0,217,255,0.25)';
  if (score >= 4) return '0 0 40px rgba(251,191,36,0.5), 0 0 80px rgba(251,191,36,0.25)';
  return '0 0 40px rgba(248,113,113,0.5), 0 0 80px rgba(248,113,113,0.25)';
}

function getScoreLabel(score: number, mode: ScoringMode) {
  if (mode === 'homebuyer') {
    if (score >= 8) return 'Excellent Place to Live';
    if (score >= 6) return 'Great Place to Live';
    if (score >= 4) return 'Decent Place to Live';
    return 'Consider Other Areas';
  }
  if (score >= 8) return 'Excellent Investment';
  if (score >= 6) return 'Good Investment';
  if (score >= 4) return 'Fair Investment';
  return 'Poor Investment';
}

function getBarColor(score: number) {
  if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
  if (score >= 60) return 'bg-gradient-to-r from-cyan-500 to-cyan-400';
  if (score >= 40) return 'bg-gradient-to-r from-amber-500 to-amber-400';
  return 'bg-gradient-to-r from-red-500 to-red-400';
}

function getImpactColor(impact: string) {
  if (impact.includes('-') && !impact.includes('neutral') && !impact.includes('0 ')) return 'text-red-400';
  if (impact.includes('+') && !impact.includes('+0')) return 'text-emerald-400';
  return 'text-gray-400';
}

export default function ScoreDisplay({ score, scoreBreakdown, onModeChange }: ScoreDisplayProps) {
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ScoringMode>('homebuyer');

  const handleModeChange = (newMode: ScoringMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  useEffect(() => {
    onModeChange?.(mode);
  }, []);

  const toggleMetric = (label: string) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const activeWeights = mode === 'homebuyer' ? HOMEBUYER_WEIGHTS : INVESTOR_WEIGHTS;

  const weightedBreakdown = [...scoreBreakdown]
    .map(item => ({
      ...item,
      displayWeight: activeWeights[item.label] ?? item.weight,
    }))
    .sort((a, b) => b.displayWeight - a.displayWeight);

  const displayScore = mode === 'homebuyer' ? score : computeModeScore(scoreBreakdown, activeWeights);

  return (
    <Card className="p-8 glass-card border-gray-700/50">
      {/* Scoring mode toggle */}
      <div className="flex items-center justify-center gap-1 mb-6">
        <div className="inline-flex rounded-lg border border-gray-700/60 bg-gray-900/50 p-0.5">
          <button
            data-testid="button-mode-homebuyer"
            onClick={() => handleModeChange('homebuyer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'homebuyer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Homebuyer Mode
          </button>
          <button
            data-testid="button-mode-investor"
            onClick={() => handleModeChange('investor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'investor'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Investor Mode
          </button>
        </div>
      </div>

      {/* Score display */}
      <div className="text-center mb-8 relative">
        <div
          className="absolute inset-0 opacity-30 blur-3xl rounded-full"
          style={{
            background: `radial-gradient(circle, ${displayScore >= 6 ? 'rgba(0,217,255,0.3)' : 'rgba(251,191,36,0.3)'} 0%, transparent 70%)`
          }}
        />
        <h2 className="text-lg font-medium text-gray-400 mb-2 relative z-10 flex items-center justify-center gap-2">
          {mode === 'homebuyer' ? 'Livability Score' : 'Investment Score'}
          {mode === 'investor' && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              Investor Weighted
            </Badge>
          )}
        </h2>
        <div
          className={`text-8xl font-extrabold font-mono ${getScoreColor(displayScore)} relative z-10`}
          style={{ textShadow: getScoreGlow(displayScore) }}
          data-testid="text-score"
        >
          {displayScore.toFixed(1)}
        </div>
        <p className="text-xl font-semibold mt-2 text-white relative z-10" data-testid="text-score-label">
          {getScoreLabel(displayScore, mode)}
        </p>
        {mode === 'investor' && Math.abs(displayScore - score) >= 0.2 && (
          <p className="text-xs text-gray-500 mt-1 relative z-10">
            Homebuyer score: {score.toFixed(1)} · Investor re-weighted: {displayScore.toFixed(1)}
          </p>
        )}
      </div>

      {/* Mode weight explanation */}
      <div className="mb-4 rounded-md p-3 bg-gray-900/40 border border-gray-700/30">
        <p className="text-xs text-gray-500">
          {mode === 'homebuyer'
            ? 'Homebuyer weights: Schools 20%, Safety 15%, Walkability 10% — prioritizes livability and family factors.'
            : 'Investor weights: Rental Potential 25%, Market Strength 30% — prioritizes cash flow and appreciation.'}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Score Breakdown
        </h3>
        {weightedBreakdown.map((item) => {
          const isExpanded = expandedMetrics.has(item.label);
          const hasReasoning = item.reasoning && item.reasoning.length > 0;
          const weightPct = (item.displayWeight * 100).toFixed(0);

          return (
            <div key={item.label} className="space-y-2">
              <div
                className={`flex justify-between items-center ${hasReasoning ? 'cursor-pointer group' : ''}`}
                onClick={() => hasReasoning && toggleMetric(item.label)}
                data-testid={`score-metric-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  {hasReasoning && (
                    isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 flex-shrink-0 transition-colors" />
                  )}
                  {item.label}
                </span>
                <span className="text-sm font-mono text-gray-500">
                  {item.score.toFixed(0)}%{' '}
                  <span className={`${mode === 'investor' && item.label === 'Rental Potential' ? 'text-purple-400' : 'text-gray-600'}`}>
                    (weight: {weightPct}%)
                  </span>
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getBarColor(item.score)}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>

              {isExpanded && hasReasoning && (
                <div className="mt-2 ml-5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200" data-testid={`reasoning-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.reasoning!.map((r, idx) => (
                    <div key={idx} className="bg-gray-800/50 rounded-md p-3 border border-gray-700/30">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-gray-200">{r.factor}</span>
                        <span className={`text-xs font-mono ${getImpactColor(r.impact)}`}>{r.impact}</span>
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
            </div>
          );
        })}

        {scoreBreakdown.some(item => item.reasoning && item.reasoning.length > 0) && (
          <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Click any metric above to see the data behind the score
          </p>
        )}
      </div>
    </Card>
  );
}
