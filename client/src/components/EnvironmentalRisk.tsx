import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wind, AlertTriangle, CheckCircle, Info, Leaf } from 'lucide-react';
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
import type { EnvironmentalRiskData } from '@shared/schema';

interface EnvironmentalRiskProps {
  data: EnvironmentalRiskData | null | undefined;
}

const RISK_CONFIG = {
  very_low: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', bar: 'bg-emerald-500', icon: CheckCircle, scoreWidth: '10%' },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', bar: 'bg-cyan-500', icon: CheckCircle, scoreWidth: '30%' },
  moderate: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', bar: 'bg-amber-500', icon: Info, scoreWidth: '55%' },
  high: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', bar: 'bg-orange-500', icon: AlertTriangle, scoreWidth: '75%' },
  very_high: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', bar: 'bg-red-500', icon: AlertTriangle, scoreWidth: '95%' },
};

const AQI_CATEGORIES: { max: number; label: string; color: string }[] = [
  { max: 50,  label: 'Good',                          color: 'text-emerald-400' },
  { max: 100, label: 'Moderate',                      color: 'text-yellow-400' },
  { max: 150, label: 'Unhealthy for Sensitive Groups', color: 'text-amber-400' },
  { max: 200, label: 'Unhealthy',                     color: 'text-orange-400' },
  { max: 300, label: 'Very Unhealthy',                color: 'text-red-400' },
  { max: 500, label: 'Hazardous',                     color: 'text-red-600' },
];

function aqiInfo(aqi: number) {
  return AQI_CATEGORIES.find(c => aqi <= c.max) ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

function ConcentrationRow({ label, value, unit, naaqs, naaqs_label }: {
  label: string;
  value: number | undefined;
  unit: string;
  naaqs?: number;
  naaqs_label?: string;
}) {
  if (value === undefined || value === null) return null;
  const pct = naaqs ? Math.min(100, (value / (naaqs * 1.5)) * 100) : 0;
  const barColor = naaqs
    ? value <= naaqs * 0.7  ? 'bg-emerald-500'
    : value <= naaqs        ? 'bg-cyan-500'
    : value <= naaqs * 1.5  ? 'bg-amber-500'
    : 'bg-red-500'
    : 'bg-cyan-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono">{value.toFixed(1)} {unit}</span>
      </div>
      {naaqs && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {naaqs && (
        <p className="text-xs text-muted-foreground">EPA {naaqs_label}: {naaqs} {unit}</p>
      )}
    </div>
  );
}

export default function EnvironmentalRisk({ data }: EnvironmentalRiskProps) {
  if (!data) {
    return (
      <Card className="p-5 border border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-muted">
            <Leaf className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Air Quality & Environmental Risk</h3>
            <p className="text-xs text-muted-foreground">Live monitoring · AirToxScreen context</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Air quality data not available for this location.</p>
      </Card>
    );
  }

  const cfg = RISK_CONFIG[data.riskLevel];
  const RiskIcon = cfg.icon;
  const usAqi = data.usAqi ?? data.airQualityIndex;
  const aqiCat = aqiInfo(usAqi);

  return (
    <Card className="p-5 border border-border/50">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${cfg.bg} border ${cfg.border}`}>
            <Wind className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Air Quality &amp; Environmental Risk
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Live air quality from the nearest EPA-equivalent monitoring station via CAMS global model. Includes US AQI, PM2.5 concentration vs NAAQS standards, ozone, and NO2. AirToxScreen cancer risk context applied.</p>
                </TooltipContent>
              </Tooltip>
            </h3>
            <p className="text-xs text-muted-foreground">Source: {data.dataSource}</p>
          </div>
        </div>
        <Badge data-testid="badge-env-risk-level" className={`${cfg.bg} ${cfg.color} border ${cfg.border} text-xs font-medium`}>
          <RiskIcon className="w-3 h-3 mr-1" />
          {data.riskLabel}
        </Badge>
      </div>

      {/* AQI summary row */}
      <div className={`flex items-center justify-between p-3 rounded-md ${cfg.bg} border ${cfg.border} mb-4`}>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current US Air Quality Index</p>
          <p className={`text-2xl font-bold font-mono ${aqiCat.color}`}>{usAqi}</p>
          <p className={`text-xs font-medium ${aqiCat.color}`}>{aqiCat.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Environmental Burden</p>
          <p className={`text-lg font-bold font-mono ${cfg.color}`}>{data.riskScore}/100</p>
          <p className="text-xs text-muted-foreground">lower = cleaner</p>
        </div>
      </div>

      {/* Insight */}
      <p className="text-sm text-muted-foreground mb-4">{data.insight}</p>

      {/* Key risks */}
      {data.keyRisks.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {data.keyRisks.map((risk, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{risk}</span>
            </div>
          ))}
        </div>
      )}

      {data.keyRisks.length === 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>No significant air quality concerns detected. Readings are within healthy EPA guidelines.</span>
        </div>
      )}

      {/* Expandable breakdown */}
      <Accordion type="single" collapsible>
        <AccordionItem value="breakdown" className="border-0">
          <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-0 hover:no-underline">
            View pollutant concentration breakdown
          </AccordionTrigger>
          <AccordionContent className="pt-3 pb-0">
            <div className="space-y-3">
              <ConcentrationRow
                label="PM2.5 Fine Particulate Matter"
                value={data.pm25Concentration}
                unit="μg/m³"
                naaqs={12}
                naaqs_label="annual standard"
              />
              <ConcentrationRow
                label="Surface Ozone"
                value={data.ozoneConcentration}
                unit="μg/m³"
                naaqs={137}
                naaqs_label="8-hr equiv (~70 ppb)"
              />
              <ConcentrationRow
                label="Nitrogen Dioxide (NO2)"
                value={data.no2Concentration}
                unit="μg/m³"
                naaqs={100}
                naaqs_label="annual standard (53 ppb)"
              />
              <div className="pt-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approximate National PM2.5 Percentile</span>
                  <span className="text-foreground font-mono">{data.pm25Percentile}th</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approximate National Ozone Percentile</span>
                  <span className="text-foreground font-mono">{data.ozonePercentile}th</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Live data from nearest CAMS global monitoring station. Percentiles approximate national distribution vs EPA monitoring network averages.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
