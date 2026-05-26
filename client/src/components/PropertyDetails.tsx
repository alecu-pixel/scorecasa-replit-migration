import { Card } from '@/components/ui/card';
import { Home, DollarSign } from 'lucide-react';

interface PropertyDetailsProps {
  data: {
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    yearBuilt: number;
    pricePerSqft: number;
    estimatedRent: number;
  };
}

export default function PropertyDetails({ data }: PropertyDetailsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Property Details</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Price</p>
          <p className="text-xl font-bold font-mono" data-testid="text-price">{formatCurrency(data.price)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Price per Sqft</p>
          <p className="text-xl font-bold font-mono">{formatCurrency(data.pricePerSqft)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Bedrooms</p>
          <p className="text-xl font-bold font-mono">{data.bedrooms}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Bathrooms</p>
          <p className="text-xl font-bold font-mono">{data.bathrooms}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Square Feet</p>
          <p className="text-xl font-bold font-mono">{data.sqft.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Year Built</p>
          <p className="text-xl font-bold font-mono">{data.yearBuilt}</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Estimated Monthly Rent</p>
        </div>
        <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(data.estimatedRent)}</p>
      </div>
    </Card>
  );
}
