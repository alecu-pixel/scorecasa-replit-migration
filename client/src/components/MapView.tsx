import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  lat: number;
  lon: number;
  address: string;
  showFloodZones?: boolean;
}

const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const FEMA_REST_URL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer';

function sym(r: number, g: number, b: number, a: number, or: number, og: number, ob: number, oa: number, w = 0.4) {
  return {
    type: "esriSFS",
    style: "esriSFSSolid",
    color: [r, g, b, a],
    outline: { type: "esriSLS", style: "esriSLSSolid", color: [or, og, ob, oa], width: w }
  };
}

const DYNAMIC_LAYERS_JSON = JSON.stringify([
  {
    id: 28,
    source: { type: "mapLayer", mapLayerId: 28 },
    definitionExpression: "FLD_ZONE <> 'OPEN WATER' AND NOT (FLD_ZONE = 'X' AND (ZONE_SUBTY IS NULL OR ZONE_SUBTY = '' OR ZONE_SUBTY = 'AREA OF MINIMAL FLOOD HAZARD'))",
    drawingInfo: {
      renderer: {
        type: "uniqueValue",
        field1: "FLD_ZONE",
        defaultSymbol: { type: "esriSFS", style: "esriSFSNull", outline: { type: "esriSLS", style: "esriSLSNull" } },
        uniqueValueInfos: [
          { value: "V",   symbol: sym(190, 30, 45, 220,  140, 20, 30, 220, 0.5) },
          { value: "VE",  symbol: sym(190, 30, 45, 220,  140, 20, 30, 220, 0.5) },
          { value: "A",   symbol: sym(230, 130, 50, 220, 200, 100, 30, 200) },
          { value: "AE",  symbol: sym(230, 130, 50, 220, 200, 100, 30, 200) },
          { value: "AH",  symbol: sym(230, 130, 50, 220, 200, 100, 30, 200) },
          { value: "AO",  symbol: sym(230, 130, 50, 220, 200, 100, 30, 200) },
          { value: "A99", symbol: sym(230, 130, 50, 220, 200, 100, 30, 200) },
          { value: "AR",  symbol: sym(230, 130, 50, 220, 200, 100, 30, 200) },
          { value: "X",   symbol: sym(80, 180, 80, 200,  50, 140, 50, 180, 0.3) },
          { value: "D",   symbol: sym(180, 180, 180, 150, 140, 140, 140, 160, 0.3) },
        ]
      }
    }
  },
  {
    id: 2800,
    source: { type: "mapLayer", mapLayerId: 28 },
    definitionExpression: "ZONE_SUBTY LIKE '%FLOODWAY%'",
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: sym(100, 80, 200, 220, 70, 50, 170, 220, 0.5)
      }
    }
  }
]);

function FemaFloodLayer({ visible, opacity }: { visible: boolean; opacity: number }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    import('esri-leaflet').then((esri) => {
      if (cancelled) return;

      const layer = esri.dynamicMapLayer({
        url: FEMA_REST_URL,
        opacity: opacity,
        dynamicLayers: DYNAMIC_LAYERS_JSON,
        format: 'png32',
        transparent: true,
        f: 'image',
        attribution: 'Flood Zones: <a href="https://www.fema.gov/flood-maps">FEMA NFHL</a>',
        maxZoom: 19,
        minZoom: 8,
      } as any);

      layer.addTo(map);
      layerRef.current = layer;
    });

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, visible]);

  useEffect(() => {
    if (layerRef.current && layerRef.current.setOpacity) {
      layerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
}

const legendItems = [
  { color: '#BE1E2D', label: 'V, VE - Coastal Extreme' },
  { color: '#E6822F', label: 'A, AE - High Risk (100-yr)' },
  { color: '#6450C8', label: 'Floodway' },
  { color: '#50B450', label: 'X Shaded - Moderate (500-yr)' },
  { color: '#B4B4B4', label: 'D - Undetermined' },
];

export default function MapView({ lat, lon, address, showFloodZones = false }: MapViewProps) {
  const [floodLayerVisible, setFloodLayerVisible] = useState(showFloodZones);
  const [floodOpacity, setFloodOpacity] = useState(0.7);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border relative" data-testid="map-container">
      {showFloodZones && (
        <div className="absolute top-2 right-2 z-[1000]">
          <button
            onClick={() => setFloodLayerVisible(!floodLayerVisible)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-md transition-colors ${
              floodLayerVisible
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-300 border border-gray-600'
            }`}
            data-testid="button-toggle-flood-layer"
          >
            {floodLayerVisible ? 'Hide Flood Zones' : 'Show Flood Zones'}
          </button>
        </div>
      )}
      <MapContainer
        center={[lat, lon]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        data-testid="map-leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FemaFloodLayer visible={floodLayerVisible} opacity={floodOpacity} />
        <Marker position={[lat, lon]} icon={defaultIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-1">Property Location</p>
              <p className="text-muted-foreground">{address}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {lat.toFixed(6)}, {lon.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      {showFloodZones && floodLayerVisible && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-gray-900/90 rounded-md px-3 py-2.5 text-xs space-y-1.5" data-testid="flood-legend">
          <p className="font-medium text-white mb-1.5">Flood Zone Legend</p>
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-4 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-300">{item.label}</span>
            </div>
          ))}
          <p className="text-gray-500 text-[10px] mt-1">Source: FEMA NFHL</p>
          <div className="pt-1.5 border-t border-gray-700 mt-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400">Overlay Opacity:</span>
              <span className="text-gray-300">{Math.round(floodOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(floodOpacity * 100)}
              onChange={(e) => setFloodOpacity(parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              data-testid="slider-flood-opacity"
            />
          </div>
        </div>
      )}
    </div>
  );
}
