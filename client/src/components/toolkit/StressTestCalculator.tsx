import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { HelpCircle, ShieldAlert, BookOpen, TrendingDown, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-cyan-400 cursor-help ml-1 inline-block" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface StressScenario {
  vacancyMonths: number;
  repairIncrease: number;
  rentDecline: number;
  rateIncrease: number;
  insuranceIncrease: number;
}

interface BaseInputs {
  propertyPrice: number;
  monthlyRent: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  maintenancePercent: number;
  vacancyPercent: number;
  hoaMonthly: number;
  closingCostsPercent: number;
}

function calculateMetrics(inputs: BaseInputs) {
  const monthlyRate = inputs.interestRate / 100 / 12;
  const numPayments = inputs.loanTermYears * 12;
  const loanAmount = inputs.propertyPrice * (1 - inputs.downPaymentPercent / 100);
  const monthlyMortgage = monthlyRate > 0 && loanAmount > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;

  const monthlyPropertyTax = (inputs.propertyPrice * inputs.propertyTaxRate / 100) / 12;
  const monthlyInsurance = inputs.insuranceAnnual / 12;
  const monthlyMaintenance = (inputs.propertyPrice * inputs.maintenancePercent / 100) / 12;
  const monthlyVacancyReserve = inputs.monthlyRent * inputs.vacancyPercent / 100;
  const monthlyOperatingExpenses = monthlyPropertyTax + monthlyInsurance + monthlyMaintenance + inputs.hoaMonthly;
  const totalMonthlyExpenses = monthlyMortgage + monthlyOperatingExpenses + monthlyVacancyReserve;

  const monthlyCashFlow = inputs.monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  const annualGrossRent = inputs.monthlyRent * 12;
  const annualVacancyLoss = annualGrossRent * (inputs.vacancyPercent / 100);
  const annualEffectiveRent = annualGrossRent - annualVacancyLoss;
  const annualOperatingExpenses = monthlyOperatingExpenses * 12;
  const noi = annualEffectiveRent - annualOperatingExpenses;

  const capRate = inputs.propertyPrice > 0 ? (noi / inputs.propertyPrice) * 100 : 0;

  const downPayment = inputs.propertyPrice * inputs.downPaymentPercent / 100;
  const closingCosts = inputs.propertyPrice * inputs.closingCostsPercent / 100;
  const totalCashInvested = downPayment + closingCosts;
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  return { monthlyCashFlow, annualCashFlow, noi, capRate, cashOnCash, totalCashInvested, monthlyMortgage };
}

function applyStress(base: BaseInputs, stress: StressScenario): BaseInputs {
  const vacancyPercent = (stress.vacancyMonths / 12) * 100;
  const stressedRent = base.monthlyRent * (1 - stress.rentDecline / 100);
  const stressedMaintenance = base.maintenancePercent * (1 + stress.repairIncrease / 100);
  const stressedRate = base.interestRate + stress.rateIncrease;
  const stressedInsurance = base.insuranceAnnual * (1 + stress.insuranceIncrease / 100);

  return {
    ...base,
    monthlyRent: stressedRent,
    vacancyPercent,
    maintenancePercent: stressedMaintenance,
    interestRate: stressedRate,
    insuranceAnnual: stressedInsurance,
  };
}

function ComparisonRow({ label, baseValue, stressValue, format = 'currency', tooltip }: {
  label: string;
  baseValue: number;
  stressValue: number;
  format?: 'currency' | 'percent';
  tooltip?: string;
}) {
  const diff = stressValue - baseValue;
  const isNegativeImpact = diff < -0.005;
  const isPositiveImpact = diff > 0.005;
  const formatted = format === 'currency' ? formatCurrency : formatPercent;

  return (
    <div className="grid grid-cols-4 gap-2 items-center py-2 border-b border-gray-700/50 last:border-0">
      <div className="text-gray-400 text-sm flex items-center col-span-1">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="text-gray-300 font-medium text-sm text-right" data-testid={`stress-base-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        {formatted(baseValue)}
      </div>
      <div className={`font-medium text-sm text-right ${isNegativeImpact ? 'text-red-400' : isPositiveImpact ? 'text-green-400' : 'text-gray-300'}`} data-testid={`stress-stressed-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        {formatted(stressValue)}
      </div>
      <div className={`text-xs text-right font-medium ${isNegativeImpact ? 'text-red-400' : isPositiveImpact ? 'text-green-400' : 'text-gray-500'}`}>
        {format === 'currency'
          ? (diff >= 0 ? '+' : '') + formatCurrency(diff)
          : (diff >= 0 ? '+' : '') + diff.toFixed(2) + 'pp'}
      </div>
    </div>
  );
}

export default function StressTestCalculator() {
  const [inputs, setInputs] = useState<BaseInputs>({
    propertyPrice: 350000,
    monthlyRent: 2000,
    downPaymentPercent: 20,
    interestRate: 6.5,
    loanTermYears: 30,
    propertyTaxRate: 1.1,
    insuranceAnnual: 1750,
    maintenancePercent: 1,
    vacancyPercent: 8,
    hoaMonthly: 0,
    closingCostsPercent: 3,
  });

  const [stress, setStress] = useState<StressScenario>({
    vacancyMonths: 2,
    repairIncrease: 20,
    rentDecline: 5,
    rateIncrease: 1,
    insuranceIncrease: 15,
  });

  const updateInput = (key: keyof BaseInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const baseMetrics = calculateMetrics(inputs);
  const stressedInputs = applyStress(inputs, stress);
  const stressedMetrics = calculateMetrics(stressedInputs);

  const surviveStress = stressedMetrics.monthlyCashFlow >= 0;
  const severity = stressedMetrics.monthlyCashFlow >= 0
    ? 'survives'
    : stressedMetrics.annualCashFlow > -5000
      ? 'marginal'
      : 'fails';

  return (
    <Card className="glass border-gray-700/50" data-testid="card-stress-test-standalone">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
          Investment Stress Test
          <Badge className="ml-2 bg-orange-500/20 text-orange-400 border-orange-500/30">
            Risk Analysis
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Simulate worst-case scenarios to see if your investment can survive adversity. Adjust the sliders to model vacancy gaps, rising costs, rent drops, and rate hikes — all at once.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-300 flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-gray-400" />
              Property Details
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-400 text-sm">Property Price</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input type="number" value={inputs.propertyPrice} onChange={(e) => updateInput('propertyPrice', Number(e.target.value))} className="pl-7 bg-gray-800/50 border-gray-700" data-testid="stress-input-price" />
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Monthly Rent</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input type="number" value={inputs.monthlyRent} onChange={(e) => updateInput('monthlyRent', Number(e.target.value))} className="pl-7 bg-gray-800/50 border-gray-700" data-testid="stress-input-rent" />
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Down Payment (%)</Label>
                <Input type="number" value={inputs.downPaymentPercent} onChange={(e) => updateInput('downPaymentPercent', Number(e.target.value))} className="mt-1 bg-gray-800/50 border-gray-700" data-testid="stress-input-down" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Interest Rate (%)</Label>
                <Input type="number" step="0.125" value={inputs.interestRate} onChange={(e) => updateInput('interestRate', Number(e.target.value))} className="mt-1 bg-gray-800/50 border-gray-700" data-testid="stress-input-rate" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Property Tax Rate (%)</Label>
                <Input type="number" step="0.1" value={inputs.propertyTaxRate} onChange={(e) => updateInput('propertyTaxRate', Number(e.target.value))} className="mt-1 bg-gray-800/50 border-gray-700" data-testid="stress-input-tax" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Annual Insurance ($)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input type="number" value={inputs.insuranceAnnual} onChange={(e) => updateInput('insuranceAnnual', Number(e.target.value))} className="pl-7 bg-gray-800/50 border-gray-700" data-testid="stress-input-insurance" />
                </div>
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Maintenance (%/year)</Label>
                <Input type="number" step="0.25" value={inputs.maintenancePercent} onChange={(e) => updateInput('maintenancePercent', Number(e.target.value))} className="mt-1 bg-gray-800/50 border-gray-700" data-testid="stress-input-maintenance" />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">HOA Monthly ($)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input type="number" value={inputs.hoaMonthly} onChange={(e) => updateInput('hoaMonthly', Number(e.target.value))} className="pl-7 bg-gray-800/50 border-gray-700" data-testid="stress-input-hoa" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <h4 className="font-medium text-gray-300 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Stress Scenarios
            </h4>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-sm flex items-center">
                    Vacancy
                    <InfoTooltip content="How many months per year the property sits empty with no rental income." />
                  </Label>
                  <span className="text-orange-400 font-semibold text-sm" data-testid="stress-vacancy-value">{stress.vacancyMonths} months/year</span>
                </div>
                <Slider
                  value={[stress.vacancyMonths]}
                  onValueChange={([v]) => setStress(p => ({ ...p, vacancyMonths: v }))}
                  min={0} max={6} step={0.5}
                  className="accent-orange-400"
                  data-testid="stress-slider-vacancy"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0 mo</span><span>3 mo</span><span>6 mo</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-sm flex items-center">
                    Repair Cost Increase
                    <InfoTooltip content="Unexpected repairs and maintenance costs above your normal budget. A 20% increase means spending $1,200 instead of $1,000 on annual maintenance." />
                  </Label>
                  <span className="text-orange-400 font-semibold text-sm" data-testid="stress-repair-value">+{stress.repairIncrease}%</span>
                </div>
                <Slider
                  value={[stress.repairIncrease]}
                  onValueChange={([v]) => setStress(p => ({ ...p, repairIncrease: v }))}
                  min={0} max={100} step={5}
                  data-testid="stress-slider-repair"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-sm flex items-center">
                    Rent Decline
                    <InfoTooltip content="Market downturn causing rents to drop. A 10% decline means collecting $1,800 instead of $2,000/month." />
                  </Label>
                  <span className="text-orange-400 font-semibold text-sm" data-testid="stress-rent-value">-{stress.rentDecline}%</span>
                </div>
                <Slider
                  value={[stress.rentDecline]}
                  onValueChange={([v]) => setStress(p => ({ ...p, rentDecline: v }))}
                  min={0} max={30} step={1}
                  data-testid="stress-slider-rent"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span><span>15%</span><span>30%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-sm flex items-center">
                    Rate Increase
                    <InfoTooltip content="If you have an adjustable-rate mortgage or need to refinance. Shows impact of higher interest rates on your payments." />
                  </Label>
                  <span className="text-orange-400 font-semibold text-sm" data-testid="stress-rate-value">+{stress.rateIncrease}pp</span>
                </div>
                <Slider
                  value={[stress.rateIncrease]}
                  onValueChange={([v]) => setStress(p => ({ ...p, rateIncrease: v }))}
                  min={0} max={3} step={0.25}
                  data-testid="stress-slider-rate"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0pp</span><span>1.5pp</span><span>3pp</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-sm flex items-center">
                    Insurance Increase
                    <InfoTooltip content="Rising insurance premiums due to climate risk, market conditions, or claims history." />
                  </Label>
                  <span className="text-orange-400 font-semibold text-sm" data-testid="stress-insurance-value">+{stress.insuranceIncrease}%</span>
                </div>
                <Slider
                  value={[stress.insuranceIncrease]}
                  onValueChange={([v]) => setStress(p => ({ ...p, insuranceIncrease: v }))}
                  min={0} max={100} step={5}
                  data-testid="stress-slider-insurance"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-300">Base vs. Stress Comparison</h4>

            <div className={`rounded-lg p-4 ${severity === 'survives' ? 'bg-green-500/10 border border-green-500/30' : severity === 'marginal' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`} data-testid="stress-verdict">
              <div className="flex items-center gap-2 mb-2">
                {severity === 'survives' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : severity === 'marginal' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-bold text-lg ${severity === 'survives' ? 'text-green-400' : severity === 'marginal' ? 'text-yellow-400' : 'text-red-400'}`} data-testid="stress-verdict-text">
                  {severity === 'survives' ? 'Survives Stress Test' : severity === 'marginal' ? 'Marginal — Tight Cash Flow' : 'Fails Stress Test'}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {severity === 'survives'
                  ? 'This investment stays cash-flow positive even under these pessimistic assumptions. Strong resilience.'
                  : severity === 'marginal'
                    ? 'Cash flow turns slightly negative under stress. You could survive short-term but should build reserves.'
                    : 'Under these conditions, you would lose money each month. Consider building larger cash reserves or negotiating a lower price.'}
              </p>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-2 items-center pb-2 mb-2 border-b border-gray-600">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Metric</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide text-right">Base</div>
                <div className="text-xs text-orange-400/70 uppercase tracking-wide text-right">Stressed</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide text-right">Impact</div>
              </div>

              <ComparisonRow label="Monthly Cash Flow" baseValue={baseMetrics.monthlyCashFlow} stressValue={stressedMetrics.monthlyCashFlow} />
              <ComparisonRow label="Annual Cash Flow" baseValue={baseMetrics.annualCashFlow} stressValue={stressedMetrics.annualCashFlow} />
              <ComparisonRow label="NOI" baseValue={baseMetrics.noi} stressValue={stressedMetrics.noi} />
              <ComparisonRow label="Cap Rate" baseValue={baseMetrics.capRate} stressValue={stressedMetrics.capRate} format="percent" />
              <ComparisonRow label="Cash-on-Cash" baseValue={baseMetrics.cashOnCash} stressValue={stressedMetrics.cashOnCash} format="percent" />
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-gray-400" />
                Annual Impact Summary
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Lost rent from vacancy</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(inputs.monthlyRent * stress.vacancyMonths)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Extra repair costs</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(inputs.propertyPrice * inputs.maintenancePercent / 100 * stress.repairIncrease / 100)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Rent decline impact</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(inputs.monthlyRent * stress.rentDecline / 100 * 12)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Extra mortgage cost</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(Math.max(0, (stressedMetrics.monthlyMortgage - baseMetrics.monthlyMortgage) * 12))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Extra insurance cost</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(inputs.insuranceAnnual * stress.insuranceIncrease / 100)}</span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between items-center font-medium">
                  <span className="text-white">Total annual impact</span>
                  <span className="text-red-400 font-bold">{formatCurrency(stressedMetrics.annualCashFlow - baseMetrics.annualCashFlow)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
