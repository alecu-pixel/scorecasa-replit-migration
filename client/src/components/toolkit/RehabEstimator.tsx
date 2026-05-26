import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Hammer, BookOpen, DollarSign, Ruler, ChevronDown, ChevronUp } from 'lucide-react';

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

type ScopeLevel = 'none' | 'light' | 'mid' | 'high';

interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  scopes: {
    light: { label: string; low: number; high: number };
    mid: { label: string; low: number; high: number };
    high: { label: string; low: number; high: number };
  };
  perUnit?: string;
  hasQuantity?: boolean;
  defaultQuantity?: number;
  tooltip: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: 'kitchen',
    scopes: {
      light: { label: 'Light Refresh', low: 5000, high: 15000 },
      mid: { label: 'Mid-Range Remodel', low: 15000, high: 40000 },
      high: { label: 'High-End Remodel', low: 40000, high: 75000 },
    },
    tooltip: 'Kitchen renovation costs include cabinets, countertops, appliances, backsplash, and labor.',
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: 'bathroom',
    scopes: {
      light: { label: 'Light Refresh', low: 3000, high: 8000 },
      mid: { label: 'Mid-Range Remodel', low: 8000, high: 20000 },
      high: { label: 'High-End Remodel', low: 20000, high: 40000 },
    },
    hasQuantity: true,
    defaultQuantity: 1,
    perUnit: 'bathroom',
    tooltip: 'Per bathroom cost. Includes fixtures, tile, vanity, and labor. Multiply by number of bathrooms.',
  },
  {
    id: 'flooring',
    name: 'Flooring',
    icon: 'flooring',
    scopes: {
      light: { label: 'Laminate/Carpet', low: 2, high: 8 },
      mid: { label: 'Hardwood', low: 6, high: 12 },
      high: { label: 'Tile', low: 5, high: 15 },
    },
    hasQuantity: true,
    defaultQuantity: 1000,
    perUnit: 'sq ft',
    tooltip: 'Cost per square foot including materials and installation. Carpet: $2-$5, Laminate: $3-$8, Hardwood: $6-$12, Tile: $5-$15.',
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'painting',
    scopes: {
      light: { label: 'Interior Only', low: 1.5, high: 3.5 },
      mid: { label: 'Exterior Only', low: 2, high: 5 },
      high: { label: 'Interior + Exterior', low: 1.5, high: 5 },
    },
    hasQuantity: true,
    defaultQuantity: 1500,
    perUnit: 'sq ft',
    tooltip: 'Cost per square foot. Interior: $1.50-$3.50/sqft, Exterior: $2-$5/sqft.',
  },
  {
    id: 'roof',
    name: 'Roof',
    icon: 'roof',
    scopes: {
      light: { label: 'Asphalt Shingles', low: 3, high: 7 },
      mid: { label: 'Architectural Shingles', low: 5, high: 12 },
      high: { label: 'Metal Roof', low: 8, high: 15 },
    },
    hasQuantity: true,
    defaultQuantity: 1500,
    perUnit: 'sq ft',
    tooltip: 'Cost per square foot of roof area. Asphalt: $3-$7, Architectural: $5-$12, Metal: $8-$15.',
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'hvac',
    scopes: {
      light: { label: 'Repair/Service', low: 3000, high: 7000 },
      mid: { label: 'New System', low: 5000, high: 12000 },
      high: { label: 'New System + Ductwork', low: 10000, high: 20000 },
    },
    tooltip: 'Heating, ventilation, and air conditioning. Repair: $3k-$7k, New system: $5k-$12k.',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'plumbing',
    scopes: {
      light: { label: 'Minor Repairs', low: 1000, high: 3000 },
      mid: { label: 'Major Repairs', low: 5000, high: 15000 },
      high: { label: 'Full Re-pipe', low: 8000, high: 20000 },
    },
    tooltip: 'Plumbing work. Minor: $1k-$3k, Major: $5k-$15k. Older homes may need full re-piping.',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'electrical',
    scopes: {
      light: { label: 'Minor Updates', low: 1000, high: 3000 },
      mid: { label: 'Major Updates', low: 5000, high: 15000 },
      high: { label: 'Full Rewire', low: 8000, high: 20000 },
    },
    tooltip: 'Electrical work. Minor: $1k-$3k, Major: $5k-$15k, Full rewire: $8k-$20k.',
  },
  {
    id: 'windows',
    name: 'Windows',
    icon: 'windows',
    scopes: {
      light: { label: 'Standard Windows', low: 300, high: 800 },
      mid: { label: 'Premium Windows', low: 800, high: 1500 },
      high: { label: 'High-Performance', low: 1200, high: 2000 },
    },
    hasQuantity: true,
    defaultQuantity: 8,
    perUnit: 'window',
    tooltip: 'Cost per window including installation. Standard: $300-$800, Premium: $800-$1,500.',
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: 'landscaping',
    scopes: {
      light: { label: 'Basic Cleanup', low: 2000, high: 5000 },
      mid: { label: 'Moderate', low: 5000, high: 15000 },
      high: { label: 'Extensive', low: 15000, high: 30000 },
    },
    tooltip: 'Landscaping costs. Basic: $2k-$5k, Moderate: $5k-$15k, Extensive: $15k-$30k.',
  },
];

interface CategoryState {
  scope: ScopeLevel;
  quantity: number;
}

function getCategoryEstimate(cat: CategoryConfig, state: CategoryState): { low: number; high: number } {
  if (state.scope === 'none') return { low: 0, high: 0 };
  const scopeData = cat.scopes[state.scope];
  const multiplier = cat.hasQuantity ? state.quantity : 1;
  return {
    low: scopeData.low * multiplier,
    high: scopeData.high * multiplier,
  };
}

export default function RehabEstimator() {
  const [propertySquareFootage, setPropertySquareFootage] = useState(1500);
  const [contingencyPercent, setContingencyPercent] = useState(12);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [categoryStates, setCategoryStates] = useState<Record<string, CategoryState>>(() => {
    const initial: Record<string, CategoryState> = {};
    for (const cat of CATEGORIES) {
      initial[cat.id] = {
        scope: 'none',
        quantity: cat.defaultQuantity || 1,
      };
    }
    return initial;
  });

  const updateCategory = (id: string, updates: Partial<CategoryState>) => {
    setCategoryStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categoryEstimates = CATEGORIES.map(cat => ({
    ...cat,
    estimate: getCategoryEstimate(cat, categoryStates[cat.id]),
  }));

  const subtotalLow = categoryEstimates.reduce((sum, c) => sum + c.estimate.low, 0);
  const subtotalHigh = categoryEstimates.reduce((sum, c) => sum + c.estimate.high, 0);

  const contingencyLow = subtotalLow * (contingencyPercent / 100);
  const contingencyHigh = subtotalHigh * (contingencyPercent / 100);

  const grandTotalLow = subtotalLow + contingencyLow;
  const grandTotalHigh = subtotalHigh + contingencyHigh;

  const costPerSqFtLow = propertySquareFootage > 0 ? grandTotalLow / propertySquareFootage : 0;
  const costPerSqFtHigh = propertySquareFootage > 0 ? grandTotalHigh / propertySquareFootage : 0;

  const midEstimate = (grandTotalLow + grandTotalHigh) / 2;

  const scopeLabel = (scope: ScopeLevel): string => {
    switch (scope) {
      case 'none': return 'None';
      case 'light': return 'Light';
      case 'mid': return 'Mid-Range';
      case 'high': return 'High-End';
    }
  };

  const scopeBadgeClass = (scope: ScopeLevel): string => {
    switch (scope) {
      case 'none': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'light': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'mid': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  return (
    <Card className="glass border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap text-white">
          <Hammer className="w-5 h-5 text-cyan-400" />
          Rehab Cost Estimator
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            Renovation Tool
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Estimate renovation costs by category. Select scope level and quantities for an accurate budget.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400 text-sm flex items-center">
              Property Square Footage
              <InfoTooltip content="Total living area in square feet. Used to calculate cost per square foot." />
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={propertySquareFootage}
                onChange={(e) => setPropertySquareFootage(Number(e.target.value))}
                className="bg-gray-800/50 border-gray-700"
                data-testid="input-property-sqft"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sq ft</span>
            </div>
          </div>
          <div>
            <Label className="text-gray-400 text-sm flex items-center">
              Contingency (%)
              <InfoTooltip content="Buffer for unexpected costs. Recommended 10-15%, especially for older homes." />
            </Label>
            <Input
              type="number"
              value={contingencyPercent}
              onChange={(e) => setContingencyPercent(Number(e.target.value))}
              className="mt-1 bg-gray-800/50 border-gray-700"
              min={0}
              max={50}
              data-testid="input-contingency"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-300 flex items-center gap-1">
            Renovation Categories
            <InfoTooltip content="Select a scope level for each category. Leave as 'None' to exclude." />
          </h4>

          <div className="space-y-2">
            {CATEGORIES.map(cat => {
              const state = categoryStates[cat.id];
              const estimate = getCategoryEstimate(cat, state);
              const isExpanded = expandedCategories[cat.id] || false;
              const isActive = state.scope !== 'none';

              return (
                <div
                  key={cat.id}
                  className={`rounded-lg border transition-colors ${
                    isActive ? 'border-cyan-500/30 bg-gray-800/40' : 'border-gray-700/50 bg-gray-800/20'
                  }`}
                  data-testid={`category-${cat.id}`}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 p-3 text-left"
                    onClick={() => toggleExpand(cat.id)}
                    data-testid={`toggle-${cat.id}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{cat.name}</span>
                      <Badge className={scopeBadgeClass(state.scope)} data-testid={`badge-scope-${cat.id}`}>
                        {scopeLabel(state.scope)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {isActive && (
                        <span className="text-cyan-400 text-sm font-medium" data-testid={`subtotal-${cat.id}`}>
                          {formatCurrency(estimate.low)} - {formatCurrency(estimate.high)}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      <div>
                        <Label className="text-gray-400 text-xs">Scope Level</Label>
                        <Select
                          value={state.scope}
                          onValueChange={(val) => updateCategory(cat.id, { scope: val as ScopeLevel })}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-700 mt-1" data-testid={`select-scope-${cat.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="light">{cat.scopes.light.label} ({formatCurrency(cat.scopes.light.low)}-{formatCurrency(cat.scopes.light.high)}{cat.perUnit ? `/${cat.perUnit}` : ''})</SelectItem>
                            <SelectItem value="mid">{cat.scopes.mid.label} ({formatCurrency(cat.scopes.mid.low)}-{formatCurrency(cat.scopes.mid.high)}{cat.perUnit ? `/${cat.perUnit}` : ''})</SelectItem>
                            <SelectItem value="high">{cat.scopes.high.label} ({formatCurrency(cat.scopes.high.low)}-{formatCurrency(cat.scopes.high.high)}{cat.perUnit ? `/${cat.perUnit}` : ''})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {cat.hasQuantity && (
                        <div>
                          <Label className="text-gray-400 text-xs flex items-center">
                            {cat.perUnit === 'sq ft' ? 'Square Footage' : cat.perUnit === 'window' ? 'Number of Windows' : `Number of ${cat.perUnit}s`}
                            <InfoTooltip content={cat.tooltip} />
                          </Label>
                          <Input
                            type="number"
                            value={state.quantity}
                            onChange={(e) => updateCategory(cat.id, { quantity: Number(e.target.value) })}
                            className="mt-1 bg-gray-800/50 border-gray-700"
                            min={0}
                            data-testid={`input-quantity-${cat.id}`}
                          />
                        </div>
                      )}

                      {isActive && (
                        <div className="bg-gray-700/30 rounded-lg p-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Estimated Range:</span>
                            <span className="text-cyan-400 font-medium">
                              {formatCurrency(estimate.low)} - {formatCurrency(estimate.high)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            Cost Summary
          </h4>

          <div className="space-y-2 text-sm">
            {categoryEstimates
              .filter(c => c.estimate.low > 0 || c.estimate.high > 0)
              .map(c => (
                <div key={c.id} className="flex justify-between">
                  <span className="text-gray-400">{c.name}</span>
                  <span className="text-gray-300">
                    {formatCurrency(c.estimate.low)} - {formatCurrency(c.estimate.high)}
                  </span>
                </div>
              ))}

            {subtotalLow > 0 && (
              <>
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal (before contingency)</span>
                  <span className="text-gray-300" data-testid="result-subtotal">
                    {formatCurrency(subtotalLow)} - {formatCurrency(subtotalHigh)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Contingency ({formatPercent(contingencyPercent)})</span>
                  <span className="text-gray-300" data-testid="result-contingency">
                    {formatCurrency(contingencyLow)} - {formatCurrency(contingencyHigh)}
                  </span>
                </div>
                <hr className="border-cyan-500/30" />
              </>
            )}

            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Estimated Total</span>
              <span className="text-cyan-400 text-lg font-bold" data-testid="result-grand-total">
                {formatCurrency(grandTotalLow)} - {formatCurrency(grandTotalHigh)}
              </span>
            </div>

            {grandTotalLow > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Mid-Point Estimate</span>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" data-testid="result-mid-estimate">
                  {formatCurrency(midEstimate)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {grandTotalLow > 0 && (
          <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Ruler className="w-4 h-4 text-cyan-400" />
              Cost Per Square Foot
            </h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Rehab Cost / Property Sq Ft</span>
              <span className="text-cyan-400 font-bold" data-testid="result-cost-per-sqft">
                ${costPerSqFtLow.toFixed(2)} - ${costPerSqFtHigh.toFixed(2)} / sq ft
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Based on {propertySquareFootage.toLocaleString()} sq ft property
            </p>
          </div>
        )}

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
                <span className="text-cyan-400 font-medium">Data Sources:</span> Cost estimates are based on national average renovation costs from industry data including HomeAdvisor, Angi, and the National Association of Home Builders (NAHB) 2024 Cost of Doing Business survey.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Location Variance:</span> Actual costs vary significantly by location, material quality, labor availability, and property condition.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Contractor Quotes:</span> We recommend getting 3 contractor quotes before finalizing your renovation budget.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">The 70% Rule:</span> Investors typically pay no more than 70% of After-Repair Value (ARV) minus repair costs.
              </div>
              <div>
                <span className="text-cyan-400 font-medium">Contingency:</span> Always include 10-15% contingency for unexpected issues, especially in older homes.
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500">
                  Estimates are for planning purposes only. Actual renovation costs depend on local labor rates, material selections, property condition, and project complexity.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
