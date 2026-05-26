import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, DollarSign, Target, HelpCircle, Sparkles, AlertCircle, CheckCircle2, ShieldAlert, AlertTriangle, BookOpen } from 'lucide-react';
import type { PropertyAnalysisResult } from '@shared/schema';

interface InvestmentCalculatorsProps {
  analysisResult: PropertyAnalysisResult;
}

interface CalculatorInputs {
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
  targetCashOnCash: number;
}

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

function GuidanceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-cyan-400 text-sm mb-1">{title}</h4>
          <p className="text-gray-300 text-sm">{children}</p>
        </div>
      </div>
    </div>
  );
}

function ResultBadge({ value, goodThreshold, badThreshold, format = 'percent', inverse = false }: { 
  value: number; 
  goodThreshold: number; 
  badThreshold: number; 
  format?: 'percent' | 'currency' | 'years';
  inverse?: boolean;
}) {
  let isGood = inverse ? value <= goodThreshold : value >= goodThreshold;
  let isBad = inverse ? value >= badThreshold : value <= badThreshold;
  
  const displayValue = format === 'percent' ? formatPercent(value) : 
                       format === 'currency' ? formatCurrency(value) :
                       `${value.toFixed(1)} years`;
  
  if (isGood) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {displayValue}
      </Badge>
    );
  }
  if (isBad) {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <AlertCircle className="w-3 h-3 mr-1" />
        {displayValue}
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
      {displayValue}
    </Badge>
  );
}

export default function InvestmentCalculators({ analysisResult }: InvestmentCalculatorsProps) {
  // Extract default values from analysis result
  const defaultPropertyPrice = analysisResult.estimatedPropertyPrice?.price || 
    analysisResult.forecastData?.homeValueForecast?.currentValue || 350000;
  
  const defaultMonthlyRent = analysisResult.forecastData?.rentalEstimate?.estimatedRent ||
    analysisResult.demographics?.medianRent || 2000;
  
  const defaultInterestRate = analysisResult.affordabilityData?.mortgageTrends?.currentRate || 6.5;
  
  const defaultPropertyTaxRate = analysisResult.affordabilityData?.propertyTax?.effectiveTaxRate || 1.1;

  const [inputs, setInputs] = useState<CalculatorInputs>({
    propertyPrice: defaultPropertyPrice,
    monthlyRent: defaultMonthlyRent,
    downPaymentPercent: 20,
    interestRate: defaultInterestRate,
    loanTermYears: 30,
    propertyTaxRate: defaultPropertyTaxRate,
    insuranceAnnual: Math.round(defaultPropertyPrice * 0.005), // ~0.5% of property value
    maintenancePercent: 1,
    vacancyPercent: 8,
    hoaMonthly: 0,
    closingCostsPercent: 3,
    targetCashOnCash: 10,
  });

  // Update inputs when analysis result changes
  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      propertyPrice: defaultPropertyPrice,
      monthlyRent: defaultMonthlyRent,
      interestRate: defaultInterestRate,
      propertyTaxRate: defaultPropertyTaxRate,
      insuranceAnnual: Math.round(defaultPropertyPrice * 0.005),
    }));
  }, [defaultPropertyPrice, defaultMonthlyRent, defaultInterestRate, defaultPropertyTaxRate]);

  const [stress, setStress] = useState({
    vacancyMonths: 2,
    repairIncrease: 20,
    rentDecline: 5,
    rateIncrease: 1,
    insuranceIncrease: 15,
  });

  const updateInput = (key: keyof CalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // Helper function to calculate mortgage payment for a given loan amount
  const calculateMortgagePayment = (principal: number) => {
    const monthlyRate = inputs.interestRate / 100 / 12;
    const numPayments = inputs.loanTermYears * 12;
    if (monthlyRate <= 0 || principal <= 0) return 0;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  // Calculate mortgage payment for current property price
  const loanAmount = inputs.propertyPrice * (1 - inputs.downPaymentPercent / 100);
  const monthlyMortgage = calculateMortgagePayment(loanAmount);

  // Calculate monthly expenses (price-dependent)
  const monthlyPropertyTax = (inputs.propertyPrice * inputs.propertyTaxRate / 100) / 12;
  const monthlyInsurance = inputs.insuranceAnnual / 12;
  const monthlyMaintenance = (inputs.propertyPrice * inputs.maintenancePercent / 100) / 12;
  
  // Vacancy as dollar amount (for display purposes)
  const monthlyVacancyReserve = inputs.monthlyRent * inputs.vacancyPercent / 100;

  // Operating expenses (excluding mortgage and vacancy - used for NOI)
  const monthlyOperatingExpenses = monthlyPropertyTax + monthlyInsurance + monthlyMaintenance + inputs.hoaMonthly;
  
  // Total monthly expenses (includes mortgage, operating expenses, and vacancy reserve)
  // Note: We use gross rent and subtract vacancy as an expense (not effective rent)
  const totalMonthlyExpenses = monthlyMortgage + monthlyOperatingExpenses + monthlyVacancyReserve;

  // Cash Flow Calculations - using GROSS rent minus ALL expenses including vacancy
  const monthlyCashFlow = inputs.monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // For display purposes - effective rent after vacancy
  const effectiveMonthlyRent = inputs.monthlyRent - monthlyVacancyReserve;

  // NOI (Net Operating Income) - before debt service, after vacancy
  const annualGrossRent = inputs.monthlyRent * 12;
  const annualVacancyLoss = annualGrossRent * (inputs.vacancyPercent / 100);
  const annualEffectiveRent = annualGrossRent - annualVacancyLoss;
  const annualOperatingExpenses = monthlyOperatingExpenses * 12;
  const noi = annualEffectiveRent - annualOperatingExpenses;

  // Cap Rate
  const capRate = (noi / inputs.propertyPrice) * 100;

  // Cash-on-Cash Return
  const downPayment = inputs.propertyPrice * inputs.downPaymentPercent / 100;
  const closingCosts = inputs.propertyPrice * inputs.closingCostsPercent / 100;
  const totalCashInvested = downPayment + closingCosts;
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  // Maximum Offer Price (to achieve target CoC)
  // We need to solve for price P where:
  // Target CoC = Annual Cash Flow / Total Cash Invested
  // Annual Cash Flow = (Gross Rent - Vacancy) - (Mortgage + OpEx) * 12
  // Total Cash Invested = P * (DownPayment% + ClosingCosts%)
  // 
  // This is iterative because mortgage, taxes, maintenance all depend on price
  // We'll use a simple iterative approach to find the max price
  const calculateCashFlowForPrice = (price: number) => {
    const loan = price * (1 - inputs.downPaymentPercent / 100);
    const mortgage = calculateMortgagePayment(loan);
    const propTax = (price * inputs.propertyTaxRate / 100) / 12;
    const maintenance = (price * inputs.maintenancePercent / 100) / 12;
    const opEx = propTax + monthlyInsurance + maintenance + inputs.hoaMonthly;
    const vacancy = inputs.monthlyRent * inputs.vacancyPercent / 100;
    const monthlyCF = inputs.monthlyRent - mortgage - opEx - vacancy;
    return monthlyCF * 12;
  };
  
  const calculateCoCForPrice = (price: number) => {
    const cashInvested = price * (inputs.downPaymentPercent / 100 + inputs.closingCostsPercent / 100);
    if (cashInvested <= 0) return 0;
    return (calculateCashFlowForPrice(price) / cashInvested) * 100;
  };

  // Binary search for max offer price that achieves target CoC
  let maxOfferPrice = 0;
  let low = 10000;
  let high = inputs.propertyPrice * 2;
  
  // If current CoC >= target, max offer could be higher than current price
  // If current CoC < target, max offer must be lower
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const cocAtMid = calculateCoCForPrice(mid);
    
    if (Math.abs(cocAtMid - inputs.targetCashOnCash) < 0.01) {
      maxOfferPrice = mid;
      break;
    }
    
    // Higher price = lower CoC (more investment, similar cash flow)
    if (cocAtMid > inputs.targetCashOnCash) {
      low = mid; // Can afford to pay more
    } else {
      high = mid; // Need to pay less
    }
    maxOfferPrice = mid;
  }
  
  // Clamp to reasonable bounds
  maxOfferPrice = Math.max(0, Math.min(maxOfferPrice, inputs.propertyPrice * 3));

  // 1% Rule check
  const onePercentRuleRatio = (inputs.monthlyRent / inputs.propertyPrice) * 100;
  const meetsOnePercentRule = onePercentRuleRatio >= 1;

  // GRM (Gross Rent Multiplier)
  const grm = inputs.propertyPrice / annualGrossRent;

  // Stress Test Calculations — uses same formula as base, with stressed inputs
  const calcMetrics = (i: { propertyPrice: number; monthlyRent: number; downPaymentPercent: number; interestRate: number; loanTermYears: number; propertyTaxRate: number; insuranceAnnual: number; maintenancePercent: number; vacancyPercent: number; hoaMonthly: number; closingCostsPercent: number }) => {
    const mRate = i.interestRate / 100 / 12;
    const nPay = i.loanTermYears * 12;
    const loan = i.propertyPrice * (1 - i.downPaymentPercent / 100);
    const mortgage = mRate > 0 && loan > 0
      ? (loan * mRate * Math.pow(1 + mRate, nPay)) / (Math.pow(1 + mRate, nPay) - 1) : 0;
    const mPropTax = (i.propertyPrice * i.propertyTaxRate / 100) / 12;
    const mIns = i.insuranceAnnual / 12;
    const mMaint = (i.propertyPrice * i.maintenancePercent / 100) / 12;
    const mVacancy = i.monthlyRent * i.vacancyPercent / 100;
    const mOpEx = mPropTax + mIns + mMaint + i.hoaMonthly;
    const mTotal = mortgage + mOpEx + mVacancy;
    const mCF = i.monthlyRent - mTotal;
    const aCF = mCF * 12;
    const aGross = i.monthlyRent * 12;
    const aVacLoss = aGross * (i.vacancyPercent / 100);
    const aEffRent = aGross - aVacLoss;
    const aOpEx = mOpEx * 12;
    const noiVal = aEffRent - aOpEx;
    const capRateVal = i.propertyPrice > 0 ? (noiVal / i.propertyPrice) * 100 : 0;
    const dp = i.propertyPrice * i.downPaymentPercent / 100;
    const cc = i.propertyPrice * i.closingCostsPercent / 100;
    const totalInv = dp + cc;
    const cocVal = totalInv > 0 ? (aCF / totalInv) * 100 : 0;
    return { monthlyCashFlow: mCF, annualCashFlow: aCF, noi: noiVal, capRate: capRateVal, cashOnCash: cocVal, mortgage };
  };

  const stressedInputs = {
    ...inputs,
    monthlyRent: inputs.monthlyRent * (1 - stress.rentDecline / 100),
    vacancyPercent: (stress.vacancyMonths / 12) * 100,
    maintenancePercent: inputs.maintenancePercent * (1 + stress.repairIncrease / 100),
    interestRate: inputs.interestRate + stress.rateIncrease,
    insuranceAnnual: inputs.insuranceAnnual * (1 + stress.insuranceIncrease / 100),
  };

  const stressedMetrics = calcMetrics(stressedInputs);
  const stressedMonthlyCF = stressedMetrics.monthlyCashFlow;
  const stressedAnnualCF = stressedMetrics.annualCashFlow;
  const stressedNoi = stressedMetrics.noi;
  const stressedCapRate = stressedMetrics.capRate;
  const stressedCoC = stressedMetrics.cashOnCash;
  const stressedMortgage = stressedMetrics.mortgage;

  const stressSeverity = stressedMonthlyCF >= 0
    ? 'survives'
    : stressedAnnualCF > -5000
      ? 'marginal'
      : 'fails';

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Calculator className="w-5 h-5 text-cyan-400" />
          Investment Calculators
          <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            Auto-Populated
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Numbers are pre-filled from your property analysis. Adjust any values to see how they affect your returns.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cashflow" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800/50" data-testid="calculator-tabs">
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm" data-testid="tab-cashflow">
              Cash Flow
            </TabsTrigger>
            <TabsTrigger value="caprate" className="text-xs sm:text-sm" data-testid="tab-caprate">
              Cap Rate
            </TabsTrigger>
            <TabsTrigger value="coc" className="text-xs sm:text-sm" data-testid="tab-coc">
              Cash-on-Cash
            </TabsTrigger>
            <TabsTrigger value="maxoffer" className="text-xs sm:text-sm" data-testid="tab-maxoffer">
              Max Offer
            </TabsTrigger>
            <TabsTrigger value="stresstest" className="text-xs sm:text-sm" data-testid="tab-stresstest">
              Stress Test
            </TabsTrigger>
          </TabsList>

          {/* Cash Flow Calculator */}
          <TabsContent value="cashflow" className="mt-4">
            <GuidanceCard title="What is Cash Flow?">
              Cash flow is the money left over each month after collecting rent and paying all expenses including mortgage, taxes, insurance, and maintenance. Positive cash flow means you're earning money; negative means you're paying out of pocket.
            </GuidanceCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-300 flex items-center gap-1">
                  Property Details
                  <InfoTooltip content="These values are pre-filled from your property analysis. Adjust them to match your specific situation." />
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Property Price
                      <InfoTooltip content="The purchase price or current market value of the property." />
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        type="number"
                        value={inputs.propertyPrice}
                        onChange={(e) => updateInput('propertyPrice', Number(e.target.value))}
                        className="pl-7 bg-gray-800/50 border-gray-700"
                        data-testid="input-property-price"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Monthly Rent
                      <InfoTooltip content="Expected monthly rental income. Pre-filled with RentCast estimate or area median rent." />
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        type="number"
                        value={inputs.monthlyRent}
                        onChange={(e) => updateInput('monthlyRent', Number(e.target.value))}
                        className="pl-7 bg-gray-800/50 border-gray-700"
                        data-testid="input-monthly-rent"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Down Payment (%)
                      <InfoTooltip content="Percentage of purchase price paid upfront. Typical: 20% for investment properties, 3-5% for primary residence with PMI." />
                    </Label>
                    <Input
                      type="number"
                      value={inputs.downPaymentPercent}
                      onChange={(e) => updateInput('downPaymentPercent', Number(e.target.value))}
                      className="mt-1 bg-gray-800/50 border-gray-700"
                      data-testid="input-down-payment"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Interest Rate (%)
                      <InfoTooltip content="Annual mortgage interest rate. Pre-filled with current 30-year fixed rate from FRED data." />
                    </Label>
                    <Input
                      type="number"
                      step="0.125"
                      value={inputs.interestRate}
                      onChange={(e) => updateInput('interestRate', Number(e.target.value))}
                      className="mt-1 bg-gray-800/50 border-gray-700"
                      data-testid="input-interest-rate"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Vacancy Rate (%)
                      <InfoTooltip content="Expected percentage of time the property is vacant. Industry standard: 8% (about 1 month per year)." />
                    </Label>
                    <Input
                      type="number"
                      value={inputs.vacancyPercent}
                      onChange={(e) => updateInput('vacancyPercent', Number(e.target.value))}
                      className="mt-1 bg-gray-800/50 border-gray-700"
                      data-testid="input-vacancy"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      HOA Monthly
                      <InfoTooltip content="Monthly homeowners association fees, if applicable. Enter $0 if none." />
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        type="number"
                        value={inputs.hoaMonthly}
                        onChange={(e) => updateInput('hoaMonthly', Number(e.target.value))}
                        className="pl-7 bg-gray-800/50 border-gray-700"
                        data-testid="input-hoa"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">Cash Flow Analysis</h4>
                
                <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Monthly Income</span>
                    <span className="text-green-400 font-medium">{formatCurrency(effectiveMonthlyRent)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Monthly Expenses</span>
                    <span className="text-red-400 font-medium">-{formatCurrency(totalMonthlyExpenses)}</span>
                  </div>
                  <hr className="border-gray-700" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Monthly Cash Flow</span>
                    <span className={`text-lg font-bold ${monthlyCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="result-monthly-cashflow">
                      {formatCurrency(monthlyCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Annual Cash Flow</span>
                    <span className={`text-lg font-bold ${annualCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="result-annual-cashflow">
                      {formatCurrency(annualCashFlow)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
                  <h5 className="text-sm font-medium text-gray-300">Expense Breakdown</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mortgage (P&I)</span>
                      <span className="text-gray-300">{formatCurrency(monthlyMortgage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Property Tax</span>
                      <span className="text-gray-300">{formatCurrency(monthlyPropertyTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Insurance</span>
                      <span className="text-gray-300">{formatCurrency(monthlyInsurance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Maintenance Reserve</span>
                      <span className="text-gray-300">{formatCurrency(monthlyMaintenance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vacancy Reserve</span>
                      <span className="text-gray-300">{formatCurrency(monthlyVacancyReserve)}</span>
                    </div>
                    {inputs.hoaMonthly > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">HOA</span>
                        <span className="text-gray-300">{formatCurrency(inputs.hoaMonthly)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 1% Rule Check */}
                <div className={`rounded-lg p-4 ${meetsOnePercentRule ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {meetsOnePercentRule ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className={`font-medium ${meetsOnePercentRule ? 'text-green-400' : 'text-yellow-400'}`}>
                      1% Rule: {formatPercent(onePercentRuleRatio)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {meetsOnePercentRule 
                      ? "This property meets the 1% rule - monthly rent is at least 1% of purchase price, indicating good cash flow potential."
                      : "This property doesn't meet the 1% rule. Consider negotiating a lower price or finding ways to increase rent."}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cap Rate Calculator */}
          <TabsContent value="caprate" className="mt-4">
            <GuidanceCard title="What is Cap Rate?">
              Cap Rate (Capitalization Rate) measures a property's return potential, ignoring financing. It's calculated as Net Operating Income divided by Property Price. Higher cap rates suggest better returns but may indicate higher risk. Typical residential cap rates: 4-10%.
            </GuidanceCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">NOI Components</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Annual Gross Rent</Label>
                    <div className="text-xl font-semibold text-white mt-1">{formatCurrency(annualGrossRent)}</div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Vacancy Loss ({inputs.vacancyPercent}%)
                      <InfoTooltip content="Reduces gross rent by expected vacancy. Adjust in Cash Flow tab." />
                    </Label>
                    <div className="text-lg text-red-400 mt-1">-{formatCurrency(annualGrossRent * inputs.vacancyPercent / 100)}</div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm">Effective Gross Income</Label>
                    <div className="text-lg text-green-400 mt-1">{formatCurrency(annualEffectiveRent)}</div>
                  </div>

                  <hr className="border-gray-700" />

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Operating Expenses
                      <InfoTooltip content="Includes property tax, insurance, and maintenance. Does NOT include mortgage payments." />
                    </Label>
                    <div className="text-lg text-red-400 mt-1">-{formatCurrency(annualOperatingExpenses)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">Results</h4>
                
                <div className="bg-gray-800/30 rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-2">Net Operating Income (NOI)</div>
                  <div className="text-3xl font-bold text-cyan-400 mb-4" data-testid="result-noi">
                    {formatCurrency(noi)}
                  </div>
                  
                  <div className="text-gray-400 mb-2">Cap Rate</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-white" data-testid="result-cap-rate">
                      {formatPercent(capRate)}
                    </span>
                    <ResultBadge value={capRate} goodThreshold={6} badThreshold={4} />
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-3">Cap Rate Benchmarks</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Class A (Low Risk)</span>
                      <span className="text-gray-300">3-5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Class B (Moderate)</span>
                      <span className="text-gray-300">5-7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Class C (Higher Risk)</span>
                      <span className="text-gray-300">7-10%+</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                    GRM (Gross Rent Multiplier)
                    <InfoTooltip content="Property price divided by annual rent. Lower GRM = faster payback. Typical range: 8-15 years." />
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{grm.toFixed(1)}</span>
                    <span className="text-gray-400">years</span>
                    <ResultBadge value={grm} goodThreshold={12} badThreshold={18} format="years" inverse={true} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cash-on-Cash Return */}
          <TabsContent value="coc" className="mt-4">
            <GuidanceCard title="What is Cash-on-Cash Return?">
              Cash-on-Cash (CoC) measures the annual return on your actual cash invested (down payment + closing costs). Unlike cap rate, it accounts for financing. A CoC of 8-12% is generally considered good for rental properties.
            </GuidanceCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">Investment Details</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Down Payment ({inputs.downPaymentPercent}%)
                      <InfoTooltip content="Cash paid upfront toward purchase price." />
                    </Label>
                    <div className="text-xl font-semibold text-white mt-1">{formatCurrency(downPayment)}</div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Closing Costs ({inputs.closingCostsPercent}%)
                      <InfoTooltip content="Fees for loan origination, title, inspection, etc. Typically 2-5% of purchase price." />
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={inputs.closingCostsPercent}
                      onChange={(e) => updateInput('closingCostsPercent', Number(e.target.value))}
                      className="mt-1 bg-gray-800/50 border-gray-700"
                    />
                    <div className="text-sm text-gray-400 mt-1">{formatCurrency(closingCosts)}</div>
                  </div>

                  <hr className="border-gray-700" />

                  <div>
                    <Label className="text-gray-400 text-sm">Total Cash Invested</Label>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">{formatCurrency(totalCashInvested)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">Returns</h4>
                
                <div className="bg-gray-800/30 rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-2">Annual Cash Flow</div>
                  <div className={`text-2xl font-bold mb-4 ${annualCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(annualCashFlow)}
                  </div>
                  
                  <div className="text-gray-400 mb-2">Cash-on-Cash Return</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-4xl font-bold ${cashOnCash >= 0 ? 'text-white' : 'text-red-400'}`} data-testid="result-coc">
                      {formatPercent(cashOnCash)}
                    </span>
                    <ResultBadge value={cashOnCash} goodThreshold={8} badThreshold={4} />
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-3">CoC Benchmarks</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Excellent</span>
                      <span className="text-green-400">12%+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Good</span>
                      <span className="text-green-400">8-12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fair</span>
                      <span className="text-yellow-400">4-8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Poor</span>
                      <span className="text-red-400">&lt;4%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <strong className="text-cyan-400">Tip:</strong> Compare CoC to alternative investments. If you could earn 5% in a high-yield savings account with zero effort, your rental should beat that to justify the work.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Maximum Offer Price */}
          <TabsContent value="maxoffer" className="mt-4">
            <GuidanceCard title="What is Maximum Offer Price?">
              This calculator works backwards from your target return to determine the highest price you should pay for a property. Set your desired Cash-on-Cash return, and we'll calculate what offer price would achieve that goal.
            </GuidanceCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">Your Target Return</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-sm flex items-center">
                      Target Cash-on-Cash Return (%)
                      <InfoTooltip content="The minimum annual return on your cash investment that makes this deal worthwhile to you." />
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      value={inputs.targetCashOnCash}
                      onChange={(e) => updateInput('targetCashOnCash', Number(e.target.value))}
                      className="mt-1 bg-gray-800/50 border-gray-700"
                      data-testid="input-target-coc"
                    />
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Current Property Numbers</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Asking Price</span>
                        <span className="text-gray-300">{formatCurrency(inputs.propertyPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Rent</span>
                        <span className="text-gray-300">{formatCurrency(inputs.monthlyRent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current CoC</span>
                        <span className={cashOnCash >= inputs.targetCashOnCash ? 'text-green-400' : 'text-yellow-400'}>
                          {formatPercent(cashOnCash)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-300">Recommended Offer</h4>
                
                <div className={`rounded-lg p-6 text-center ${maxOfferPrice >= inputs.propertyPrice ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800/30'}`}>
                  <div className="text-gray-400 mb-2">Maximum Offer Price</div>
                  <div className="text-4xl font-bold text-cyan-400 mb-2" data-testid="result-max-offer">
                    {formatCurrency(maxOfferPrice)}
                  </div>
                  <div className="text-sm text-gray-400">
                    to achieve {formatPercent(inputs.targetCashOnCash)} CoC return
                  </div>
                </div>

                {maxOfferPrice < inputs.propertyPrice ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Target className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-yellow-400">Negotiation Needed</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          To hit your {formatPercent(inputs.targetCashOnCash)} target, you'd need to negotiate 
                          <strong className="text-yellow-400"> {formatCurrency(inputs.propertyPrice - maxOfferPrice)} off</strong> the asking price 
                          ({((1 - maxOfferPrice / inputs.propertyPrice) * 100).toFixed(1)}% discount).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-green-400">Great Deal!</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          At the current asking price, this property already exceeds your target return. 
                          You could pay up to {formatCurrency(maxOfferPrice - inputs.propertyPrice)} more and still hit your goal.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Quick Reference</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">For 8% CoC</span>
                      <span className="text-gray-300">{formatCurrency(inputs.propertyPrice * (inputs.monthlyRent / (((totalCashInvested * 0.08 / 12) + totalMonthlyExpenses))))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">For 10% CoC</span>
                      <span className="text-gray-300">{formatCurrency(inputs.propertyPrice * (inputs.monthlyRent / (((totalCashInvested * 0.10 / 12) + totalMonthlyExpenses))))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">For 12% CoC</span>
                      <span className="text-gray-300">{formatCurrency(inputs.propertyPrice * (inputs.monthlyRent / (((totalCashInvested * 0.12 / 12) + totalMonthlyExpenses))))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Stress Test */}
          <TabsContent value="stresstest" className="mt-4">
            <GuidanceCard title="What is Stress Testing?">
              Stress testing simulates worst-case scenarios to see if your investment can survive adversity. Adjust the sliders to model vacancy gaps, rising costs, rent drops, and rate hikes — all at once. If cash flow stays positive, you have a resilient investment.
            </GuidanceCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <InfoTooltip content="Unexpected repairs and maintenance costs above your normal budget." />
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
                        <InfoTooltip content="Market downturn causing rents to drop." />
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
                        <InfoTooltip content="If you have an adjustable-rate mortgage or need to refinance." />
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

                <div className={`rounded-lg p-4 ${stressSeverity === 'survives' ? 'bg-green-500/10 border border-green-500/30' : stressSeverity === 'marginal' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`} data-testid="stress-verdict">
                  <div className="flex items-center gap-2 mb-2">
                    {stressSeverity === 'survives' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : stressSeverity === 'marginal' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-bold text-lg ${stressSeverity === 'survives' ? 'text-green-400' : stressSeverity === 'marginal' ? 'text-yellow-400' : 'text-red-400'}`} data-testid="stress-verdict-text">
                      {stressSeverity === 'survives' ? 'Survives Stress Test' : stressSeverity === 'marginal' ? 'Marginal — Tight Cash Flow' : 'Fails Stress Test'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {stressSeverity === 'survives'
                      ? 'This investment stays cash-flow positive even under these pessimistic assumptions. Strong resilience.'
                      : stressSeverity === 'marginal'
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

                  {[
                    { label: 'Monthly CF', base: monthlyCashFlow, stressed: stressedMonthlyCF, fmt: 'currency' as const },
                    { label: 'Annual CF', base: annualCashFlow, stressed: stressedAnnualCF, fmt: 'currency' as const },
                    { label: 'NOI', base: noi, stressed: stressedNoi, fmt: 'currency' as const },
                    { label: 'Cap Rate', base: capRate, stressed: stressedCapRate, fmt: 'percent' as const },
                    { label: 'Cash-on-Cash', base: cashOnCash, stressed: stressedCoC, fmt: 'percent' as const },
                  ].map((row) => {
                    const diff = row.stressed - row.base;
                    const isNeg = diff < -0.005;
                    return (
                      <div key={row.label} className="grid grid-cols-4 gap-2 items-center py-2 border-b border-gray-700/50 last:border-0">
                        <div className="text-gray-400 text-sm">{row.label}</div>
                        <div className="text-gray-300 font-medium text-sm text-right">
                          {row.fmt === 'currency' ? formatCurrency(row.base) : formatPercent(row.base)}
                        </div>
                        <div className={`font-medium text-sm text-right ${isNeg ? 'text-red-400' : 'text-gray-300'}`}>
                          {row.fmt === 'currency' ? formatCurrency(row.stressed) : formatPercent(row.stressed)}
                        </div>
                        <div className={`text-xs text-right font-medium ${isNeg ? 'text-red-400' : 'text-gray-500'}`}>
                          {row.fmt === 'currency'
                            ? (diff >= 0 ? '+' : '') + formatCurrency(diff)
                            : (diff >= 0 ? '+' : '') + diff.toFixed(2) + 'pp'}
                        </div>
                      </div>
                    );
                  })}
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
                      <span className="text-red-400 font-medium">-{formatCurrency(Math.max(0, (stressedMortgage - monthlyMortgage) * 12))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Extra insurance cost</span>
                      <span className="text-red-400 font-medium">-{formatCurrency(inputs.insuranceAnnual * stress.insuranceIncrease / 100)}</span>
                    </div>
                    <hr className="border-gray-700" />
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-white">Total annual impact</span>
                      <span className="text-red-400 font-bold">{formatCurrency(stressedAnnualCF - annualCashFlow)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
