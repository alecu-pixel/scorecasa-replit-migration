import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, ArrowUpDown, Info, Building2 } from 'lucide-react';

interface ComparableSalesProps {
  listings: {
    property_id: string;
    listing_id: string;
    address: string;
    city: string;
    state_code: string;
    postal_code: string;
    price: number;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    prop_type: string;
    photo_url: string | null;
    lat: number | null;
    lon: number | null;
    daysOnZillow: number | null;
  }[];
  totalCount: number;
  medianPrice: number | null;
  avgPrice: number | null;
  avgDaysOnMarket: number | null;
  subjectPropertyPrice: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type SortField = 'price' | 'sqft' | 'ppsqft' | 'days';
type SortDir = 'asc' | 'desc';

export default function ComparableSales({
  listings,
  totalCount,
  medianPrice,
  avgPrice,
  avgDaysOnMarket,
  subjectPropertyPrice,
}: ComparableSalesProps) {
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const displayListings = [...listings]
    .sort((a, b) => {
      let aVal = 0;
      let bVal = 0;
      switch (sortField) {
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'sqft':
          aVal = a.sqft ?? 0;
          bVal = b.sqft ?? 0;
          break;
        case 'ppsqft':
          aVal = a.sqft ? a.price / a.sqft : 0;
          bVal = b.sqft ? b.price / b.sqft : 0;
          break;
        case 'days':
          aVal = a.daysOnZillow ?? 0;
          bVal = b.daysOnZillow ?? 0;
          break;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    })
    .slice(0, 10);

  const compsWithSqft = listings.filter((l) => l.sqft && l.sqft > 0);
  const avgPricePerSqft =
    compsWithSqft.length > 0
      ? compsWithSqft.reduce((sum, l) => sum + l.price / l.sqft!, 0) / compsWithSqft.length
      : null;

  const prices = listings.map((l) => l.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  const marketAvg = avgPrice ?? (prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null);
  const priceDiff = marketAvg ? subjectPropertyPrice - marketAvg : null;
  const priceDiffPct = marketAvg && marketAvg > 0 ? (priceDiff! / marketAvg) * 100 : null;

  if (!listings || listings.length === 0) {
    return (
      <Card className="glass border-gray-700/50" data-testid="comparable-sales-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Home className="w-5 h-5 text-cyan-400" />
            Comparable Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400" data-testid="text-no-comps">No comparable properties found</p>
            <p className="text-gray-500 text-sm mt-1">
              Try expanding your search area or adjusting filters.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-gray-700/50" data-testid="comparable-sales">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Home className="w-5 h-5 text-cyan-400" />
          Comparable Sales
          <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            {totalCount} Found
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Nearby comparable properties currently listed on the market
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
          data-testid="market-overview-stats"
        >
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Properties</p>
            <p className="text-xl font-bold font-mono text-cyan-400" data-testid="stat-total-properties">
              {totalCount}
            </p>
          </div>
          {medianPrice !== null && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Median Price</p>
              <p className="text-xl font-bold font-mono text-white" data-testid="stat-median-price">
                {formatCurrency(medianPrice)}
              </p>
            </div>
          )}
          {avgPrice !== null && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Avg Price</p>
              <p className="text-xl font-bold font-mono text-white" data-testid="stat-avg-price">
                {formatCurrency(avgPrice)}
              </p>
            </div>
          )}
          {avgDaysOnMarket !== null && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Avg Days on Market</p>
              <p className="text-xl font-bold font-mono text-white" data-testid="stat-avg-days">
                {avgDaysOnMarket} days
              </p>
            </div>
          )}
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
          data-testid="summary-calculations"
        >
          {avgPricePerSqft !== null && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg Price/SqFt</p>
                <p className="text-lg font-bold text-white" data-testid="stat-avg-ppsqft">
                  {formatCurrency(Math.round(avgPricePerSqft))}
                </p>
              </div>
            </div>
          )}
          {minPrice !== null && maxPrice !== null && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Price Range</p>
                <p className="text-lg font-bold text-white" data-testid="stat-price-range">
                  {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
                </p>
              </div>
            </div>
          )}
          {priceDiff !== null && priceDiffPct !== null && (
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  priceDiff > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'
                }`}
              >
                {priceDiff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">vs Market Avg</p>
                <p
                  className={`text-lg font-bold ${priceDiff > 0 ? 'text-red-400' : 'text-green-400'}`}
                  data-testid="stat-vs-market"
                >
                  {priceDiff > 0 ? '+' : ''}
                  {priceDiffPct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-sm font-medium text-gray-300">
              Showing {displayListings.length} of {totalCount} comps
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Sort by:</span>
              {([
                ['price', 'Price'],
                ['sqft', 'SqFt'],
                ['ppsqft', '$/SqFt'],
                ['days', 'Days'],
              ] as [SortField, string][]).map(([field, label]) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    sortField === field
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  data-testid={`sort-${field}`}
                >
                  {label}
                  {sortField === field && (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="comps-grid">
            {displayListings.map((listing) => {
              const pricePerSqft = listing.sqft && listing.sqft > 0 ? listing.price / listing.sqft : null;
              const isAboveSubject = listing.price > subjectPropertyPrice;
              const isBelowSubject = listing.price < subjectPropertyPrice;

              return (
                <div
                  key={listing.listing_id}
                  className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 space-y-3"
                  data-testid={`comp-card-${listing.listing_id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate" data-testid={`comp-address-${listing.listing_id}`}>
                        {listing.address}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {listing.city}, {listing.state_code} {listing.postal_code}
                      </p>
                    </div>
                    <p
                      className={`text-lg font-bold font-mono flex-shrink-0 ${
                        isBelowSubject ? 'text-green-400' : isAboveSubject ? 'text-red-400' : 'text-white'
                      }`}
                      data-testid={`comp-price-${listing.listing_id}`}
                    >
                      {formatCurrency(listing.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {listing.beds !== null && (
                      <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/50" data-testid={`comp-beds-${listing.listing_id}`}>
                        {listing.beds} bed
                      </Badge>
                    )}
                    {listing.baths !== null && (
                      <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/50" data-testid={`comp-baths-${listing.listing_id}`}>
                        {listing.baths} bath
                      </Badge>
                    )}
                    {listing.sqft !== null && (
                      <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/50" data-testid={`comp-sqft-${listing.listing_id}`}>
                        {listing.sqft.toLocaleString()} sqft
                      </Badge>
                    )}
                    <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/50" data-testid={`comp-type-${listing.listing_id}`}>
                      {listing.prop_type}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    {pricePerSqft !== null && (
                      <span data-testid={`comp-ppsqft-${listing.listing_id}`}>
                        {formatCurrency(Math.round(pricePerSqft))}/sqft
                      </span>
                    )}
                    {listing.daysOnZillow !== null && (
                      <span className="flex items-center gap-1" data-testid={`comp-days-${listing.listing_id}`}>
                        <Clock className="w-3 h-3" />
                        {listing.daysOnZillow} days on market
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3" data-testid="educational-section">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <h4 className="text-sm font-medium text-cyan-400">How is this calculated?</h4>
          </div>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>Comparable properties (comps) are similar nearby properties currently listed on the market</li>
            <li>Price Per Square Foot allows you to compare properties of different sizes on an even basis</li>
            <li>Days on Market indicates how quickly properties are selling - fewer days suggests a hotter market</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2">
            Property listing data sourced from MLS and public real estate databases via US Housing Market Data API
          </p>
          <p className="text-xs text-gray-500">
            Note: These are active listings, not recently sold properties. Actual sale prices may differ from listing prices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
