import type { WalkabilityData, Amenity } from "@shared/schema";

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to categorize amenities
function categorizeAmenity(tags: any): { type: string; category: string } {
  // Shopping
  if (tags.shop === 'supermarket') return { type: 'Supermarket', category: 'Shopping' };
  if (tags.shop === 'convenience') return { type: 'Convenience Store', category: 'Shopping' };
  if (tags.shop === 'mall') return { type: 'Shopping Mall', category: 'Shopping' };
  if (tags.shop === 'department_store') return { type: 'Department Store', category: 'Shopping' };
  if (tags.shop === 'grocery') return { type: 'Grocery Store', category: 'Shopping' };
  if (tags.shop === 'bakery') return { type: 'Bakery', category: 'Shopping' };
  if (tags.shop === 'butcher') return { type: 'Butcher', category: 'Shopping' };
  if (tags.shop === 'greengrocer') return { type: 'Greengrocer', category: 'Shopping' };
  if (tags.shop === 'clothes') return { type: 'Clothing Store', category: 'Shopping' };
  if (tags.shop === 'electronics') return { type: 'Electronics Store', category: 'Shopping' };
  if (tags.shop === 'hardware') return { type: 'Hardware Store', category: 'Shopping' };
  if (tags.shop === 'furniture') return { type: 'Furniture Store', category: 'Shopping' };
  if (tags.shop === 'books') return { type: 'Bookstore', category: 'Shopping' };
  if (tags.shop === 'florist') return { type: 'Florist', category: 'Shopping' };
  if (tags.shop === 'jewelry') return { type: 'Jewelry Store', category: 'Shopping' };
  if (tags.shop) return { type: 'Shop', category: 'Shopping' };
  
  // Dining
  if (tags.amenity === 'restaurant') return { type: 'Restaurant', category: 'Dining' };
  if (tags.amenity === 'cafe') return { type: 'Cafe', category: 'Dining' };
  if (tags.amenity === 'fast_food') return { type: 'Fast Food', category: 'Dining' };
  if (tags.amenity === 'bar') return { type: 'Bar', category: 'Dining' };
  if (tags.amenity === 'pub') return { type: 'Pub', category: 'Dining' };
  if (tags.amenity === 'ice_cream') return { type: 'Ice Cream Shop', category: 'Dining' };
  if (tags.amenity === 'food_court') return { type: 'Food Court', category: 'Dining' };
  
  // Healthcare
  if (tags.amenity === 'hospital') return { type: 'Hospital', category: 'Healthcare' };
  if (tags.amenity === 'clinic') return { type: 'Clinic', category: 'Healthcare' };
  if (tags.amenity === 'doctors') return { type: 'Doctor Office', category: 'Healthcare' };
  if (tags.amenity === 'dentist') return { type: 'Dentist', category: 'Healthcare' };
  if (tags.amenity === 'pharmacy') return { type: 'Pharmacy', category: 'Healthcare' };
  if (tags.amenity === 'veterinary') return { type: 'Veterinary Clinic', category: 'Healthcare' };
  
  // Education
  if (tags.amenity === 'school') return { type: 'School', category: 'Education' };
  if (tags.amenity === 'kindergarten') return { type: 'Kindergarten', category: 'Education' };
  if (tags.amenity === 'college') return { type: 'College', category: 'Education' };
  if (tags.amenity === 'university') return { type: 'University', category: 'Education' };
  if (tags.amenity === 'library') return { type: 'Library', category: 'Education' };
  
  // Recreation & Entertainment
  if (tags.leisure === 'park') return { type: 'Park', category: 'Recreation' };
  if (tags.leisure === 'playground') return { type: 'Playground', category: 'Recreation' };
  if (tags.leisure === 'sports_centre') return { type: 'Sports Center', category: 'Recreation' };
  if (tags.leisure === 'fitness_centre') return { type: 'Fitness Center', category: 'Recreation' };
  if (tags.leisure === 'swimming_pool') return { type: 'Swimming Pool', category: 'Recreation' };
  if (tags.amenity === 'cinema') return { type: 'Cinema', category: 'Entertainment' };
  if (tags.amenity === 'theatre') return { type: 'Theatre', category: 'Entertainment' };
  if (tags.amenity === 'gym') return { type: 'Gym', category: 'Recreation' };
  
  // Services
  if (tags.amenity === 'bank') return { type: 'Bank', category: 'Services' };
  if (tags.amenity === 'atm') return { type: 'ATM', category: 'Services' };
  if (tags.amenity === 'post_office') return { type: 'Post Office', category: 'Services' };
  if (tags.amenity === 'fuel') return { type: 'Gas Station', category: 'Services' };
  if (tags.amenity === 'parking') return { type: 'Parking', category: 'Services' };
  if (tags.amenity === 'car_wash') return { type: 'Car Wash', category: 'Services' };
  if (tags.amenity === 'police') return { type: 'Police Station', category: 'Services' };
  if (tags.amenity === 'fire_station') return { type: 'Fire Station', category: 'Services' };
  
  // Transportation
  if (tags.public_transport === 'station') return { type: 'Transit Station', category: 'Transportation' };
  if (tags.public_transport === 'stop_position') return { type: 'Transit Stop', category: 'Transportation' };
  if (tags.highway === 'bus_stop') return { type: 'Bus Stop', category: 'Transportation' };
  if (tags.amenity === 'taxi') return { type: 'Taxi Stand', category: 'Transportation' };
  
  return { type: 'Other', category: 'Other' };
}

// OSM services require an identifying User-Agent; anonymous requests get HTTP 406.
const OSM_USER_AGENT = 'ScoreCasa/1.0 (https://scorecasa.com)';
const OVERPASS_SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

// Geoapify Places requests. Tested 2026-11-23: mixing sub-categories in one request returns only a
// fraction of the places (and adding any sport.* sub-category returns sport places only), while
// top-level categories combine correctly. So: one broad request, one small one for sports.
// categorizeAmenity() keeps only the place types the walk score counts. Parking is left out on
// purpose: lots are everywhere and would push every score to 100.
const GEOAPIFY_CATEGORY_GROUPS: Array<{ categories: string; limit: number }> = [
  { categories: 'commercial,catering,healthcare,education,public_transport,leisure,entertainment,service', limit: 300 },
  { categories: 'sport.fitness,sport.sports_centre,sport.swimming_pool', limit: 50 },
];

async function fetchGeoapifyElements(lat: number, lon: number, radius: number): Promise<{ elements: any[] } | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    // ~1 credit per 20 places returned; the free plan has 3,000 credits a day.
    const groups = await Promise.all(GEOAPIFY_CATEGORY_GROUPS.map(async ({ categories, limit }) => {
      const params = new URLSearchParams({
        categories,
        filter: `circle:${lon},${lat},${radius}`,
        bias: `proximity:${lon},${lat}`,
        limit: String(limit),
        apiKey,
      });
      const res = await fetch(`https://api.geoapify.com/v2/places?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      return data.features || [];
    }));
    const seen = new Set<string>();
    const elements: any[] = [];
    for (const f of groups.flat()) {
      const p = f.properties || {};
      const raw = p.datasource?.raw || {};
      const id = String(raw.osm_id ?? p.place_id ?? `${p.lat},${p.lon}`);
      if (seen.has(id)) continue;
      seen.add(id);
      elements.push({ id, lat: p.lat, lon: p.lon, tags: { ...raw, name: raw.name ?? p.name } });
    }
    console.log(`[Walkability] Geoapify returned ${elements.length} places`);
    return { elements };
  } catch (err: any) {
    console.warn('[Walkability] Geoapify failed, falling back to Overpass:', err.message);
    return null;
  }
}

export async function calculateWalkability(address: string): Promise<WalkabilityData> {
  // Step 1: Geocode the address using Nominatim (OSM)
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  console.log('[Walkability] Geocoding address with Nominatim:', address);
  
  const geoResponse = await fetch(nominatimUrl, {
    signal: AbortSignal.timeout(10000),
    headers: {
      'User-Agent': OSM_USER_AGENT
    }
  });

  if (!geoResponse.ok) {
    console.error('[Walkability] Geocoding request failed with status:', geoResponse.status);
    throw new Error('Geocoding failed');
  }

  const geoData = await geoResponse.json();
  
  if (!geoData || geoData.length === 0) {
    console.error('[Walkability] No geocoding results found for address:', address);
    throw new Error('Address not found');
  }

  const lat = parseFloat(geoData[0].lat);
  const lon = parseFloat(geoData[0].lon);

  console.log('[Walkability] Address geocoded successfully to:', lat, lon);

  // Step 2: Query Overpass API for nearby amenities within 1.5km (nodes, ways and relations in one pass)
  const radius = 1500;
  const values = [
    'supermarket','convenience','mall','department_store','grocery','bakery','butcher','greengrocer','clothes','electronics','hardware','furniture','books','florist','jewelry',
    'restaurant','cafe','fast_food','bar','pub','ice_cream','food_court',
    'hospital','clinic','doctors','dentist','pharmacy','veterinary',
    'school','kindergarten','college','university','library',
    'park','playground','sports_centre','fitness_centre','swimming_pool','cinema','theatre','gym',
    'bank','atm','post_office','fuel','parking','car_wash','police','fire_station',
    'station','stop_position','bus_stop','taxi',
  ].join('|');
  const query = `[out:json][timeout:40];
nwr(around:${radius},${lat},${lon})[~"^(shop|amenity|leisure|public_transport|highway)$"~"^(${values})$"];
out center;`;

  console.log('Querying Overpass API for nearby amenities...');

  // Geoapify (managed OpenStreetMap data, free tier) is fast and reliable, so try it first.
  // Its features carry the original OSM tags, so they are converted to Overpass-style elements.
  let poiData: any = await fetchGeoapifyElements(lat, lon, radius);
  let lastError = '';
  // Public Overpass servers are often busy: fall back to the main one, then a mirror.
  for (const server of poiData ? [] : OVERPASS_SERVERS) {
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': OSM_USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      poiData = await res.json();
      break;
    } catch (err: any) {
      lastError = `${server}: ${err.message}`;
      console.warn('[Walkability] Overpass failed,', lastError);
    }
  }
  if (!poiData) {
    throw new Error(`Amenity query failed (${lastError})`);
  }

  
  // Filter to only elements with relevant tags (amenity/shop/leisure/public_transport/highway)
  // This removes geometry nodes that are part of ways but have no amenity data
  const relevantElements = (poiData.elements || []).filter((element: any) => {
    const tags = element.tags || {};
    return tags.amenity || tags.shop || tags.leisure || tags.public_transport || tags.highway;
  });

  console.log('Found amenities:', relevantElements.length);

  // Parse amenity details - handle both nodes and ways
  const amenitiesWithDuplicates: Amenity[] = relevantElements.map((element: any) => {
    const { type: amenityType, category } = categorizeAmenity(element.tags || {});
    
    // For ways (buildings), use center coordinates; for nodes, use lat/lon directly
    const elementLat = element.center ? element.center.lat : element.lat;
    const elementLon = element.center ? element.center.lon : element.lon;
    
    const distance = calculateDistance(lat, lon, elementLat, elementLon);
    
    // Get name from tags, or use a default based on type
    const name = element.tags?.name || `${amenityType} (unnamed)`;
    
    return {
      name,
      type: amenityType,
      category,
      distance: Math.round(distance * 1000) / 1000, // Round to 3 decimal places (km)
      osmId: element.id // Keep OSM ID for deduplication
    };
  });

  // Deduplicate by name+coordinates (some amenities are represented as both node and way)
  const amenityMap = new Map<string, Amenity>();
  amenitiesWithDuplicates.forEach(amenity => {
    // Create a unique key based on name and rounded coordinates
    const coordKey = `${Math.round(amenity.distance * 10000)}`;
    const key = `${amenity.name}_${amenity.type}_${coordKey}`;
    
    // Keep the first occurrence (they're from the same location anyway)
    if (!amenityMap.has(key)) {
      // Remove osmId from final output
      const { osmId, ...cleanAmenity } = amenity as any;
      amenityMap.set(key, cleanAmenity);
    }
  });

  // Only count the place types the walk score is built on (Geoapify's broad categories also
  // return things like hair salons and offices, which categorizeAmenity files as 'Other').
  const amenities: Amenity[] = Array.from(amenityMap.values()).filter(a => a.category !== 'Other');

  // Sort amenities by distance
  amenities.sort((a, b) => a.distance - b.distance);

  // Calculate walk score (0-100) based on amenity density
  const amenityCount = amenities.length;
  let walkScore = Math.min(100, Math.round(amenityCount * 1.5));
  
  // Adjust score based on density tiers
  if (amenityCount < 5) walkScore = Math.min(walkScore, 30);
  else if (amenityCount < 15) walkScore = Math.min(walkScore, 60);
  else if (amenityCount < 30) walkScore = Math.min(walkScore, 80);
  
  return {
    walkScore,
    transitScore: Math.round(walkScore * 0.85), // Approximation
    bikeScore: Math.round(walkScore * 0.90), // Approximation
    amenityCount,
    amenities,
    lat,
    lon
  };
}
