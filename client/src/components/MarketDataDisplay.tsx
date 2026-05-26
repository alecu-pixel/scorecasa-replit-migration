import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { MarketData } from '@shared/schema';

interface MarketDataDisplayProps {
  data: MarketData;
}

export default function MarketDataDisplay({ data }: MarketDataDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className="p-6 glass-card border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <TrendingUp className="w-5 h-5 text-cyan-400 icon-glow" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Market Statistics</h3>
          <p className="text-sm text-gray-400">ZIP {data.zipCode}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {data.medianHomeValue && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Median Home Value</p>
              <p className="text-xl font-bold font-mono text-cyan-400">
                {formatCurrency(data.medianHomeValue)}
              </p>
            </div>
          )}
          {data.medianRent && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Median Rent</p>
              <p className="text-xl font-bold font-mono text-white">
                {formatCurrency(data.medianRent)}
              </p>
            </div>
          )}
          {data.homeownershipRate !== null && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Homeownership Rate</p>
              <p className="text-xl font-bold font-mono text-white">
                {formatPercent(data.homeownershipRate)}
              </p>
            </div>
          )}
          {data.vacancyRate !== null && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Vacancy Rate</p>
              <p className="text-xl font-bold font-mono text-white">
                {formatPercent(data.vacancyRate)}
              </p>
            </div>
          )}
          {data.totalHousingUnits && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Housing Units</p>
              <p className="text-xl font-bold font-mono text-white">
                {data.totalHousingUnits.toLocaleString()}
              </p>
            </div>
          )}
          {data.occupiedUnits && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Occupied Units</p>
              <p className="text-xl font-bold font-mono text-white">
                {data.occupiedUnits.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
