import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon, Info, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ScoreReasoning } from '@shared/schema';

interface MetricCardProps {
  icon: LucideIcon;
  title: string;
  score: number;
  description: string;
  tooltip?: string;
  reasoning?: ScoreReasoning[];
}

export default function MetricCard({ icon: Icon, title, score, description, tooltip, reasoning }: MetricCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-cyan-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreGlow = (score: number) => {
    if (score >= 80) return 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    if (score >= 60) return 'drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]';
    if (score >= 40) return 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]';
    return 'drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]';
  };

  const getImpactColor = (impact: string) => {
    if (impact.includes('-') && !impact.includes('neutral') && !impact.includes('0 ')) return 'text-red-400';
    if (impact.includes('+') && !impact.includes('+0')) return 'text-emerald-400';
    return 'text-gray-400';
  };

  const isHighScore = score >= 60;
  const hasReasoning = reasoning && reasoning.length > 0;

  return (
    <Card className="p-6 glass-card card-glow-hover border-gray-700/50" data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${isHighScore ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
          <Icon className={`w-6 h-6 ${isHighScore ? 'text-cyan-400 icon-glow' : 'text-purple-400 icon-glow-purple'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold uppercase tracking-wide text-gray-100">
              {title}
            </h3>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center rounded-full hover:bg-white/5 p-1 transition-colors"
                    data-testid={`button-tooltip-${title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Info className="w-4 h-4 text-gray-500 hover:text-cyan-400 transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs glass border-gray-700" side="top">
                  <p className="text-sm text-gray-300">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className={`text-4xl font-bold font-mono mb-2 ${getScoreColor(score)} ${getScoreGlow(score)}`} data-testid={`text-score-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {score.toFixed(0)}
          </div>
          <p className="text-sm text-gray-300 mb-3">{description}</p>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : score >= 60 ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : score >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
              style={{ width: `${score}%` }}
            />
          </div>
          
          {hasReasoning && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-xs text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
              data-testid={`button-reasoning-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Show'} scoring details
            </button>
          )}
          
          {expanded && hasReasoning && (
            <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200" data-testid={`reasoning-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {reasoning!.map((r, idx) => (
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
      </div>
    </Card>
  );
}
