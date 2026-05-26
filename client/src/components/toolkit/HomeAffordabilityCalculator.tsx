import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Home, BookOpen, DollarSign, TrendingUp } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
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

export default function HomeAffordabilityCalculator() {
  const [annualIncome, setAnnualIncome] = useState(85000);
  const [monthlyDebts, setMonthlyDebts] = useState(500);
  const [downPayment, setDownPayment] = useState(60000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.1);
  const [insuranceAnnual, setInsuranceAnnual] = useState(1500);
  const [maxDtiTarget, setMaxDtiTarget] = useState(36);

  const grossMonthlyIncome = annualIncome / 12;
  const maxTotalMonthlyDebt = grossMonthlyIncome * (maxDtiTarget / 100);
  const maxHousingBudget = maxTotalMonthlyDebt - monthlyDebts;

  const monthlyInsurance = insuranceAnnual / 12;

  const calculateMaxLoanAmount = () => {
    if (maxHousingBudget <= 0) return 0;

    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;

    if (monthlyRate <= 0) return 0;

    let low = 0;
    let high = 2000000;
    let maxLoan = 0;

    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const totalHome = mid + downPayment;
      const monthlyPropTax = (totalHome * propertyTaxRate / 100) / 12;
      const mortgagePayment = (mid * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      const totalHousingPayment = mortgagePayment + monthlyPropTax + monthlyInsurance;

      if (totalHousingPayment <= maxHousingBudget) {
        maxLoan = mid;
        low = mid;
      } else {
        high = mid;
      }

      if (high - low < 100) break;
    }

    return Math.max(0, Math.round(maxLoan));
  };

  const maxLoanAmount = calculateMaxLoanAmount();
  const maxHomePrice = maxLoanAmount + downPayment;

  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const maxMortgagePayment = maxLoanAmount > 0 && monthlyRate > 0
    ? (maxLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;

  const monthlyPropertyTax = (maxHomePrice * propertyTaxRate / 100) / 12;
  const maxMonthlyPayment = maxMortgagePayment + monthlyPropertyTax + monthlyInsurance;

  const downPaymentPercent = maxHomePrice > 0 ? (downPayment / maxHomePrice) * 100 : 0;

  const totalBreakdown = maxMortgagePayment + monthlyPropertyTax + monthlyInsurance;
  const mortgageShare = totalBreakdown > 0 ? (maxMortgagePayment / totalBreakdown) * 100 : 0;
  const taxShare = totalBreakdown > 0 ? (monthlyPropertyTax / totalBreakdown) * 100 : 0;
  const insuranceShare = totalBreakdown > 0 ? (monthlyInsurance / totalBreakdown) * 100 : 0;

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap text-white">
          <Home className="w-5 h-5 text-cyan-400" />
          How Much House Can You Afford?
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Estimate the maximum home price you can afford based on your income, debts, and target DTI ratio.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Your Finances
                <InfoTooltip content="Enter your income and existing debts to calculate how much home you can afford." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Annual Gross Income
                    <InfoTooltip content="Your total yearly income before taxes, including salary, bonuses, and other regular income." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-annual-income"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Monthly: {formatCurrency(grossMonthlyIncome)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Monthly Debts (Non-Housing)
                    <InfoTooltip content="Total minimum monthly payments for non-housing debts: car loans, student loans, credit cards, personal loans, etc." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={monthlyDebts}
                      onChange={(e) => setMonthlyDebts(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-monthly-debts"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Down Payment Amount
                    <InfoTooltip content="The amount of cash you plan to put down on the home purchase." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-down-payment"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Loan Parameters
                <InfoTooltip content="Adjust these values to match your expected loan terms and local rates." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Interest Rate (%)
                    <InfoTooltip content="Expected annual mortgage interest rate. Current average 30-year fixed rate is around 6.5%." />
                  </Label>
                  <Input
                    type="number"
                    step="0.125"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="mt-1 bg-gray-800/50 border-gray-700"
                    data-testid="input-interest-rate"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Loan Term (Years)
                    <InfoTooltip content="Length of the mortgage. Common options: 15 or 30 years." />
                  </Label>
                  <Input
                    type="number"
                    value={loanTermYears}
                    onChange={(e) => setLoanTermYears(Number(e.target.value))}
                    className="mt-1 bg-gray-800/50 border-gray-700"
                    data-testid="input-loan-term"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Property Tax Rate (%)
                    <InfoTooltip content="Annual property tax rate as a percentage of home value. National average is about 1.1%." />
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={propertyTaxRate}
                    onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                    className="mt-1 bg-gray-800/50 border-gray-700"
                    data-testid="input-property-tax-rate"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Annual Insurance
                    <InfoTooltip content="Estimated annual homeowner's insurance premium." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={insuranceAnnual}
                      onChange={(e) => setInsuranceAnnual(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-insurance-annual"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Max DTI Target (%)
                    <InfoTooltip content="Maximum back-end debt-to-income ratio target. Conventional loans typically require 36% or less. FHA allows up to 43%." />
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={maxDtiTarget}
                    onChange={(e) => setMaxDtiTarget(Number(e.target.value))}
                    className="mt-1 bg-gray-800/50 border-gray-700"
                    data-testid="input-max-dti"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-cyan-400" />
                <h4 className="font-medium text-cyan-400">Your Maximum Home Price</h4>
              </div>
              <div className="text-4xl font-bold text-white mb-1" data-testid="result-max-home-price">
                {formatCurrency(maxHomePrice)}
              </div>
              {maxHousingBudget <= 0 && (
                <p className="text-sm text-red-400 mt-2">
                  Your existing debts exceed the maximum allowed under your target DTI. Consider reducing debts or increasing income.
                </p>
              )}
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-300 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                Key Numbers
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Monthly Payment</span>
                  <span className="text-white font-medium" data-testid="result-max-monthly-payment">
                    {formatCurrency(maxMonthlyPayment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Loan Amount</span>
                  <span className="text-gray-300" data-testid="result-loan-amount">
                    {formatCurrency(maxLoanAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Down Payment</span>
                  <span className="text-gray-300" data-testid="result-down-payment">
                    {formatCurrency(downPayment)} ({formatPercent(downPaymentPercent)})
                  </span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Housing Budget</span>
                  <span className="text-cyan-400 font-medium" data-testid="result-max-housing-budget">
                    {formatCurrency(Math.max(0, maxHousingBudget))}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Total Debt Allowed</span>
                  <span className="text-gray-300">
                    {formatCurrency(maxTotalMonthlyDebt)}/mo
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <h5 className="text-sm font-medium text-gray-300 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Monthly Payment Breakdown
              </h5>

              <div className="space-y-3">
                <div className="h-4 rounded-full overflow-hidden flex bg-gray-700">
                  {totalBreakdown > 0 && (
                    <>
                      <div
                        className="bg-cyan-500 h-full transition-all duration-500"
                        style={{ width: `${mortgageShare}%` }}
                        data-testid="bar-mortgage"
                      />
                      <div
                        className="bg-purple-500 h-full transition-all duration-500"
                        style={{ width: `${taxShare}%` }}
                        data-testid="bar-taxes"
                      />
                      <div
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${insuranceShare}%` }}
                        data-testid="bar-insurance"
                      />
                    </>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                      <span className="text-gray-400">Principal & Interest</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">{formatCurrency(maxMortgagePayment)}</span>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                        {formatPercent(mortgageShare)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-purple-500" />
                      <span className="text-gray-400">Property Taxes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">{formatCurrency(monthlyPropertyTax)}</span>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                        {formatPercent(taxShare)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-amber-500" />
                      <span className="text-gray-400">Insurance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">{formatCurrency(monthlyInsurance)}</span>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        {formatPercent(insuranceShare)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Card className="bg-gray-800/30 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-300">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                How is this calculated?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <p>
                We calculate the maximum mortgage payment that keeps your total debt-to-income ratio at or below your target (default 36%).
              </p>
              <div>
                <span className="text-cyan-400 font-medium">Max Monthly Housing Budget</span> = (Gross Monthly Income x Target DTI%) - Existing Monthly Debts
              </div>
              <p>
                From this budget, we subtract estimated taxes and insurance to find the maximum mortgage payment.
              </p>
              <p>
                Using that mortgage payment, we reverse-calculate the maximum loan amount and add your down payment.
              </p>
              <div className="bg-gray-700/30 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500">
                  Based on standard 28/36 qualifying ratios used by conventional mortgage lenders. Actual approval depends on credit score, employment history, and other factors.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
