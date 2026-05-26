import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, DollarSign, Percent, Calendar, Home, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MortgageRates, MortgageCalculationResult } from '@shared/schema';

interface MortgageCalculatorProps {
  initialHomePrice?: number;
  priceSource?: string;
  className?: string;
}

export default function MortgageCalculator({ initialHomePrice, priceSource, className = '' }: MortgageCalculatorProps) {
  const [homePrice, setHomePrice] = useState(initialHomePrice || 350000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [loanTerm, setLoanTerm] = useState<'30' | '15'>('30');
  const [interestRate, setInterestRate] = useState(6.85);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.1);
  const [homeInsurance, setHomeInsurance] = useState(1200);
  const [includePmi, setIncludePmi] = useState(true);

  const { data: rates, isLoading: ratesLoading } = useQuery<MortgageRates>({
    queryKey: ['/api/mortgage/rates'],
  });

  useEffect(() => {
    if (rates) {
      const rate = loanTerm === '30' ? rates.thirtyYearFixed : rates.fifteenYearFixed;
      setInterestRate(rate);
    }
  }, [rates, loanTerm]);

  useEffect(() => {
    if (initialHomePrice && initialHomePrice !== homePrice) {
      setHomePrice(initialHomePrice);
    }
  }, [initialHomePrice]);

  const calculation = useMemo((): MortgageCalculationResult => {
    const downPaymentAmount = (homePrice * downPaymentPercent) / 100;
    const loanAmount = homePrice - downPaymentAmount;
    const loanTermYears = parseInt(loanTerm);
    
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTermYears * 12;
    
    let principalAndInterest: number;
    if (monthlyRate === 0) {
      principalAndInterest = loanAmount / numberOfPayments;
    } else {
      principalAndInterest = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    }
    
    const propertyTax = (homePrice * (propertyTaxRate / 100)) / 12;
    const monthlyInsurance = homeInsurance / 12;
    
    let pmi = 0;
    if (includePmi && downPaymentPercent < 20) {
      pmi = (loanAmount * 0.005) / 12;
    }
    
    const monthlyPayment = principalAndInterest + propertyTax + monthlyInsurance + pmi;
    const totalInterest = (principalAndInterest * numberOfPayments) - loanAmount;
    const totalPayment = monthlyPayment * numberOfPayments;
    
    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      principalAndInterest: Math.round(principalAndInterest * 100) / 100,
      propertyTax: Math.round(propertyTax * 100) / 100,
      homeInsurance: Math.round(monthlyInsurance * 100) / 100,
      pmi: Math.round(pmi * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      loanAmount: Math.round(loanAmount * 100) / 100,
      downPaymentAmount: Math.round(downPaymentAmount * 100) / 100
    };
  }, [homePrice, downPaymentPercent, interestRate, loanTerm, propertyTaxRate, homeInsurance, includePmi]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyWithCents = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const paymentBreakdown = [
    { label: 'Principal & Interest', value: calculation.principalAndInterest, color: 'bg-cyan-500' },
    { label: 'Property Tax', value: calculation.propertyTax, color: 'bg-purple-500' },
    { label: 'Home Insurance', value: calculation.homeInsurance, color: 'bg-yellow-500' },
    ...(calculation.pmi > 0 ? [{ label: 'PMI', value: calculation.pmi, color: 'bg-orange-500' }] : []),
  ];

  const totalBreakdown = paymentBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className={`p-6 glass-card border-gray-700/50 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <Calculator className="w-5 h-5 text-green-400 icon-glow" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Mortgage Calculator</h3>
          <p className="text-sm text-gray-400">Estimate your monthly payment</p>
        </div>
        {rates && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Current Rates</p>
            <p className="text-sm text-gray-400">{rates.source}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-gray-400" />
              <Label htmlFor="home-price" className="text-gray-300">Home Price</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-help" data-testid="icon-price-info" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    {priceSource 
                      ? priceSource 
                      : 'Default estimate based on typical market values'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    You can adjust this to any price you want.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                id="home-price"
                type="number"
                value={homePrice}
                onChange={(e) => setHomePrice(Number(e.target.value) || 0)}
                className="pl-9 bg-gray-800/50 border-gray-600 text-white"
                data-testid="input-home-price"
              />
            </div>
            <Slider
              value={[homePrice]}
              onValueChange={([value]) => setHomePrice(value)}
              min={50000}
              max={2000000}
              step={10000}
              className="mt-3"
              data-testid="slider-home-price"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-400" />
                <Label className="text-gray-300">Down Payment</Label>
              </div>
              <span className="text-sm text-cyan-400 font-mono">
                {formatCurrency(calculation.downPaymentAmount)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Slider
                value={[downPaymentPercent]}
                onValueChange={([value]) => setDownPaymentPercent(value)}
                min={0}
                max={50}
                step={1}
                className="flex-1"
                data-testid="slider-down-payment"
              />
              <span className="text-sm text-white font-mono w-12 text-right">{downPaymentPercent}%</span>
            </div>
            {downPaymentPercent < 20 && includePmi && (
              <p className="text-xs text-orange-400 mt-2">PMI required below 20% down</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Label className="text-gray-300">Loan Term</Label>
              </div>
              <Select value={loanTerm} onValueChange={(v: '30' | '15') => setLoanTerm(v)}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white" data-testid="select-loan-term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 years</SelectItem>
                  <SelectItem value="15">15 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-gray-400" />
                <Label htmlFor="interest-rate" className="text-gray-300">Interest Rate</Label>
              </div>
              <div className="relative">
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                  className="pr-8 bg-gray-800/50 border-gray-600 text-white"
                  data-testid="input-interest-rate"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">Additional Costs</p>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>These estimates may vary by location</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property-tax" className="text-xs text-gray-400">Property Tax Rate (%/yr)</Label>
                <Input
                  id="property-tax"
                  type="number"
                  step="0.1"
                  value={propertyTaxRate}
                  onChange={(e) => setPropertyTaxRate(Number(e.target.value) || 0)}
                  className="mt-1 bg-gray-800/50 border-gray-600 text-white text-sm"
                  data-testid="input-property-tax"
                />
              </div>
              <div>
                <Label htmlFor="home-insurance" className="text-xs text-gray-400">Insurance ($/yr)</Label>
                <Input
                  id="home-insurance"
                  type="number"
                  value={homeInsurance}
                  onChange={(e) => setHomeInsurance(Number(e.target.value) || 0)}
                  className="mt-1 bg-gray-800/50 border-gray-600 text-white text-sm"
                  data-testid="input-home-insurance"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <Label htmlFor="include-pmi" className="text-sm text-gray-400">Include PMI</Label>
              <Switch
                id="include-pmi"
                checked={includePmi}
                onCheckedChange={setIncludePmi}
                data-testid="switch-include-pmi"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20">
            <p className="text-sm text-gray-400 mb-1">Estimated Monthly Payment</p>
            <p className="text-4xl font-bold font-mono text-green-400" data-testid="text-monthly-payment">
              {formatCurrencyWithCents(calculation.monthlyPayment)}
            </p>
            <p className="text-xs text-gray-500 mt-2">per month</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-400 font-medium">Payment Breakdown</p>
            
            <div className="h-3 rounded-full overflow-hidden flex bg-gray-800">
              {paymentBreakdown.map((item, index) => (
                <div
                  key={index}
                  className={`${item.color} transition-all duration-300`}
                  style={{ width: `${(item.value / totalBreakdown) * 100}%` }}
                />
              ))}
            </div>

            <div className="space-y-2">
              {paymentBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-gray-400">{item.label}</span>
                  </div>
                  <span className="text-white font-mono" data-testid={`text-breakdown-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {formatCurrencyWithCents(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-xs text-gray-500 mb-1">Loan Amount</p>
              <p className="text-lg font-mono text-white" data-testid="text-loan-amount">
                {formatCurrency(calculation.loanAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Down Payment</p>
              <p className="text-lg font-mono text-white" data-testid="text-down-payment">
                {formatCurrency(calculation.downPaymentAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Interest</p>
              <p className="text-lg font-mono text-yellow-400" data-testid="text-total-interest">
                {formatCurrency(calculation.totalInterest)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total of {loanTerm} Years</p>
              <p className="text-lg font-mono text-white" data-testid="text-total-payment">
                {formatCurrency(calculation.totalPayment)}
              </p>
            </div>
          </div>

          {rates && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Current Market Rates</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">30-Year Fixed</p>
                  <p className="text-sm font-mono text-cyan-400">{rates.thirtyYearFixed}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">15-Year Fixed</p>
                  <p className="text-sm font-mono text-cyan-400">{rates.fifteenYearFixed}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">FHA</p>
                  <p className="text-sm font-mono text-cyan-400">{rates.fha}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
