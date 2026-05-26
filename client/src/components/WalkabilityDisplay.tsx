import { Card } from '@/components/ui/card';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Amenity } from '@shared/schema';

interface WalkabilityDisplayProps {
  data: {
    walkScore: number;
    transitScore: number;
    bikeScore: number;
    amenityCount: number;
    amenities: Amenity[];
  };
}

export default function WalkabilityDisplay({ data }: WalkabilityDisplayProps) {
  const [showAmenities, setShowAmenities] = useState(false);

  const getWalkabilityLabel = (score: number) => {
    if (score >= 90) return "Walker's Paradise";
    if (score >= 70) return 'Very Walkable';
    if (score >= 50) return 'Somewhat Walkable';
    if (score >= 25) return 'Car-Dependent';
    return 'Very Car-Dependent';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-cyan-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (score >= 60) return 'bg-gradient-to-r from-cyan-500 to-cyan-400';
    if (score >= 40) return 'bg-gradient-to-r from-amber-500 to-amber-400';
    return 'bg-gradient-to-r from-red-500 to-red-400';
  };

  const groupedAmenities = data.amenities.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity);
    return acc;
  }, {} as Record<string, Amenity[]>);

  return (
    <Card className="p-6 glass-card border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <MapPin className="w-5 h-5 text-purple-400 icon-glow-purple" />
        </div>
        <h3 className="text-lg font-semibold text-white">Walkability & Transit</h3>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium text-gray-400">Walk Score</span>
            <span className={`text-3xl font-bold font-mono ${getScoreColor(data.walkScore)}`} data-testid="text-walk-score">{data.walkScore}</span>
          </div>
          <p className="text-sm text-gray-400 mb-2">
            {getWalkabilityLabel(data.walkScore)}
          </p>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getBarColor(data.walkScore)}`}
              style={{ width: `${data.walkScore}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium text-gray-400">Transit Score</span>
            <span className={`text-2xl font-bold font-mono ${getScoreColor(data.transitScore)}`}>{data.transitScore}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getBarColor(data.transitScore)}`}
              style={{ width: `${data.transitScore}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium text-gray-400">Bike Score</span>
            <span className={`text-2xl font-bold font-mono ${getScoreColor(data.bikeScore)}`}>{data.bikeScore}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getBarColor(data.bikeScore)}`}
              style={{ width: `${data.bikeScore}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm text-gray-400 mb-1">Nearby Amenities</p>
              <p className="text-2xl font-bold font-mono text-cyan-400">{data.amenityCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                Within 1km radius
              </p>
            </div>
            {data.amenities.length > 0 && (
              <button
                onClick={() => setShowAmenities(!showAmenities)}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:bg-cyan-500/10 px-3 py-2 rounded-md transition-colors border border-cyan-500/30"
                data-testid="button-toggle-amenities"
              >
                {showAmenities ? (
                  <>
                    Hide List
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    View List
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {showAmenities && data.amenities.length > 0 && (
            <div className="mt-4 space-y-4 max-h-80 overflow-y-auto" data-testid="amenities-list">
              {Object.entries(groupedAmenities).map(([category, amenities]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    {category} ({amenities.length})
                  </h4>
                  <div className="space-y-1">
                    {amenities.map((amenity, idx) => (
                      <div
                        key={`${category}-${idx}`}
                        className="flex justify-between items-center py-1.5 px-2 rounded-md bg-gray-800/50 text-sm"
                        data-testid={`amenity-${category}-${idx}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-300">{amenity.name}</span>
                          <span className="text-xs text-gray-500">{amenity.type}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-500">
                          {amenity.distance.toFixed(2)} km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
