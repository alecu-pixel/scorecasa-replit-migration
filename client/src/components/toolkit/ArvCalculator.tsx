import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, TrendingUp, BookOpen, DollarSign, Plus, Trash2, Target, BarChart3 } from 'lucide-react';

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

interface ComparableProperty {
  id: string;
  address: string;
  salePrice: number;
  squareFootage: number;
  saleDate: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
}

function createEmptyComp(): ComparableProperty {
  return {
    id: crypto.randomUUID(),
    address: '',
    salePrice: 0,
    squareFootage: 0,
    saleDate: '',
    condition: 'good',
  };
}

function getRoiColor(roi: number): string {
  if (roi > 15) return 'text-green-400';
  if (roi >= 5) return 'text-yellow-400';
  return 'text-red-400';
}

function getRoiBadge(roi: number) {
  if (roi > 15) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        Strong Deal
      </Badge>
    );
  }
  if (roi >= 5) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        Moderate Deal
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
      Weak Deal
    </Badge>
  );
}

export default function ArvCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(200000);
  const [propertySquareFootage, setPropertySquareFootage] = useState(1500);
  const [repairCosts, setRepairCosts] = useState(50000);
  const [holdingMonths, setHoldingMonths] = useState(6);
  const [holdingCostMonthly, setHoldingCostMonthly] = useState(500);
  const [sellingCostPercent, setSellingCostPercent] = useState(8);
  const [multiplier, setMultiplier] = useState('1.5');
  const [comps, setComps] = useState<ComparableProperty[]>([]);

  const addComp = () => {
    if (comps.length < 6) {
      setComps(prev => [...prev, createEmptyComp()]);
    }
  };

  const removeComp = (id: string) => {
    setComps(prev => prev.filter(c => c.id !== id));
  };

  const updateComp = (id: string, updates: Partial<ComparableProperty>) => {
    setComps(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const validComps = comps.filter(c => c.salePrice > 0 && c.squareFootage > 0);
  const useCompMethod = validComps.length > 0;

  const avgPricePerSqFt = validComps.length > 0
    ? validComps.reduce((sum, c) => sum + (c.salePrice / c.squareFootage), 0) / validComps.length
    : 0;

  const multiplierValue = parseFloat(multiplier);

  const arv = useCompMethod
    ? avgPricePerSqFt * propertySquareFootage
    : purchasePrice + (repairCosts * multiplierValue);

  const maxPurchase70 = (arv * 0.70) - repairCosts;
  const maxPurchase75 = (arv * 0.75) - repairCosts;

  const holdingCosts = holdingMonths * holdingCostMonthly;
  const sellingCosts = arv * (sellingCostPercent / 100);
  const totalInvestment = purchasePrice + repairCosts + holdingCosts + sellingCosts;
  const profit = arv - totalInvestment;
  const roi = (purchasePrice + repairCosts) > 0
    ? (profit / (purchasePrice + repairCosts)) * 100
    : 0;

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap text-white">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          ARV Calculator
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            After-Repair Value
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Calculate the After-Repair Value and analyze deal profitability using comps or the value-add method.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-300 flex items-center gap-1">
              Property Details
              <InfoTooltip content="Enter your subject property information to analyze the deal." />
            </h4>

            <div className="space-y-3">
              <div>
                <Label className="text-gray-400 text-sm flex items-center">
                  Purchase Price / Current Value
                  <InfoTooltip content="The price you expect to pay or the current market value of the property." />
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
                  Property Square Footage
                  <InfoTooltip content="Total living area. Used with comp data to estimate ARV." />
                </Label>
                <Input
                  type="number"
                  value={propertySquareFootage}
                  onChange={(e) => setPropertySquareFootage(Number(e.target.value))}
                  className="mt-1 bg-gray-800/50 border-gray-700"
                  data-testid="input-arv-sqft"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-sm flex items-center">
                  Estimated Repair Costs
                  <InfoTooltip content="Total renovation budget. Use the Rehab Estimator tool for a detailed breakdown." />
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input
                    type="number"
                    value={repairCosts}
                    onChange={(e) => setRepairCosts(Number(e.target.value))}
                    className="pl-7 bg-gray-800/50 border-gray-700"
                    data-testid="input-repair-costs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Holding Months
                    <InfoTooltip content="Expected renovation timeline in months." />
                  </Label>
                  <Input
                    type="number"
                    value={holdingMonths}
                    onChange={(e) => setHoldingMonths(Number(e.target.value))}
                    className="mt-1 bg-gray-800/50 border-gray-700"
                    data-testid="input-holding-months"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Monthly Holding Cost
                    <InfoTooltip content="Monthly costs during renovation: mortgage, utilities, insurance, taxes." />
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                      type="number"
                      value={holdingCostMonthly}
                      onChange={(e) => setHoldingCostMonthly(Number(e.target.value))}
                      className="pl-7 bg-gray-800/50 border-gray-700"
                      data-testid="input-holding-cost"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-sm flex items-center">
                  Selling Costs (% of ARV)
                  <InfoTooltip content="Agent commissions, closing costs, title insurance. Typically 6-10% of sale price." />
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={sellingCostPercent}
                  onChange={(e) => setSellingCostPercent(Number(e.target.value))}
                  className="mt-1 bg-gray-800/50 border-gray-700"
                  data-testid="input-selling-costs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-300 flex items-center gap-1">
              ARV Method
              <InfoTooltip content="Use comparable sales for accurate ARV, or the value-add multiplier when no comps are available." />
            </h4>

            {comps.length === 0 && (
              <div className="space-y-3">
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-sm text-gray-300 mb-2">
                    No comps entered. Using the <span className="text-cyan-400 font-medium">Value-Add Method</span>:
                  </p>
                  <p className="text-xs text-gray-400">
                    ARV = Current Value + (Repair Costs x Multiplier)
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm flex items-center">
                    Value-Add Multiplier
                    <InfoTooltip content="How much value renovation adds. Conservative: 1.3x, Moderate: 1.5x, Aggressive: 1.7x." />
                  </Label>
                  <Select value={multiplier} onValueChange={setMultiplier}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 mt-1" data-testid="select-multiplier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.3">Conservative (1.3x)</SelectItem>
                      <SelectItem value="1.5">Moderate (1.5x)</SelectItem>
                      <SelectItem value="1.7">Aggressive (1.7x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {comps.length > 0 && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                <p className="text-sm text-gray-300 mb-1">
                  Using <span className="text-cyan-400 font-medium">Comp-Based Method</span>
                </p>
                {validComps.length > 0 && (
                  <p className="text-xs text-gray-400">
                    Avg Price/SqFt from {validComps.length} comp{validComps.length > 1 ? 's' : ''}: <span className="text-cyan-400 font-medium">${avgPricePerSqFt.toFixed(2)}/sqft</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {comps.map((comp, idx) => (
                <div key={comp.id} className="border border-gray-700/50 rounded-lg p-3 space-y-2 bg-gray-800/20" data-testid={`comp-${idx}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-300 font-medium">Comp #{idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeComp(comp.id)}
                      data-testid={`remove-comp-${idx}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Address</Label>
                    <Input
                      type="text"
                      value={comp.address}
                      onChange={(e) => updateComp(comp.id, { address: e.target.value })}
                      placeholder="123 Main St"
                      className="mt-1 bg-gray-800/50 border-gray-700 text-sm"
                      data-testid={`input-comp-address-${idx}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-400 text-xs">Sale Price</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <Input
                          type="number"
                          value={comp.salePrice || ''}
                          onChange={(e) => updateComp(comp.id, { salePrice: Number(e.target.value) })}
                          className="pl-5 bg-gray-800/50 border-gray-700 text-sm"
                          data-testid={`input-comp-price-${idx}`}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Sq Ft</Label>
                      <Input
                        type="number"
                        value={comp.squareFootage || ''}
                        onChange={(e) => updateComp(comp.id, { squareFootage: Number(e.target.value) })}
                        className="mt-1 bg-gray-800/50 border-gray-700 text-sm"
                        data-testid={`input-comp-sqft-${idx}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-400 text-xs">Sale Date</Label>
                      <Input
                        type="date"
                        value={comp.saleDate}
                        onChange={(e) => updateComp(comp.id, { saleDate: e.target.value })}
                        className="mt-1 bg-gray-800/50 border-gray-700 text-sm"
                        data-testid={`input-comp-date-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Condition</Label>
                      <Select
                        value={comp.condition}
                        onValueChange={(val) => updateComp(comp.id, { condition: val as ComparableProperty['condition'] })}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 mt-1 text-sm" data-testid={`select-comp-condition-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {comp.salePrice > 0 && comp.squareFootage > 0 && (
                    <div className="text-xs text-gray-500">
                      Price/SqFt: <span className="text-cyan-400">${(comp.salePrice / comp.squareFootage).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}

              {comps.length < 6 && (
                <Button
                  variant="outline"
                  onClick={addComp}
                  className="w-full border-gray-700 text-gray-300"
                  data-testid="button-add-comp"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Comparable Property ({comps.length}/6)
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            ARV & Purchase Analysis
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center">
                After-Repair Value (ARV)
                <InfoTooltip content={useCompMethod ? 'Calculated from comp average price/sqft x your property sqft.' : 'Calculated as Purchase Price + (Repair Costs x Multiplier).'} />
              </span>
              <span className="text-cyan-400 text-lg font-bold" data-testid="result-arv">
                {formatCurrency(arv)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Method: {useCompMethod ? `Comp-Based (${validComps.length} comps)` : `Value-Add (${multiplier}x)`}</span>
              {useCompMethod && <span>Avg: ${avgPricePerSqFt.toFixed(2)}/sqft</span>}
            </div>
            <hr className="border-gray-700" />
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center">
                Max Purchase (70% Rule)
                <InfoTooltip content="(ARV x 0.70) - Repair Costs. Conservative approach used by experienced flippers." />
              </span>
              <span className="text-white font-medium" data-testid="result-max-70">
                {formatCurrency(maxPurchase70)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center">
                Max Purchase (75% Rule)
                <InfoTooltip content="(ARV x 0.75) - Repair Costs. Slightly less conservative, still builds in a margin." />
              </span>
              <span className="text-white font-medium" data-testid="result-max-75">
                {formatCurrency(maxPurchase75)}
              </span>
            </div>

            {purchasePrice > 0 && (
              <>
                <div className="text-xs mt-1">
                  {purchasePrice <= maxPurchase70 ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Below 70% Rule - Good Entry Point
                    </Badge>
                  ) : purchasePrice <= maxPurchase75 ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      Between 70-75% Rule - Moderate Risk
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Above 75% Rule - High Risk
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Deal Analysis
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Purchase Price</span>
              <span className="text-gray-300">{formatCurrency(purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Repair Costs</span>
              <span className="text-gray-300">{formatCurrency(repairCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Holding Costs ({holdingMonths} mo x {formatCurrency(holdingCostMonthly)})</span>
              <span className="text-gray-300">{formatCurrency(holdingCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Selling Costs ({formatPercent(sellingCostPercent)} of ARV)</span>
              <span className="text-gray-300">{formatCurrency(sellingCosts)}</span>
            </div>
            <hr className="border-gray-700" />
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Total Investment</span>
              <span className="text-white font-bold" data-testid="result-total-investment">
                {formatCurrency(totalInvestment)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">ARV (Sale Price)</span>
              <span className="text-cyan-400 font-bold">{formatCurrency(arv)}</span>
            </div>
            <hr className="border-cyan-500/30" />
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Estimated Profit</span>
              <span className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="result-profit">
                {formatCurrency(profit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">ROI</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getRoiColor(roi)}`} data-testid="result-roi">
                  {formatPercent(roi)}
                </span>
                {getRoiBadge(roi)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex rounded-lg overflow-hidden h-6 text-xs">
              {totalInvestment > 0 && arv > 0 && (
                <>
                  <div
                    className="bg-blue-500/60 flex items-center justify-center text-white truncate px-1"
                    style={{ width: `${Math.min((purchasePrice / arv) * 100, 100)}%` }}
                    title={`Purchase: ${formatCurrency(purchasePrice)}`}
                  >
                    Purchase
                  </div>
                  <div
                    className="bg-orange-500/60 flex items-center justify-center text-white truncate px-1"
                    style={{ width: `${Math.min((repairCosts / arv) * 100, 100)}%` }}
                    title={`Repairs: ${formatCurrency(repairCosts)}`}
                  >
                    Repairs
                  </div>
                  <div
                    className="bg-gray-500/60 flex items-center justify-center text-white truncate px-1"
                    style={{ width: `${Math.min(((holdingCosts + sellingCosts) / arv) * 100, 100)}%` }}
                    title={`Costs: ${formatCurrency(holdingCosts + sellingCosts)}`}
                  >
                    Costs
                  </div>
                  {profit > 0 && (
                    <div
                      className="bg-green-500/60 flex items-center justify-center text-white truncate px-1"
                      style={{ width: `${Math.min((profit / arv) * 100, 100)}%` }}
                      title={`Profit: ${formatCurrency(profit)}`}
                    >
                      Profit
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>$0</span>
              <span>ARV: {formatCurrency(arv)}</span>
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
                <span className="text-cyan-400 font-medium">ARV (After-Repair Value)</span> is the estimated market value of a property after all planned renovations are completed.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Comp-Based Method:</span> We calculate the average price per square foot from comparable recently-sold renovated properties in the same area, then multiply by your property's square footage.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Value-Add Method:</span> When no comps are available, we estimate ARV by adding a multiplied value of repairs to the current property value. The multiplier (1.3x-1.7x) reflects how much value renovation typically adds.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">The 70% Rule:</span> Most experienced investors won't pay more than 70% of the ARV minus repair costs. This builds in a profit margin and buffer for unexpected expenses.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Holding Costs:</span> Monthly costs during renovation (mortgage, utilities, insurance, taxes) that reduce your profit.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">ROI Thresholds:</span>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li><span className="text-green-400">Green (&gt;15%)</span>: Strong deal with healthy profit margin</li>
                  <li><span className="text-yellow-400">Yellow (5-15%)</span>: Moderate deal, proceed with caution</li>
                  <li><span className="text-red-400">Red (&lt;5%)</span>: Weak deal, high risk of loss</li>
                </ul>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500">
                  ARV methodology based on standard real estate investment appraisal practices. The 70% Rule is an industry-standard guideline used by fix-and-flip investors.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
