import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, TrendingUp, Home } from 'lucide-react';
import type { InvestmentAnalysis } from '@shared/schema';

interface DemographicsInput {
  medianIncome: number;
  medianRent?: number;
  medianHomeValue?: number;
  employmentRate: number;
  populationGrowth5yr: number;
  incomeGrowth5yr: number;
  collegeDegreePct?: number;
  professionalEmploymentPct?: number;
}

interface ScoreBreakdownItem {
  label: string;
  score: number;
  weight: number;
}

interface InvestmentAnalysisDisplayProps {
  analysis: InvestmentAnalysis;
  mode?: 'homebuyer' | 'investor';
  scoreBreakdown?: ScoreBreakdownItem[];
  demographics?: DemographicsInput | null;
  schools?: { average_score: number } | null;
  walkability?: { walkScore: number } | null;
}

interface BuyerAnalysis {
  phases: { title: string; description: string }[];
  pros: string[];
  cons: string[];
}

function deriveBuyerAnalysis(
  scoreBreakdown: ScoreBreakdownItem[],
  demographics: DemographicsInput,
  schools: { average_score: number } | null | undefined,
  walkability: { walkScore: number } | null | undefined
): BuyerAnalysis {
  const getScore = (label: string) => scoreBreakdown.find(s => s.label === label)?.score ?? 0;
  const marketStrength = getScore('Market Strength');
  const safetyScore = getScore('Safety Score');
  const schoolScore = schools?.average_score != null ? schools.average_score * 10 : getScore('School Quality');
  const walkScore = walkability?.walkScore ?? 0;
  const { medianIncome, employmentRate, populationGrowth5yr, incomeGrowth5yr } = demographics;

  const phases: { title: string; description: string }[] = [];

  // Phase 1: Neighborhood Quality
  let phase1Desc = '';
  if (schoolScore >= 70 && walkScore >= 60) {
    phase1Desc = `Excellent neighborhood quality with school ratings of ${schoolScore.toFixed(0)}/100 and a walkability score of ${walkScore}/100 — a highly convenient area for day-to-day living.`;
  } else if (schoolScore >= 60) {
    phase1Desc = `Good school ratings (${schoolScore.toFixed(0)}/100) make this area appealing to families. Walkability is ${walkScore >= 50 ? 'adequate' : 'limited'} at ${walkScore}/100 — ${walkScore >= 50 ? 'most errands are manageable on foot' : 'a car will be needed for most trips'}.`;
  } else if (walkScore >= 60) {
    phase1Desc = `Strong walkability (${walkScore}/100) means daily errands are easy on foot. School ratings (${schoolScore.toFixed(0)}/100) are below average, so families with children may want to research specific schools.`;
  } else {
    phase1Desc = `Moderate neighborhood amenities with school ratings of ${schoolScore.toFixed(0)}/100 and walkability of ${walkScore}/100. A car is likely needed for most activities. Safety score of ${safetyScore.toFixed(0)}/100 reflects local crime conditions.`;
  }
  phases.push({ title: 'Neighborhood Quality', description: phase1Desc });

  // Phase 2: Community & Lifestyle Fit
  let phase2Desc = '';
  if (medianIncome >= 100000) {
    phase2Desc = `Affluent community with a median household income of $${(medianIncome / 1000).toFixed(0)}K`;
  } else if (medianIncome >= 70000) {
    phase2Desc = `Median household income of $${(medianIncome / 1000).toFixed(0)}K reflects a middle-class community`;
  } else {
    phase2Desc = `Median household income of $${(medianIncome / 1000).toFixed(0)}K indicates a more modest economic profile`;
  }
  const empDesc = employmentRate >= 95
    ? ` and a strong ${employmentRate.toFixed(1)}% employment rate signal a stable, well-functioning local economy.`
    : employmentRate >= 90
      ? ` and a ${employmentRate.toFixed(1)}% employment rate suggest a reasonably stable community.`
      : ` with a ${employmentRate.toFixed(1)}% employment rate — slightly below average, indicating some economic stress in the area.`;
  phase2Desc += empDesc;
  if (populationGrowth5yr > 2) {
    phase2Desc += ` Population growth of ${populationGrowth5yr.toFixed(1)}% over 5 years signals an in-demand, growing neighborhood.`;
  } else if (populationGrowth5yr < 0) {
    phase2Desc += ` The area has seen a population decline of ${Math.abs(populationGrowth5yr).toFixed(1)}% over 5 years, which may reflect shifting neighborhood dynamics.`;
  }
  phases.push({ title: 'Community & Lifestyle Fit', description: phase2Desc });

  // Phase 3: Long-term Ownership Value
  let phase3Desc = '';
  if (incomeGrowth5yr > 5 && populationGrowth5yr > 2) {
    phase3Desc = `Strong indicators for long-term value: income growth of ${incomeGrowth5yr.toFixed(1)}% and population growth of ${populationGrowth5yr.toFixed(1)}% over 5 years. Combined with ${marketStrength >= 60 ? 'solid' : 'moderate'} market fundamentals (${marketStrength.toFixed(0)}/100), this home is well-positioned to hold or grow in value over time.`;
  } else if (incomeGrowth5yr > 0 || populationGrowth5yr > 0) {
    phase3Desc = `Moderate long-term value outlook: income growth of ${incomeGrowth5yr.toFixed(1)}% and ${populationGrowth5yr >= 0 ? 'stable' : 'declining'} population (${populationGrowth5yr.toFixed(1)}% over 5yr). Market strength is ${marketStrength.toFixed(0)}/100 — the home should retain its value, though significant appreciation depends on broader market trends.`;
  } else {
    phase3Desc = `The area faces some headwinds for long-term value: declining or flat incomes (${incomeGrowth5yr.toFixed(1)}%) and a population trend of ${populationGrowth5yr.toFixed(1)}%. This doesn't disqualify the purchase, but confirms the importance of buying at the right price and having a long-term ownership horizon.`;
  }
  phases.push({ title: 'Long-term Ownership Value', description: phase3Desc });

  const pros: string[] = [];
  const cons: string[] = [];

  // Pros
  if (schoolScore >= 70) pros.push(`Quality schools (${schoolScore.toFixed(0)}/100) make this ideal for families`);
  if (safetyScore >= 70) pros.push(`Low crime rate (${safetyScore.toFixed(0)}/100 safety score) contributes to a safe living environment`);
  if (walkScore >= 60) pros.push(`Walkable neighborhood (${walkScore}/100) reduces car dependency for daily errands`);
  if (employmentRate >= 95) pros.push(`Strong local employment (${employmentRate.toFixed(1)}%) supports neighborhood stability`);
  if (incomeGrowth5yr > 3) pros.push(`Rising household incomes (${incomeGrowth5yr.toFixed(1)}% over 5yr) signal a desirable, growing area`);
  if (populationGrowth5yr > 2) pros.push(`Growing community (${populationGrowth5yr.toFixed(1)}% population increase) indicates sustained housing demand`);
  if (marketStrength >= 70) pros.push(`Competitive market (${marketStrength.toFixed(0)}/100) supports good long-term value retention`);
  if (medianIncome >= 80000) pros.push(`Affluent community ($${(medianIncome / 1000).toFixed(0)}K median income) supports strong property values`);

  // Cons
  if (schoolScore < 50) cons.push(`Below-average school ratings (${schoolScore.toFixed(0)}/100) may be a concern for families with children`);
  if (walkScore < 30) cons.push(`Car-dependent area (${walkScore}/100 walk score) — most errands require driving`);
  if (populationGrowth5yr < 0) cons.push(`Shrinking population (${populationGrowth5yr.toFixed(1)}%) may affect neighborhood vitality over time`);
  if (medianIncome < 55000) cons.push(`Lower area incomes ($${(medianIncome / 1000).toFixed(0)}K median) may limit property value appreciation`);
  if (employmentRate < 92) cons.push(`Below-average employment rate (${employmentRate.toFixed(1)}%) indicates some economic stress locally`);
  if (marketStrength < 40) cons.push(`Soft market conditions (${marketStrength.toFixed(0)}/100) may affect resale value when you're ready to sell`);
  if (safetyScore < 40) cons.push(`Safety score of ${safetyScore.toFixed(0)}/100 warrants researching local crime trends before committing`);

  // Minimums
  while (pros.length < 2) {
    if (medianIncome >= 50000 && !pros.some(p => p.includes('income'))) {
      pros.push(`Moderate income levels ($${(medianIncome / 1000).toFixed(0)}K) provide baseline neighborhood stability`);
    } else {
      pros.push(`Overall conditions suggest an acceptable place for long-term homeownership`);
      break;
    }
  }
  while (cons.length < 2) {
    if (!cons.some(c => c.includes('ownership'))) {
      cons.push('Factor in ongoing ownership costs (maintenance, property tax) when budgeting');
    } else {
      cons.push('Monitor local market trends before committing to ensure you are buying at fair value');
      break;
    }
  }

  return { phases, pros, cons };
}

export default function InvestmentAnalysisDisplay({
  analysis,
  mode = 'investor',
  scoreBreakdown,
  demographics,
  schools,
  walkability,
}: InvestmentAnalysisDisplayProps) {
  const isHomebuyer = mode === 'homebuyer';

  const buyerAnalysis: BuyerAnalysis | null =
    isHomebuyer && scoreBreakdown && demographics
      ? deriveBuyerAnalysis(scoreBreakdown, demographics, schools, walkability)
      : null;

  const displayPhases = isHomebuyer && buyerAnalysis ? buyerAnalysis.phases : analysis.phases;
  const displayPros = isHomebuyer && buyerAnalysis ? buyerAnalysis.pros : analysis.pros;
  const displayCons = isHomebuyer && buyerAnalysis ? buyerAnalysis.cons : analysis.cons;

  return (
    <Card className="glass-card border-gray-700/50" data-testid="card-investment-analysis">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isHomebuyer ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
            {isHomebuyer
              ? <Home className="w-5 h-5 text-cyan-400 icon-glow-cyan" />
              : <TrendingUp className="w-5 h-5 text-purple-400 icon-glow-purple" />}
          </div>
          <CardTitle className="text-white">
            {isHomebuyer ? 'Home Purchase Analysis' : 'Investment Analysis'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            {isHomebuyer ? 'Buying Outlook' : 'Investment Outlook'}
          </h4>
          <div className="space-y-4">
            {displayPhases.map((phase, index) => (
              <div key={index} className="space-y-2" data-testid={`phase-${index}`}>
                <h5 className="font-semibold text-sm flex items-center gap-2 text-white">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${
                    isHomebuyer
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  }`}>
                    {index + 1}
                  </span>
                  {phase.title}
                </h5>
                <p className="text-sm text-gray-400 pl-8">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700">
          {/* Pros */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {isHomebuyer ? 'Why Buy Here' : 'Pros'}
            </h4>
            <ul className="space-y-2">
              {displayPros.map((pro, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`pro-${index}`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{pro}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              {isHomebuyer ? 'Things to Consider' : 'Cons'}
            </h4>
            <ul className="space-y-2">
              {displayCons.map((con, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`con-${index}`}
                >
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
