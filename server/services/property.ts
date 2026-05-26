import type { PropertyListingsData, PropertyListing } from "@shared/schema";

export async function fetchPropertyListings(postalCode: string): Promise<PropertyListingsData> {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY not configured');
  }

  const url = 'https://us-housing-market-data1.p.rapidapi.com/propertyExtendedSearch';
  
  const queryParams = new URLSearchParams({
    location: postalCode,
    status_type: 'ForSale',
    count: '20',
    page: '1'
  });

  console.log('Fetching property listings for ZIP:', postalCode);

  const response = await fetch(`${url}?${queryParams}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey.trim(),
      'x-rapidapi-host': 'us-housing-market-data1.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Housing Market API error:', response.status, errorText);
    throw new Error(`Housing Market API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Housing Market API response keys:', Object.keys(data));

  if (!Array.isArray(data.props)) {
    if (data.message || data.error) {
      throw new Error(`Housing Market API error: ${data.message || data.error}`);
    }
    throw new Error('Housing Market API returned invalid response format');
  }

  const properties = data.props;
  
  console.log(`Found ${properties.length} properties for ZIP ${postalCode}`);

  const listings: PropertyListing[] = properties.map((prop: any) => {
    const addressObj = prop.address || {};
    
    const address = prop.address?.streetAddress 
      || addressObj.streetAddress
      || prop.streetAddress 
      || prop.address 
      || 'Address unavailable';
    
    const city = addressObj.city || prop.city || '';
    const state = addressObj.state || prop.state || '';
    const zipcode = addressObj.zipcode || prop.zipcode || postalCode;
    
    const photoUrl = prop.media?.imageUrls?.firstPhoto?.url
      || prop.imgSrc 
      || prop.image 
      || null;
    
    const lat = prop.latLong?.latitude || prop.latitude || null;
    const lon = prop.latLong?.longitude || prop.longitude || null;
    
    const daysOnZillow = prop.daysOnZillow !== undefined && prop.daysOnZillow !== -1 
      ? prop.daysOnZillow 
      : null;
    
    return {
      property_id: prop.zpid || prop.id || '',
      listing_id: prop.zpid || prop.id || '',
      address,
      city,
      state_code: state,
      postal_code: zipcode,
      price: prop.price || 0,
      beds: prop.bedrooms || prop.beds || null,
      baths: prop.bathrooms || prop.baths || null,
      sqft: prop.livingArea || prop.area || null,
      prop_type: prop.homeType || prop.propertyType || 'unknown',
      photo_url: photoUrl,
      lat,
      lon,
      daysOnZillow
    };
  });

  const prices = listings.map(l => l.price).filter(p => p > 0);
  const median_price = prices.length > 0 
    ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    : null;
  const avg_price = prices.length > 0
    ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
    : null;

  const daysOnMarket = listings
    .map(l => l.daysOnZillow)
    .filter((d): d is number => d !== null && d > 0);
  const avg_days_on_market = daysOnMarket.length > 0
    ? Math.round(daysOnMarket.reduce((sum, d) => sum + d, 0) / daysOnMarket.length)
    : null;

  console.log(`Average days on market: ${avg_days_on_market} (from ${daysOnMarket.length} listings with data)`);

  return {
    listings,
    total_count: properties.length,
    median_price,
    avg_price,
    avg_days_on_market
  };
}
