import { Card } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

interface DemographicsDisplayProps {
  data: {
    medianIncome: number;
    population: number;
    employmentRate: number;
    collegeDegreePct: number;
    housingUnits: number;
    zipName: string;
    populationGrowth5yr?: number;
    incomeGrowth5yr?: number;
    housingGrowth5yr?: number;
  };
}

export default function DemographicsDisplay({ data }: DemographicsDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return null;
  };

  return (
    <Card className="p-6 glass-card border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Users className="w-5 h-5 text-cyan-400 icon-glow" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Demographics</h3>
          <p className="text-sm text-gray-400">{data.zipName}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Median Income</p>
            <p className="text-xl font-bold font-mono text-cyan-400" data-testid="text-median-income">
              {formatCurrency(data.medianIncome)}
            </p>
            {data.incomeGrowth5yr !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon value={data.incomeGrowth5yr} />
                <span className="text-sm text-gray-500">
                  {data.incomeGrowth5yr > 0 ? '+' : ''}{data.incomeGrowth5yr.toFixed(1)}% (5yr)
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Population</p>
            <p className="text-xl font-bold font-mono text-white">{data.population.toLocaleString()}</p>
            {data.populationGrowth5yr !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon value={data.populationGrowth5yr} />
                <span className="text-sm text-gray-500">
                  {data.populationGrowth5yr > 0 ? '+' : ''}{data.populationGrowth5yr.toFixed(1)}% (5yr)
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Employment Rate</p>
            <p className="text-xl font-bold font-mono text-white">{data.employmentRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">College Degree</p>
            <p className="text-xl font-bold font-mono text-white">{data.collegeDegreePct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Housing Units</p>
            <p className="text-xl font-bold font-mono text-white">{data.housingUnits.toLocaleString()}</p>
            {data.housingGrowth5yr !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon value={data.housingGrowth5yr} />
                <span className="text-sm text-gray-500">
                  {data.housingGrowth5yr > 0 ? '+' : ''}{data.housingGrowth5yr.toFixed(1)}% (5yr)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
