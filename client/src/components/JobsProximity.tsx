import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, TrendingUp, Info, Building2, MapPin } from 'lucide-react';
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
import type { JobsProximityData } from '@shared/schema';

interface JobsProximityProps {
  data: JobsProximityData | null | undefined;
}

const DENSITY_CONFIG = {
  very_low: {
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/20',
    bar: 'bg-slate-500',
    barPct: '8%',
  },
  low: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    bar: 'bg-cyan-500',
    barPct: '25%',
  },
  moderate: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    bar: 'bg-amber-500',
    barPct: '52%',
  },
  high: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    bar: 'bg-emerald-500',
    barPct: '75%',
  },
  very_high: {
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    bar: 'bg-blue-500',
    barPct: '95%',
  },
};

function SectorBar({ name, jobs, maxJobs }: { name: string; jobs: number; maxJobs: number }) {
  const pct = maxJobs > 0 ? Math.max(4, (jobs / maxJobs) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate pr-2">{name}</span>
        <span className="text-foreground font-mono shrink-0">{jobs.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function JobsProximity({ data }: JobsProximityProps) {
  if (!data) {
    return (
      <Card className="p-5 border border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-muted">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Jobs Proximity</h3>
            <p className="text-xs text-muted-foreground">Census LEHD/LODES Employment Statistics</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Employment data is being loaded for this area. It will appear on your next analysis of this location.
        </p>
      </Card>
    );
  }

  const cfg = DENSITY_CONFIG[data.jobDensity];
  const maxJobs = data.topSectors.length > 0 ? data.topSectors[0].jobs : 1;

  return (
    <Card className="p-5 border border-border/50">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${cfg.bg} border ${cfg.border}`}>
            <Briefcase className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Jobs Proximity
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Workplace jobs within this census tract from the Census Bureau's LEHD/LODES dataset. High job density signals strong rental demand, lower vacancy risk, and sustained property values — a key dimension validated by Redfin's market scoring methodology.</p>
                </TooltipContent>
              </Tooltip>
            </h3>
            <p className="text-xs text-muted-foreground">Source: {data.dataSource}</p>
          </div>
        </div>
        <Badge
          data-testid="badge-jobs-density"
          className={`${cfg.bg} ${cfg.color} border ${cfg.border} text-xs font-medium`}
        >
          <Building2 className="w-3 h-3 mr-1" />
          {data.jobDensityLabel}
        </Badge>
      </div>

      {/* Total jobs summary */}
      <div className={`flex items-center justify-between p-3 rounded-md ${cfg.bg} border ${cfg.border} mb-4`}>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Workplace Jobs in Census Tract</p>
          <p className={`text-2xl font-bold font-mono ${cfg.color}`}>
            {data.totalJobs >= 1000
              ? `${(data.totalJobs / 1000).toFixed(1)}k`
              : data.totalJobs.toLocaleString()}
          </p>
          <p className={`text-xs font-medium ${cfg.color}`}>{data.jobDensityLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Data Year</p>
          <p className="text-lg font-bold font-mono text-foreground">{data.dataYear}</p>
          <p className="text-xs text-muted-foreground">Census LEHD</p>
        </div>
      </div>

      {/* Job density bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Employment Density (tract-level)</span>
          <span className={`font-medium ${cfg.color}`}>{data.totalJobs.toLocaleString()} jobs</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${cfg.bar} transition-all`} style={{ width: cfg.barPct }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
          <span>Residential only</span>
          <span>Major employment hub</span>
        </div>
      </div>

      {/* Insight */}
      <p className="text-sm text-muted-foreground mb-4">{data.insight}</p>

      {/* Sector breakdown */}
      {data.topSectors.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="sectors" className="border-0">
            <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-0 hover:no-underline">
              View employment sector breakdown
            </AccordionTrigger>
            <AccordionContent className="pt-3 pb-0">
              <div className="space-y-3">
                {data.topSectors.map((sector, i) => (
                  <SectorBar key={i} name={sector.name} jobs={sector.jobs} maxJobs={maxJobs} />
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Top sectors by workplace job count in this census tract (LODES WAC file, all jobs).
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {data.topSectors.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>No sector data available — tract may be entirely residential.</span>
        </div>
      )}
    </Card>
  );
}
