import { Card } from '@/components/ui/card';
import { Home } from 'lucide-react';
import type { PropertyListingsData } from '@shared/schema';

interface PropertyListingsProps {
  data: PropertyListingsData;
}

export default function PropertyListings({ data }: PropertyListingsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className="p-6 glass-card border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Home className="w-5 h-5 text-cyan-400 icon-glow" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Available Properties</h3>
          <p className="text-sm text-gray-400">
            {data.total_count} listings in this area
          </p>
        </div>
      </div>

      {/* Market Summary */}
      {(data.median_price || data.avg_price || data.avg_days_on_market) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          {data.median_price && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Median Price</p>
              <p className="text-xl font-bold font-mono text-cyan-400">{formatPrice(data.median_price)}</p>
            </div>
          )}
          {data.avg_price && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Average Price</p>
              <p className="text-xl font-bold font-mono text-white">{formatPrice(data.avg_price)}</p>
            </div>
          )}
          {data.avg_days_on_market && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Avg. Days on Market</p>
              <p className="text-xl font-bold font-mono text-white">{data.avg_days_on_market} days</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
