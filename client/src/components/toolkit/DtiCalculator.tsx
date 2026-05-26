import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Calculator, BookOpen, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

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

function getDtiColor(dti: number): string {
  if (dti <= 36) return 'text-green-400';
  if (dti <= 43) return 'text-yellow-400';
  if (dti <= 50) return 'text-orange-400';
  return 'text-red-400';
}

function getDtiBgColor(dti: number): string {
  if (dti <= 36) return 'bg-green-500';
  if (dti <= 43) return 'bg-yellow-500';
  if (dti <= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

function getDtiBadge(dti: number) {
  if (dti <= 36) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Excellent
      </Badge>
    );
  }
  if (dti <= 43) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Moderate
      </Badge>
    );
  }
  if (dti <= 50) {
    return (
      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        High
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
      <XCircle className="w-3 h-3 mr-1" />
      Very High
    </Badge>
  );
}

function DtiGauge({ value, label, testId }: { value: number; label: string; testId: string }) {
  const clampedValue = Math.min(value, 70);
  const percentage = (clampedValue / 70) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${getDtiColor(value)}`} data-testid={testId}>
            {formatPercent(value)}
          </span>
          {getDtiBadge(value)}
        </div>
      </div>
      <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="bg-green-500/30 h-full" style={{ width: `${(36 / 70) * 100}%` }} />
          <div className="bg-yellow-500/30 h-full" style={{ width: `${((43 - 36) / 70) * 100}%` }} />
          <div className="bg-orange-500/30 h-full" style={{ width: `${((50 - 43) / 70) * 100}%` }} />
          <div className="bg-red-500/30 h-full flex-1" />
        </div>
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${getDtiBgColor(value)}`}
          style={{ width: `${Math.min(percentage, 100)}%`, opacity: 0.8 }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/80"
          style={{ left: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span>36%</span>
        <span>43%</span>
        <span>50%</span>
        <span>70%</span>
      </div>
    </div>
  );
}

export default function DtiCalculator() {
  const [annualIncome, setAnnualIncome] = useState(85000);
  const [mortgageRent, setMortgageRent] = useState(1500);
  const [propertyTax, setPropertyTax] = useState(300);
  const [homeInsurance, setHomeInsurance] = useState(125);
  const [hoa, setHoa] = useState(0);
  const [carLoan, setCarLoan] = useState(400);
  const [studentLoans, setStudentLoans] = useState(250);
  const [creditCards, setCreditCards] = useState(100);
  const [otherDebts, setOtherDebts] = useState(0);

  const grossMonthlyIncome = annualIncome / 12;
  const totalHousingPayment = mortgageRent + propertyTax + homeInsurance + hoa;
  const totalOtherDebts = carLoan + studentLoans + creditCards + otherDebts;
  const totalAllDebts = totalHousingPayment + totalOtherDebts;

  const frontEndDti = grossMonthlyIncome > 0 ? (totalHousingPayment / grossMonthlyIncome) * 100 : 0;
  const backEndDti = grossMonthlyIncome > 0 ? (totalAllDebts / grossMonthlyIncome) * 100 : 0;

  const loanPrograms = [
    { name: 'Conventional', frontEnd: 28, backEnd: 36, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
    { name: 'FHA', frontEnd: 31, backEnd: 43, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
    { name: 'VA', frontEnd: 41, backEnd: 41, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
  ];

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap text-white">
          <Calculator className="w-5 h-5 text-cyan-400" />
          Debt-to-Income (DTI) Calculator
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Calculate your DTI ratio to understand your borrowing capacity and mortgage eligibility.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Income
                <InfoTooltip content="Enter your total annual gross income before taxes and deductions." />
              </h4>
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
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Monthly Housing Payment
                <InfoTooltip content="Include all housing-related costs: mortgage or rent, property taxes, homeowner's insurance, and HOA fees." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Mortgage / Rent
                    <InfoTooltip content="Your monthly mortgage principal and interest payment, or monthly rent." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={mortgageRent}
                      onChange={(e) => setMortgageRent(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-mortgage-rent"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Property Tax (Monthly)
                    <InfoTooltip content="Monthly property tax payment. Divide your annual property tax by 12." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={propertyTax}
                      onChange={(e) => setPropertyTax(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-property-tax"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Homeowner's Insurance (Monthly)
                    <InfoTooltip content="Monthly homeowner's insurance premium. Divide your annual premium by 12." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={homeInsurance}
                      onChange={(e) => setHomeInsurance(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-home-insurance"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    HOA Fees (Monthly)
                    <InfoTooltip content="Monthly homeowners association fees, if applicable. Enter $0 if none." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={hoa}
                      onChange={(e) => setHoa(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-hoa"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Housing Payment</span>
                  <span className="text-white font-medium" data-testid="result-total-housing">
                    {formatCurrency(totalHousingPayment)}/mo
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Other Monthly Debts
                <InfoTooltip content="Include minimum monthly payments for all non-housing debts." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Car Loan
                    <InfoTooltip content="Monthly car loan or lease payment." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={carLoan}
                      onChange={(e) => setCarLoan(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-car-loan"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Student Loans
                    <InfoTooltip content="Monthly student loan payment. Use the minimum required payment." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={studentLoans}
                      onChange={(e) => setStudentLoans(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-student-loans"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Credit Cards
                    <InfoTooltip content="Total minimum monthly payments across all credit cards." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={creditCards}
                      onChange={(e) => setCreditCards(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-credit-cards"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Other Debts
                    <InfoTooltip content="Any other monthly debt obligations: personal loans, alimony, child support, etc." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={otherDebts}
                      onChange={(e) => setOtherDebts(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-other-debts"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Other Debts</span>
                  <span className="text-white font-medium" data-testid="result-total-other-debts">
                    {formatCurrency(totalOtherDebts)}/mo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-6">
              <h4 className="font-medium text-gray-300">DTI Results</h4>

              <DtiGauge value={frontEndDti} label="Front-End DTI (Housing Only)" testId="result-front-end-dti" />
              <DtiGauge value={backEndDti} label="Back-End DTI (All Debts)" testId="result-back-end-dti" />
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Summary</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gross Monthly Income</span>
                  <span className="text-gray-300" data-testid="result-monthly-income">{formatCurrency(grossMonthlyIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Housing Costs</span>
                  <span className="text-gray-300">{formatCurrency(totalHousingPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total All Debts</span>
                  <span className="text-gray-300">{formatCurrency(totalAllDebts)}</span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining After All Debts</span>
                  <span className={`font-medium ${grossMonthlyIncome - totalAllDebts >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="result-remaining">
                    {formatCurrency(grossMonthlyIncome - totalAllDebts)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Mortgage Qualification Thresholds</h5>
              {loanPrograms.map((program) => {
                const frontEndQualified = frontEndDti <= program.frontEnd;
                const backEndQualified = backEndDti <= program.backEnd;
                const fullyQualified = frontEndQualified && backEndQualified;

                return (
                  <div
                    key={program.name}
                    className={`rounded-lg p-3 border ${fullyQualified ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800/30 border-gray-700/50'}`}
                    data-testid={`qualification-${program.name.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className={`font-medium text-sm ${program.color}`}>{program.name}</span>
                      {fullyQualified ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Qualified
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <XCircle className="w-3 h-3 mr-1" />
                          Over Limit
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        {frontEndQualified ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-gray-400">
                          Front: {formatPercent(frontEndDti)} / {program.frontEnd}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {backEndQualified ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-gray-400">
                          Back: {formatPercent(backEndDti)} / {program.backEnd}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              <div>
                <span className="text-cyan-400 font-medium">Front-End DTI</span> = (Total Housing Costs / Gross Monthly Income) x 100
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Back-End DTI</span> = (All Monthly Debts / Gross Monthly Income) x 100
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500">
                  Based on standard mortgage lending guidelines from Fannie Mae, FHA, and VA loan programs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
