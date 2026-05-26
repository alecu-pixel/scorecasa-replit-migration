import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info, MapPin, Building2, Globe, FileText } from 'lucide-react';
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
import type { EnrichedCrimeData, CrimeData } from '@shared/schema';
import CrimeMap from './CrimeMap';

const getGradeExplanation = (grade: string): string => {
  const gradeUpper = grade.toUpperCase().replace(/[+-]/g, '');
  switch (gradeUpper) {
    case 'A':
      return 'Excellent safety. This ZIP code has significantly lower crime rates than the national average.';
    case 'B':
      return 'Good safety. Crime rates in this area are below the national average.';
    case 'C':
      return 'Average safety. Crime rates are comparable to the national average.';
    case 'D':
      return 'Below average safety. Crime rates are higher than the national average.';
    case 'F':
      return 'Poor safety. This area has significantly elevated crime rates compared to national averages.';
    default:
      return 'Crime data is being evaluated for this area.';
  }
};

interface EnhancedSafetyScoreProps {
  enrichedData: EnrichedCrimeData | null;
  legacyData: CrimeData | null;
}

export default function EnhancedSafetyScore({ enrichedData, legacyData }: EnhancedSafetyScoreProps) {
  if (!enrichedData && !legacyData) {
    return (
      <Card className="p-6 glass-card border-gray-700/50" data-testid="card-safety-score-unavailable">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
            <Shield className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Safety Analysis</h3>
            <p className="text-sm text-gray-400">Crime data unavailable</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Detailed crime statistics are not available for this area. Safety estimates are based on demographic indicators.
        </p>
      </Card>
    );
  }

  const score = enrichedData?.compositeSafetyScore ?? legacyData?.safetyScore ?? 50;
  const label = enrichedData?.safetyLabel ?? 'Average';
  const gradeColor = enrichedData?.safetyColor ?? '#eab308';

  const getScoreStyles = (score: number) => {
    if (score >= 85) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' };
    if (score >= 70) return { bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-400', glow: 'drop-shadow-[0_0_8px_rgba(132,204,22,0.5)]' };
    if (score >= 55) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', glow: 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' };
    if (score >= 40) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', glow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' };
  };

  const styles = getScoreStyles(score);
  const zipData = enrichedData?.zipLevelData;
  const stateData = enrichedData?.stateLevelData;

  const ComparisonIndicator = ({ value, label: compLabel }: { value: number; label: string }) => {
    if (Math.abs(value) < 5) {
      return (
        <div className="flex items-center gap-1 text-gray-400">
          <Minus className="w-4 h-4" />
          <span className="text-xs">{compLabel}</span>
        </div>
      );
    }
    if (value < 0) {
      return (
        <div className="flex items-center gap-1 text-emerald-400">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs">{Math.abs(Math.round(value))}% below national avg</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-orange-400">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs">{Math.round(value)}% above national avg</span>
      </div>
    );
  };

  return (
    <Card className="p-6 glass-card card-glow-hover border-gray-700/50" data-testid="card-enhanced-safety-score">
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-lg ${styles.bg} border ${styles.border}`}>
          <Shield className={`w-6 h-6 ${styles.text} icon-glow`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">Safety Analysis</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-full hover:bg-white/5 transition-colors" data-testid="button-tooltip-safety">
                  <Info className="w-4 h-4 text-gray-500 hover:text-cyan-400 transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs glass border-gray-700" side="top">
                <p className="text-sm text-gray-300">
                  Composite safety score from multiple data sources including ZIP-level crime grades, state-level FBI statistics, and national benchmarks (NIBRS).
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-baseline gap-3 mb-2">
            <span className={`text-4xl font-bold font-mono ${styles.text} ${styles.glow}`} data-testid="text-safety-score">
              {score}
            </span>
            <Badge 
              className="text-xs font-medium" 
              style={{ backgroundColor: `${gradeColor}20`, color: gradeColor, borderColor: `${gradeColor}40` }}
              data-testid="badge-safety-label"
            >
              {label}
            </Badge>
          </div>

          {enrichedData?.summary && (
            <p className="text-sm text-gray-400 mb-3" data-testid="text-safety-description">
              {enrichedData.summary.description}
            </p>
          )}

          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full transition-all duration-500 ${score >= 85 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : score >= 70 ? 'bg-gradient-to-r from-lime-500 to-lime-400' : score >= 55 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : score >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {zipData && (
        <div className="mb-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50" data-testid="section-zip-crime">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">ZIP Code Crime Grade</span>
            <Badge className="text-xs" style={{ backgroundColor: `${zipData.gradeColor}20`, color: zipData.gradeColor }}>
              {zipData.dataYear}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div 
                className="text-2xl font-bold mb-1" 
                style={{ color: zipData.gradeColor }}
                data-testid="text-overall-grade"
              >
                {zipData.overallGrade}
              </div>
              <div className="text-xs text-gray-400">Overall</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-1" data-testid="text-violent-grade">
                {zipData.violentCrimeGrade}
              </div>
              <div className="text-xs text-gray-400">Violent Crime</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-1" data-testid="text-property-grade">
                {zipData.propertyCrimeGrade}
              </div>
              <div className="text-xs text-gray-400">Property Crime</div>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 italic" data-testid="text-zip-explanation">
            {getGradeExplanation(zipData.overallGrade)} Grades range from A (safest) to F (least safe), based on reported crime incidents in this ZIP code.
          </p>
        </div>
      )}

      {zipData && enrichedData?.nearbyZips && enrichedData.nearbyZips.length > 0 && (
        <div className="mb-4">
          <CrimeMap
            mainZip={enrichedData.zipCode}
            mainGrade={zipData.overallGrade}
            mainGradeColor={zipData.gradeColor}
            nearbyZips={enrichedData.nearbyZips}
            centerLat={enrichedData.lat}
            centerLng={enrichedData.lng}
          />
        </div>
      )}

      {stateData && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="state-stats" className="border-gray-700/50">
            <AccordionTrigger className="hover:no-underline py-3" data-testid="button-expand-state-stats">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">State Crime Statistics</span>
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                  {enrichedData?.stateName || ''} {stateData.dataYear}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-gray-400 italic" data-testid="text-state-explanation">
                  These statistics are from the FBI's Uniform Crime Reporting (UCR) program for {enrichedData?.stateName || 'this state'}. 
                  Crime rates are shown per 100,000 residents and compared against national averages to help you understand how this state compares to the rest of the country.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <div className="text-xs text-gray-400 mb-1">Violent Crime Rate</div>
                    <div className="text-lg font-semibold text-white" data-testid="text-violent-rate">
                      {stateData.violentCrimeRate.toFixed(0)}/100K
                    </div>
                    <ComparisonIndicator value={stateData.violentCrimeVsNational} label={stateData.violentCrimeComparison} />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <div className="text-xs text-gray-400 mb-1">Property Crime Rate</div>
                    <div className="text-lg font-semibold text-white" data-testid="text-property-rate">
                      {stateData.propertyCrimeRate.toFixed(0)}/100K
                    </div>
                    <ComparisonIndicator value={stateData.propertyCrimeVsNational} label={stateData.propertyCrimeComparison} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-gray-800/30">
                    <div className="text-xs text-gray-500">Murder</div>
                    <div className="text-sm font-medium text-gray-300">{stateData.murderRate.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-gray-800/30">
                    <div className="text-xs text-gray-500">Robbery</div>
                    <div className="text-sm font-medium text-gray-300">{stateData.robberyRate.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-gray-800/30">
                    <div className="text-xs text-gray-500">Assault</div>
                    <div className="text-sm font-medium text-gray-300">{stateData.assaultRate.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-gray-800/30">
                    <div className="text-xs text-gray-500">Burglary</div>
                    <div className="text-sm font-medium text-gray-300">{stateData.burglaryRate.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-gray-800/30">
                    <div className="text-xs text-gray-500">Larceny</div>
                    <div className="text-sm font-medium text-gray-300">{stateData.larcenyRate.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-gray-800/30">
                    <div className="text-xs text-gray-500">Vehicle Theft</div>
                    <div className="text-sm font-medium text-gray-300">{stateData.motorVehicleTheftRate.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {enrichedData?.summary.keyInsights && enrichedData.summary.keyInsights.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex flex-wrap gap-2">
            {enrichedData.summary.keyInsights.map((insight, index) => (
              <div 
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/50 text-xs text-gray-300"
                data-testid={`badge-insight-${index}`}
              >
                {insight.toLowerCase().includes('low') || insight.toLowerCase().includes('below') ? (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                ) : insight.toLowerCase().includes('high') || insight.toLowerCase().includes('above') || insight.toLowerCase().includes('elevated') ? (
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                ) : (
                  <Info className="w-3 h-3 text-gray-400" />
                )}
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      <Accordion type="single" collapsible className="w-full mt-4">
        <AccordionItem value="methodology" className="border-gray-700/50">
          <AccordionTrigger className="hover:no-underline py-3" data-testid="button-expand-methodology">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">How Your Score Was Calculated</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2 text-xs text-gray-400">
              {zipData ? (
                <div className="flex items-start gap-2 p-2 rounded bg-cyan-500/5 border border-cyan-500/20">
                  <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-cyan-300 font-medium">ZIP-Level Data (60% of score): </span>
                    Your property's ZIP code received a grade of <span className="font-semibold text-white">{zipData.overallGrade}</span>. 
                    This hyper-local data is the most relevant to your specific address and carries the most weight in your safety score.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded bg-gray-500/5 border border-gray-500/20">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-300 font-medium">ZIP-Level Data: </span>
                    Not available for this ZIP code. Your score relies on state and national data instead, which provides broader regional context.
                  </div>
                </div>
              )}
              
              {stateData ? (
                <div className="flex items-start gap-2 p-2 rounded bg-purple-500/5 border border-purple-500/20">
                  <Building2 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-purple-300 font-medium">State Statistics ({zipData ? '40%' : '100%'} of score): </span>
                    {enrichedData?.stateName || 'This state'}'s crime rates are {stateData.violentCrimeVsNational > 5 ? 'above' : stateData.violentCrimeVsNational < -5 ? 'below' : 'near'} the national average. 
                    FBI data from {stateData.dataYear} provides official crime statistics{zipData ? '' : ' and serves as the primary source for your safety score since ZIP-level data is not available'}.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded bg-gray-500/5 border border-gray-500/20">
                  <Building2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-300 font-medium">State Statistics: </span>
                    State-level FBI crime data is not available. Your score uses national benchmarks as a baseline.
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/5 border border-blue-500/20">
                <Globe className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-blue-300 font-medium">National Benchmarks: </span>
                  All scores are compared against FBI's National Incident-Based Reporting System (NIBRS) data to give you context on how this area compares to the national average.
                </div>
              </div>
              
              <p className="text-gray-500 mt-2 pt-2 border-t border-gray-700/30">
                Your final safety score of <span className="text-white font-semibold">{score}/100</span> reflects a weighted combination of the available data sources, 
                with more local data given higher priority when available. This score is for informational purposes only and should be one of many factors in your decision.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-3 pt-3 border-t border-gray-700/30">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Data sources used:</span>
          {enrichedData?.dataSources.zipCode !== 'unavailable' && (
            <Badge variant="outline" className="text-xs border-cyan-700/50 text-cyan-500">ZIP Crime Data</Badge>
          )}
          {enrichedData?.dataSources.state !== 'unavailable' && (
            <Badge variant="outline" className="text-xs border-purple-700/50 text-purple-500">FBI UCR</Badge>
          )}
          <Badge variant="outline" className="text-xs border-blue-700/50 text-blue-500">NIBRS</Badge>
        </div>
      </div>
    </Card>
  );
}
