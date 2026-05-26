import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin } from 'lucide-react';
import type { NearbyZipCrimeData } from '@shared/schema';
import 'leaflet/dist/leaflet.css';

interface CrimeMapProps {
  mainZip: string;
  mainGrade: string;
  mainGradeColor: string;
  nearbyZips: NearbyZipCrimeData[];
  centerLat?: number;
  centerLng?: number;
}

interface ZipLocation {
  zipCode: string;
  lat: number;
  lng: number;
  grade: string;
  gradeColor: string;
  isMain: boolean;
}

const gradeColorMap: Record<string, string> = {
  'A+': '#22c55e', 'A': '#22c55e', 'A-': '#22c55e',
  'B+': '#84cc16', 'B': '#84cc16', 'B-': '#84cc16',
  'C+': '#eab308', 'C': '#eab308', 'C-': '#eab308',
  'D+': '#f97316', 'D': '#f97316', 'D-': '#f97316',
  'F': '#ef4444'
};

const getGradeColor = (grade: string): string => {
  return gradeColorMap[grade.toUpperCase()] || '#6b7280';
};

async function geocodeZip(zipCode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zipCode}&country=US&limit=1`,
      {
        headers: {
          'User-Agent': 'ScoreCasa/1.0'
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch {
    return null;
  }
}

function MapBoundsUpdater({ locations }: { locations: ZipLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations.map(loc => [loc.lat, loc.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [locations, map]);
  
  return null;
}

export default function CrimeMap({ mainZip, mainGrade, mainGradeColor, nearbyZips, centerLat, centerLng }: CrimeMapProps) {
  const [locations, setLocations] = useState<ZipLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLocations() {
      setLoading(true);
      setError(null);
      
      try {
        const allZips = [
          { zipCode: mainZip, grade: mainGrade, gradeColor: mainGradeColor, isMain: true },
          ...nearbyZips.slice(0, 8).map(nz => ({
            zipCode: nz.zipCode,
            grade: nz.overallGrade,
            gradeColor: nz.gradeColor || getGradeColor(nz.overallGrade),
            isMain: false
          }))
        ];
        
        const geocodePromises = allZips.map(async (zip) => {
          if (zip.isMain && centerLat && centerLng) {
            return {
              ...zip,
              lat: centerLat,
              lng: centerLng
            };
          }
          
          const coords = await geocodeZip(zip.zipCode);
          if (coords) {
            return { ...zip, ...coords };
          }
          return null;
        });
        
        const results = await Promise.all(geocodePromises);
        const validLocations = results.filter((loc): loc is ZipLocation => loc !== null);
        
        if (validLocations.length === 0) {
          setError('Could not locate ZIP codes on map');
        } else {
          setLocations(validLocations);
        }
      } catch (err) {
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    }
    
    loadLocations();
  }, [mainZip, mainGrade, mainGradeColor, nearbyZips, centerLat, centerLng]);

  const center = useMemo(() => {
    const mainLoc = locations.find(l => l.isMain);
    if (mainLoc) return [mainLoc.lat, mainLoc.lng] as [number, number];
    if (centerLat && centerLng) return [centerLat, centerLng] as [number, number];
    return [39.8283, -98.5795] as [number, number];
  }, [locations, centerLat, centerLng]);

  if (loading) {
    return (
      <Card className="p-4 glass-card border-gray-700/50" data-testid="card-crime-map-loading">
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading crime map...</span>
        </div>
      </Card>
    );
  }

  if (error || locations.length === 0) {
    return (
      <Card className="p-4 glass-card border-gray-700/50" data-testid="card-crime-map-error">
        <div className="flex items-center justify-center h-48 text-gray-400">
          <MapPin className="w-5 h-5 mr-2" />
          <span className="text-sm">Map data unavailable for this area</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden glass-card border-gray-700/50" data-testid="card-crime-map">
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            Area Crime Map
          </h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Legend:</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">A</Badge>
            <Badge className="bg-lime-500/20 text-lime-400 border-lime-500/30 text-xs">B</Badge>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">C</Badge>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">D</Badge>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">F</Badge>
          </div>
        </div>
      </div>
      
      <div className="h-64" data-testid="map-container">
        <MapContainer
          center={center}
          zoom={10}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapBoundsUpdater locations={locations} />
          
          {locations.map((loc) => (
            <CircleMarker
              key={`${loc.zipCode}-${loc.isMain ? 'main' : 'nearby'}`}
              center={[loc.lat, loc.lng]}
              radius={loc.isMain ? 14 : 10}
              pathOptions={{
                color: loc.isMain ? '#06b6d4' : loc.gradeColor,
                fillColor: loc.gradeColor,
                fillOpacity: 0.7,
                weight: loc.isMain ? 3 : 2
              }}
            >
              <Popup className="crime-map-popup">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {loc.isMain ? 'Your Property' : 'Nearby Area'}
                  </div>
                  <div className="text-sm text-gray-600">ZIP: {loc.zipCode}</div>
                  <div 
                    className="text-lg font-bold mt-1"
                    style={{ color: loc.gradeColor }}
                  >
                    Grade: {loc.grade}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      
      <div className="p-2 bg-gray-800/30 border-t border-gray-700/30">
        <p className="text-xs text-gray-500 text-center">
          Circle size indicates your searched property. Colors represent overall crime grades for each ZIP code.
        </p>
      </div>
    </Card>
  );
}
