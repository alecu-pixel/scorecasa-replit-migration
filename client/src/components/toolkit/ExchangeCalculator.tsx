import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Calculator, BookOpen, ArrowRightLeft, DollarSign, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

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

export default function ExchangeCalculator() {
  const [salePrice, setSalePrice] = useState(600000);
  const [purchasePrice, setPurchasePrice] = useState(350000);
  const [improvements, setImprovements] = useState(30000);
  const [sellingExpenses, setSellingExpenses] = useState(36000);
  const [outstandingMortgage, setOutstandingMortgage] = useState(200000);

  const [replacementPrice, setReplacementPrice] = useState(700000);
  const [newMortgage, setNewMortgage] = useState(400000);

  const [filingStatus, setFilingStatus] = useState('single');
  const [annualIncome, setAnnualIncome] = useState(120000);

  const adjustedCostBasis = purchasePrice + improvements;
  const capitalGain = salePrice - adjustedCostBasis - sellingExpenses;

  const federalRate = getFederalCapGainsRate(annualIncome, filingStatus);
  const niitApplies = getNiitApplies(annualIncome, filingStatus);
  const niitRate = niitApplies ? 3.8 : 0;
  const totalFederalRate = federalRate + niitRate;

  const taxWithoutExchange = Math.max(0, capitalGain) * (totalFederalRate / 100);

  const saleProceeds = salePrice - sellingExpenses - outstandingMortgage;
  const equityIntoReplacement = replacementPrice - newMortgage;
  const cashBoot = Math.max(0, saleProceeds - equityIntoReplacement);

  const mortgageBoot = Math.max(0, outstandingMortgage - newMortgage);

  const totalBoot = cashBoot + mortgageBoot;
  const taxableBoot = Math.min(totalBoot, Math.max(0, capitalGain));
  const taxOnBoot = taxableBoot * (totalFederalRate / 100);

  const taxSavings = taxWithoutExchange - taxOnBoot;

  const deferredGain = Math.max(0, capitalGain) - taxableBoot;
  const newBasis = replacementPrice - deferredGain;

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap text-white">
          <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
          1031 Exchange Calculator
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Calculate tax deferral savings from a like-kind exchange under IRC Section 1031.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Relinquished (Sold) Property
                <InfoTooltip content="The investment property you are selling in the exchange." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Sale Price
                    <InfoTooltip content="The price you are selling the relinquished property for." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-relinquished-sale-price"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Original Purchase Price
                    <InfoTooltip content="The original purchase price of the property you are selling." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-relinquished-purchase-price"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Capital Improvements
                    <InfoTooltip content="Cost of improvements made to the property that added value." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={improvements}
                      onChange={(e) => setImprovements(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-relinquished-improvements"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Selling Expenses
                    <InfoTooltip content="Total selling costs including agent commissions, closing costs, etc." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={sellingExpenses}
                      onChange={(e) => setSellingExpenses(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-relinquished-selling-expenses"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Outstanding Mortgage
                    <InfoTooltip content="Remaining mortgage balance on the property being sold. Debt relief can create 'mortgage boot' if the new mortgage is lower." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={outstandingMortgage}
                      onChange={(e) => setOutstandingMortgage(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-outstanding-mortgage"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Replacement Property
                <InfoTooltip content="The new investment property you intend to acquire in the exchange." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Purchase Price
                    <InfoTooltip content="The purchase price of the replacement property. To fully defer taxes, this should be equal to or greater than the sale price of the relinquished property." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={replacementPrice}
                      onChange={(e) => setReplacementPrice(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-replacement-price"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    New Mortgage Amount
                    <InfoTooltip content="The mortgage you will take on for the replacement property. To avoid mortgage boot, this should be equal to or greater than the old mortgage." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={newMortgage}
                      onChange={(e) => setNewMortgage(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-new-mortgage"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-1">
                Tax Details
                <InfoTooltip content="Used to estimate federal capital gains tax rates for comparison." />
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Filing Status
                    <InfoTooltip content="Your tax filing status affects capital gains tax rates." />
                  </Label>
                  <Select value={filingStatus} onValueChange={setFilingStatus} data-testid="select-filing-status">
                    <SelectTrigger className="mt-1 bg-gray-800/50 border-gray-700" data-testid="select-exchange-filing-status-trigger">
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
                    <InfoTooltip content="Your total annual taxable income, used to determine capital gains tax bracket." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-exchange-annual-income"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-medium text-gray-300">Exchange Analysis</h4>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-300">Capital Gain on Sale</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sale Price</span>
                  <span className="text-gray-300">{formatCurrency(salePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Adjusted Cost Basis</span>
                  <span className="text-gray-300">-{formatCurrency(adjustedCostBasis)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Selling Expenses</span>
                  <span className="text-gray-300">-{formatCurrency(sellingExpenses)}</span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-white font-medium">Capital Gain</span>
                  <span className={`font-medium ${capitalGain >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="result-exchange-capital-gain">
                    {formatCurrency(capitalGain)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-red-400">Tax WITHOUT 1031 Exchange</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Federal Cap Gains Rate</span>
                  <span className="text-gray-300">{formatPercent(federalRate)}</span>
                </div>
                {niitApplies && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">NIIT (3.8%)</span>
                    <span className="text-gray-300">+3.8%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Effective Federal Rate</span>
                  <span className="text-gray-300">{formatPercent(totalFederalRate)}</span>
                </div>
                <hr className="border-red-500/20" />
                <div className="flex justify-between">
                  <span className="text-white font-medium">Total Tax (No Exchange)</span>
                  <span className="text-red-400 font-bold" data-testid="result-tax-without-exchange">{formatCurrency(taxWithoutExchange)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                Boot Analysis
                <InfoTooltip content="'Boot' is any value received in the exchange that is not like-kind property. Boot is taxable even in a 1031 exchange." />
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400 flex items-center">
                    Cash Boot
                    <InfoTooltip content="Cash from the sale not reinvested into the replacement property." />
                  </span>
                  <span className={cashBoot > 0 ? 'text-yellow-400 font-medium' : 'text-green-400'} data-testid="result-cash-boot">
                    {formatCurrency(cashBoot)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400 flex items-center">
                    Mortgage Boot
                    <InfoTooltip content="Debt relief from having a lower mortgage on the replacement property than the relinquished property." />
                  </span>
                  <span className={mortgageBoot > 0 ? 'text-yellow-400 font-medium' : 'text-green-400'} data-testid="result-mortgage-boot">
                    {formatCurrency(mortgageBoot)}
                  </span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-white font-medium">Total Boot</span>
                  <span className="text-gray-300 font-medium" data-testid="result-total-boot">{formatCurrency(totalBoot)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax on Boot</span>
                  <span className="text-red-400 font-medium" data-testid="result-tax-on-boot">{formatCurrency(taxOnBoot)}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h5 className="text-sm font-medium text-green-400">1031 Exchange Savings</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax Without Exchange</span>
                  <span className="text-red-400">{formatCurrency(taxWithoutExchange)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax With Exchange</span>
                  <span className="text-yellow-400">{formatCurrency(taxOnBoot)}</span>
                </div>
                <hr className="border-green-500/20" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Total Tax Savings</span>
                  <span className="text-green-400 text-lg font-bold" data-testid="result-tax-savings">{formatCurrency(taxSavings)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
              <h5 className="text-sm font-medium text-gray-300">New Basis in Replacement Property</h5>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Replacement Purchase Price</span>
                <span className="text-gray-300">{formatCurrency(replacementPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Deferred Gain</span>
                <span className="text-gray-300">-{formatCurrency(deferredGain)}</span>
              </div>
              <hr className="border-gray-700" />
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">New Cost Basis</span>
                <span className="text-cyan-400 font-bold" data-testid="result-new-basis">{formatCurrency(newBasis)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your new basis carries over the deferred gain, meaning you'll owe taxes on this gain when you eventually sell the replacement property (unless you do another 1031 exchange).
              </p>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h5 className="text-sm font-medium text-gray-300">1031 Exchange Timeline</h5>
              </div>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-700" />

                <div className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-gray-800" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Day 0</Badge>
                      <span className="text-white text-sm font-medium">Sale Closes</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Relinquished property sale is completed. Proceeds go to Qualified Intermediary.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-yellow-500 border-2 border-gray-800" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Day 45
                      </Badge>
                      <span className="text-white text-sm font-medium">Identification Deadline</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Must identify up to 3 potential replacement properties in writing to the QI.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-800" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Day 180
                      </Badge>
                      <span className="text-white text-sm font-medium">Closing Deadline</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Must close on the replacement property. No extensions are available.</p>
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
              <div>
                <span className="text-cyan-400 font-medium">What is a 1031 Exchange?</span> Under IRC Section 1031, you can defer capital gains taxes when you sell an investment property and reinvest the proceeds into a "like-kind" replacement property. The tax is deferred, not eliminated -- you'll owe it when you eventually sell the replacement property.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Like-Kind Property Rules:</span> Both properties must be held for investment or business use (not personal residences). After the Tax Cuts and Jobs Act of 2017, only real property qualifies for 1031 exchanges.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Boot Rules:</span> "Boot" is any non-like-kind value received in the exchange. Cash not reinvested (cash boot) and debt relief when the new mortgage is lower than the old (mortgage boot) are both taxable. To fully defer taxes, reinvest all proceeds and take on equal or greater debt.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">45-Day Identification Rule:</span> You must identify potential replacement properties in writing within 45 calendar days of selling the relinquished property. You may identify up to 3 properties regardless of value (Three-Property Rule).
              </div>
              <div>
                <span className="text-cyan-400 font-medium">180-Day Closing Rule:</span> You must close on the replacement property within 180 calendar days of selling the relinquished property. This deadline cannot be extended.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Basis Calculation:</span> New Basis = Replacement Property Price - Deferred Gain. This reduced basis means higher taxable gain when you eventually sell.
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 mt-3 space-y-2">
                <p className="text-xs text-gray-500">
                  Based on IRC Section 1031 and IRS Revenue Ruling 2002-83. Rules updated per Tax Cuts and Jobs Act of 2017 (limited to real property).
                </p>
                <p className="text-xs text-yellow-500/80 font-medium">
                  1031 exchanges require a Qualified Intermediary (QI). Consult a tax advisor before proceeding.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
