/**
 * Census Tract Lookup Utility
 *
 * Uses the Census Bureau's Geocoder API to convert lat/lon coordinates
 * into an 11-digit census tract FIPS GEOID. This GEOID is used by:
 *   - OpenFEMA NFIP Claims API (flood claim history by tract)
 *   - Opportunity Zone lookup (IRS QOZ census tract list)
 */

const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates';

export async function lookupCensusTract(lat: number, lon: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      x: lon.toString(),
      y: lat.toString(),
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      layers: 'Census Tracts',
      format: 'json',
    });

    console.log(`[CensusTract] Looking up tract for ${lat},${lon}`);

    const response = await fetch(`${CENSUS_GEOCODER_URL}?${params}`, {
      headers: { 'User-Agent': 'ScoreCasa/1.0 (contact@scorecasa.com)' },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`[CensusTract] Geocoder returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const tracts = data?.result?.geographies?.['Census Tracts'];
    if (!tracts || tracts.length === 0) {
      console.warn('[CensusTract] No census tract found for coordinates');
      return null;
    }

    const geoid = tracts[0].GEOID as string;
    console.log(`[CensusTract] Found tract GEOID: ${geoid}`);
    return geoid;
  } catch (error: any) {
    console.error('[CensusTract] Lookup failed:', error.message);
    return null;
  }
}
