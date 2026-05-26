import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Calculator, BookOpen, DollarSign, CheckCircle2 } from 'lucide-react';

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

const STATE_TAX_RATES: Record<string, { name: string; rate: number }> = {
  AL: { name: 'Alabama', rate: 5.0 },
  AK: { name: 'Alaska', rate: 0 },
  AZ: { name: 'Arizona', rate: 2.5 },
  AR: { name: 'Arkansas', rate: 4.4 },
  CA: { name: 'California', rate: 13.3 },
  CO: { name: 'Colorado', rate: 4.4 },
  CT: { name: 'Connecticut', rate: 6.99 },
  DE: { name: 'Delaware', rate: 6.6 },
  DC: { name: 'District of Columbia', rate: 10.75 },
  FL: { name: 'Florida', rate: 0 },
  GA: { name: 'Georgia', rate: 5.49 },
  HI: { name: 'Hawaii', rate: 11.0 },
  ID: { name: 'Idaho', rate: 5.8 },
  IL: { name: 'Illinois', rate: 4.95 },
  IN: { name: 'Indiana', rate: 3.05 },
  IA: { name: 'Iowa', rate: 6.0 },
  KS: { name: 'Kansas', rate: 5.7 },
  KY: { name: 'Kentucky', rate: 4.0 },
  LA: { name: 'Louisiana', rate: 4.25 },
  ME: { name: 'Maine', rate: 7.15 },
  MD: { name: 'Maryland', rate: 5.75 },
  MA: { name: 'Massachusetts', rate: 9.0 },
  MI: { name: 'Michigan', rate: 4.25 },
  MN: { name: 'Minnesota', rate: 9.85 },
  MS: { name: 'Mississippi', rate: 5.0 },
  MO: { name: 'Missouri', rate: 4.95 },
  MT: { name: 'Montana', rate: 6.75 },
  NE: { name: 'Nebraska', rate: 6.64 },
  NV: { name: 'Nevada', rate: 0 },
  NH: { name: 'New Hampshire', rate: 0 },
  NJ: { name: 'New Jersey', rate: 10.75 },
  NM: { name: 'New Mexico', rate: 5.9 },
  NY: { name: 'New York', rate: 10.9 },
  NC: { name: 'North Carolina', rate: 4.5 },
  ND: { name: 'North Dakota', rate: 2.5 },
  OH: { name: 'Ohio', rate: 3.5 },
  OK: { name: 'Oklahoma', rate: 4.75 },
  OR: { name: 'Oregon', rate: 9.9 },
  PA: { name: 'Pennsylvania', rate: 3.07 },
  RI: { name: 'Rhode Island', rate: 5.99 },
  SC: { name: 'South Carolina', rate: 6.4 },
  SD: { name: 'South Dakota', rate: 0 },
  TN: { name: 'Tennessee', rate: 0 },
  TX: { name: 'Texas', rate: 0 },
  UT: { name: 'Utah', rate: 4.65 },
  VT: { name: 'Vermont', rate: 8.75 },
  VA: { name: 'Virginia', rate: 5.75 },
  WA: { name: 'Washington', rate: 7.0 },
  WV: { name: 'West Virginia', rate: 6.5 },
  WI: { name: 'Wisconsin', rate: 7.65 },
  WY: { name: 'Wyoming', rate: 0 },
};

function getFederalCapGainsRate(taxableIncome: number, filingStatus: string): number {
  if (filingStatus === 'married') {
    if (taxableIncome <= 96700) return 0;
    if (taxableIncome <= 600050) return 15;
    return 20;
  }
  if (taxableIncome <= 48350) return 0;
  if (taxableIncome <= 533400) return 15;
  return 20;
}

function getNiitApplies(taxableIncome: number, filingStatus: string): boolean {
  if (filingStatus === 'married') return taxableIncome > 250000;
  return taxableIncome > 200000;
}

export default function CapitalGainsTaxCalculator() {
  const [salePrice, setSalePrice] = useState(550000);
  const [purchasePrice, setPurchasePrice] = useState(350000);
  const [improvements, setImprovements] = useState(25000);
  const [sellingExpenses, setSellingExpenses] = useState(33000);
  const [yearsOwned, setYearsOwned] = useState(5);
  const [depreciationTaken, setDepreciationTaken] = useState(0);
  const [filingStatus, setFilingStatus] = useState('single');
  const [annualIncome, setAnnualIncome] = useState(120000);
  const [state, setState] = useState('CA');
  const [isPrimaryResidence, setIsPrimaryResidence] = useState(false);

  const adjustedCostBasis = purchasePrice + improvements;
  const capitalGain = salePrice - adjustedCostBasis - sellingExpenses;

  const exclusionAmount = isPrimaryResidence && yearsOwned >= 2
    ? (filingStatus === 'married' ? 500000 : 250000)
    : 0;
  const taxableGain = Math.max(0, capitalGain - exclusionAmount);

  const federalRate = getFederalCapGainsRate(annualIncome, filingStatus);
  const federalTax = taxableGain * (federalRate / 100);

  const depreciationRecaptureTax = depreciationTaken * 0.25;

  const niitApplies = getNiitApplies(annualIncome, filingStatus);
  const niitTax = niitApplies ? taxableGain * 0.038 : 0;

  const stateRate = STATE_TAX_RATES[state]?.rate || 0;
  let stateTax = taxableGain * (stateRate / 100);
  if (state === 'WA') {
    const waGain = Math.max(0, taxableGain - 250000);
    stateTax = waGain * 0.07;
  }

  const totalTax = federalTax + depreciationRecaptureTax + niitTax + stateTax;
  const netProceeds = salePrice - sellingExpenses - totalTax;

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap text-white">
          <Calculator className="w-5 h-5 text-cyan-400" />
          Capital Gains Tax Calculator
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Estimate federal and state capital gains taxes on your real estate sale.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Property Sale Details
                <InfoTooltip content="Enter the details of your property sale to estimate capital gains taxes." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Sale Price
                    <InfoTooltip content="The price you sold (or plan to sell) the property for." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-sale-price"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Original Purchase Price
                    <InfoTooltip content="The price you originally paid for the property." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-purchase-price"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Capital Improvements
                    <InfoTooltip content="Cost of renovations or improvements that added value to the property (not routine maintenance)." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={improvements}
                      onChange={(e) => setImprovements(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-improvements"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Selling Expenses
                    <InfoTooltip content="Total selling costs including agent commissions, closing costs, staging, etc. Typically ~6% of sale price." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={sellingExpenses}
                      onChange={(e) => setSellingExpenses(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-selling-expenses"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Years Owned
                    <InfoTooltip content="How long you've owned the property. Must own 2+ years for primary residence exclusion and long-term capital gains rates." />
                  </Label>
                  <Input
                    type="number"
                    value={yearsOwned}
                    onChange={(e) => setYearsOwned(Number(e.target.value))}
                    className="mt-1 bg-gray-800/50 border-gray-700"
                    data-testid="input-years-owned"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Depreciation Taken
                    <InfoTooltip content="Total depreciation claimed on rental property. This amount is subject to 25% recapture tax. Enter $0 for non-rental properties." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={depreciationTaken}
                      onChange={(e) => setDepreciationTaken(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-depreciation"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Tax Filing Details
                <InfoTooltip content="Your filing status and income determine your federal and state capital gains tax rates." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Filing Status
                    <InfoTooltip content="Your tax filing status affects tax brackets, exclusion amounts, and NIIT thresholds." />
                  </Label>
                  <Select value={filingStatus} onValueChange={setFilingStatus} data-testid="select-filing-status">
                    <SelectTrigger className="mt-1 bg-gray-800/50 border-gray-700" data-testid="select-filing-status-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married Filing Jointly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Annual Taxable Income
                    <InfoTooltip content="Your total annual taxable income (excluding this sale). Used to determine your capital gains tax bracket." />
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
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    State
                    <InfoTooltip content="Your state of residence. State capital gains tax rates vary significantly - some states like TX, FL, and NV have 0%." />
                  </Label>
                  <Select value={state} onValueChange={setState} data-testid="select-state">
                    <SelectTrigger className="mt-1 bg-gray-800/50 border-gray-700" data-testid="select-state-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATE_TAX_RATES)
                        .sort((a, b) => a[1].name.localeCompare(b[1].name))
                        .map(([abbr, info]) => (
                          <SelectItem key={abbr} value={abbr}>
                            {info.name} ({abbr}) - {info.rate}%
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="primary-residence"
                    checked={isPrimaryResidence}
                    onChange={(e) => setIsPrimaryResidence(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                    data-testid="checkbox-primary-residence"
                  />
                  <Label htmlFor="primary-residence" className="text-gray-300 text-sm flex items-center cursor-pointer">
                    Primary Residence
                    <InfoTooltip content="If this is your primary residence and you've lived in it for at least 2 of the last 5 years, you may exclude up to $250k (single) or $500k (married) of capital gains from taxes under Section 121." />
                  </Label>
                  {isPrimaryResidence && yearsOwned >= 2 && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Exclusion Applies
                    </Badge>
                  )}
                  {isPrimaryResidence && yearsOwned < 2 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      Need 2+ Years
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-medium text-gray-300">Tax Breakdown</h4>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Gain Calculation</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sale Price</span>
                  <span className="text-gray-300" data-testid="result-sale-price">{formatCurrency(salePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Adjusted Cost Basis</span>
                  <span className="text-gray-300" data-testid="result-cost-basis">-{formatCurrency(adjustedCostBasis)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Selling Expenses</span>
                  <span className="text-gray-300">-{formatCurrency(sellingExpenses)}</span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-white font-medium">Capital Gain</span>
                  <span className={`font-medium ${capitalGain >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="result-capital-gain">
                    {formatCurrency(capitalGain)}
                  </span>
                </div>
                {exclusionAmount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Primary Residence Exclusion</span>
                      <span className="text-green-400" data-testid="result-exclusion">-{formatCurrency(Math.min(exclusionAmount, capitalGain > 0 ? capitalGain : 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white font-medium">Taxable Gain</span>
                      <span className={`font-medium ${taxableGain >= 0 ? 'text-yellow-400' : 'text-green-400'}`} data-testid="result-taxable-gain">
                        {formatCurrency(taxableGain)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Tax Components</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400">
                    Federal Capital Gains ({federalRate}%)
                  </span>
                  <span className="text-red-400 font-medium" data-testid="result-federal-tax">{formatCurrency(federalTax)}</span>
                </div>
                {depreciationTaken > 0 && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400">
                      Depreciation Recapture (25%)
                    </span>
                    <span className="text-red-400 font-medium" data-testid="result-depreciation-recapture">{formatCurrency(depreciationRecaptureTax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400 flex items-center">
                    NIIT (3.8%)
                    {!niitApplies && (
                      <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        N/A
                      </Badge>
                    )}
                  </span>
                  <span className="text-red-400 font-medium" data-testid="result-niit">{formatCurrency(niitTax)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400">
                    {STATE_TAX_RATES[state]?.name} State Tax ({state === 'WA' ? '7% over $250k' : formatPercent(stateRate)})
                  </span>
                  <span className="text-red-400 font-medium" data-testid="result-state-tax">{formatCurrency(stateTax)}</span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Total Tax</span>
                  <span className="text-red-400 text-lg font-bold" data-testid="result-total-tax">{formatCurrency(totalTax)}</span>
                </div>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                <h5 className="text-sm font-medium text-cyan-400">Net Proceeds Summary</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sale Price</span>
                  <span className="text-gray-300">{formatCurrency(salePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Selling Expenses</span>
                  <span className="text-gray-300">-{formatCurrency(sellingExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Tax</span>
                  <span className="text-gray-300">-{formatCurrency(totalTax)}</span>
                </div>
                <hr className="border-cyan-500/30" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Net Proceeds After Tax</span>
                  <span className="text-cyan-400 text-lg font-bold" data-testid="result-net-proceeds">{formatCurrency(netProceeds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Effective Tax Rate</span>
                  <span className="text-gray-300" data-testid="result-effective-rate">
                    {capitalGain > 0 ? formatPercent((totalTax / capitalGain) * 100) : '0.0%'}
                  </span>
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
              <div>
                <span className="text-cyan-400 font-medium">Adjusted Cost Basis</span> = Original Purchase Price + Capital Improvements. This is your total investment in the property.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Capital Gain</span> = Sale Price - Adjusted Cost Basis - Selling Expenses
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Federal Long-Term Capital Gains Tax (2025 brackets):</span>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>0% rate: Single up to $48,350 / Married up to $96,700</li>
                  <li>15% rate: Single $48,351-$533,400 / Married $96,701-$600,050</li>
                  <li>20% rate: Single over $533,400 / Married over $600,050</li>
                </ul>
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Primary Residence Exclusion (Section 121):</span> If you lived in the home as your primary residence for at least 2 of the past 5 years, you can exclude up to $250,000 (single) or $500,000 (married filing jointly) of capital gains from federal taxes.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Depreciation Recapture (Section 1250):</span> If you claimed depreciation on a rental property, that amount is taxed at a flat 25% rate when you sell, regardless of your income bracket.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Net Investment Income Tax (NIIT):</span> An additional 3.8% surtax on investment income (including capital gains) if your AGI exceeds $200,000 (single) or $250,000 (married filing jointly).
              </div>
              <div>
                <span className="text-cyan-400 font-medium">State Capital Gains Tax:</span> Varies by state. Some states (TX, FL, NV, WY, SD, TN, AK) have no state income tax on capital gains. Others like CA (13.3%), NY (10.9%), and HI (11%) have high rates. WA applies 7% only on gains exceeding $250,000.
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 mt-3 space-y-2">
                <p className="text-xs text-gray-500">
                  Based on IRS Publication 544 (Sales of Assets) and Publication 523 (Selling Your Home). Tax rates reflect 2025 federal brackets.
                </p>
                <p className="text-xs text-yellow-500/80 font-medium">
                  This is an estimate only. Consult a tax professional for actual tax liability.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
