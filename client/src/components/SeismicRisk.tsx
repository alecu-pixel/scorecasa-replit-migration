import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SeismicRiskData } from '@shared/schema';

interface SeismicRiskProps {
  data: SeismicRiskData | null | undefined;
}

const RISK_CONFIG = {
  very_low: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', bar: 'bg-emerald-500', icon: CheckCircle, pct: '8%' },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', bar: 'bg-cyan-500', icon: CheckCircle, pct: '28%' },
  moderate: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', bar: 'bg-amber-500', icon: Info, pct: '55%' },
  high: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', bar: 'bg-orange-500', icon: AlertTriangle, pct: '78%' },
  very_high: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', bar: 'bg-red-500', icon: AlertTriangle, pct: '95%' },
};

const PGA_BANDS = [
  { label: 'Very Low', max: 5, color: 'bg-emerald-500' },
  { label: 'Low', max: 15, color: 'bg-cyan-500' },
  { label: 'Moderate', max: 30, color: 'bg-amber-500' },
  { label: 'High', max: 60, color: 'bg-orange-500' },
  { label: 'Very High', max: 200, color: 'bg-red-500' },
];

function getPgaBarWidth(pga: number): string {
  // Map PGA (0-100+%g) to a visual bar (log scale)
  const logScale = Math.min(100, (Math.log10(pga + 1) / Math.log10(101)) * 100);
  return `${logScale.toFixed(0)}%`;
}

export default function SeismicRisk({ data }: SeismicRiskProps) {
  if (!data) {
    return (
      <Card className="p-5 border border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-muted">
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Seismic Risk</h3>
            <p className="text-xs text-muted-foreground">USGS National Seismic Hazard Map</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Seismic hazard data not available for this location.</p>
      </Card>
    );
  }

  const cfg = RISK_CONFIG[data.riskLevel];
  const RiskIcon = cfg.icon;

  return (
    <Card className="p-5 border border-border/50">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${cfg.bg} border ${cfg.border}`}>
            <Activity className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Seismic Risk
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Based on USGS National Seismic Hazard Maps. PGA (Peak Ground Acceleration) represents the probability of shaking with a 2% chance in 50 years — the standard for building codes.</p>
                </TooltipContent>
              </Tooltip>
            </h3>
            <p className="text-xs text-muted-foreground">{data.affectedRegion} · {data.dataSource}</p>
          </div>
        </div>
        <Badge data-testid="badge-seismic-risk-level" className={`${cfg.bg} ${cfg.color} border ${cfg.border} text-xs font-medium`}>
          <RiskIcon className="w-3 h-3 mr-1" />
          {data.riskLabel}
        </Badge>
      </div>

      {/* PGA meter */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Peak Ground Acceleration (PGA)</span>
          <span className={`font-mono font-medium ${cfg.color}`}>{data.pga.toFixed(1)}%g</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${cfg.bar} transition-all`}
            style={{ width: getPgaBarWidth(data.pga) }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
          <span>Negligible</span>
          <span>Extreme</span>
        </div>
      </div>

      {/* Insight */}
      <p className="text-sm text-muted-foreground mb-4">{data.insight}</p>

      {/* Quick tips for high/very high risk */}
      {(data.riskLevel === 'high' || data.riskLevel === 'very_high') && (
        <div className="flex items-start gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Earthquake insurance is strongly recommended. Pre-purchase structural inspection should evaluate seismic retrofit status of older homes.
          </p>
        </div>
      )}

      {/* PGA scale reference */}
      <Accordion type="single" collapsible>
        <AccordionItem value="scale" className="border-0">
          <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-0 hover:no-underline">
            Understanding PGA risk bands
          </AccordionTrigger>
          <AccordionContent className="pt-3 pb-0">
            <div className="space-y-1.5">
              {PGA_BANDS.map(band => (
                <div key={band.label} className="flex items-center gap-3 text-xs">
                  <div className={`w-2 h-2 rounded-full ${band.color} flex-shrink-0`} />
                  <span className="text-muted-foreground w-20">{band.label}</span>
                  <span className="text-foreground/70 font-mono">
                    {band.label === 'Very Low' ? '<5%g'
                      : band.label === 'Low' ? '5-15%g'
                      : band.label === 'Moderate' ? '15-30%g'
                      : band.label === 'High' ? '30-60%g'
                      : '>60%g'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                PGA = % of gravitational force. Structures built to modern code withstand up to ~20%g. Values above 30%g require special seismic engineering.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
