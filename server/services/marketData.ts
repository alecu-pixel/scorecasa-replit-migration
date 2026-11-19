import type { MarketData } from "@shared/schema";

export async function fetchMarketData(postalCode: string): Promise<MarketData> {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY not configured');
  }

  const url = `https://real-estate-market-data-by-zip-code.p.rapidapi.com/v1/Census/RealEstateData/${encodeURIComponent(postalCode)}`;
  
  console.log('Fetching market data for ZIP:', postalCode);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey.trim(),
      'x-rapidapi-host': 'real-estate-market-data-by-zip-code.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`Market Data API returned ${response.status}:`, errorText);
    
    // Provide more specific error messages for common issues
    if (response.status === 403) {
      console.log('Market Data API subscription not active - feature will be disabled');
      throw new Error(`Market Data API subscription not active (403). This feature requires a RapidAPI subscription to "Real Estate Market Data by Zip Code"`);
    }
    
    throw new Error(`Market Data API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Market Data API response keys:', Object.keys(data));

  // Parse the response based on the API structure
  // The exact field names may vary, using common patterns
  const medianHomeValue = data.medianHomeValue 
    || data.median_home_value 
    || data.medianValue 
    || data.home_value 
    || null;
  
  const medianRent = data.medianRent 
    || data.median_rent 
    || data.rent 
    || null;
  
  const homeownershipRate = data.homeownershipRate 
    || data.homeownership_rate 
    || data.ownerOccupiedRate 
    || null;
  
  const totalHousingUnits = data.totalHousingUnits 
    || data.total_housing_units 
    || data.housingUnits 
    || null;
  
  const occupiedUnits = data.occupiedHousingUnits
    || data.occupiedUnits 
    || data.occupied_units 
    || data.occupied 
    || null;
  
  const vacantUnits = data.vacantHousingUnits
    || data.vacantUnits 
    || data.vacant_units 
    || data.vacant 
    || null;

  // Calculate vacancy rate if we have the data
  let vacancyRate = data.vacancyRate || data.vacancy_rate || null;
  if (!vacancyRate && vacantUnits && totalHousingUnits && totalHousingUnits > 0) {
    vacancyRate = (vacantUnits / totalHousingUnits) * 100;
  }

  console.log(`Market data summary: Median value: $${medianHomeValue}, Homeownership: ${homeownershipRate}%, Vacancy: ${vacancyRate}%`);

  return {
    zipCode: postalCode,
    medianHomeValue,
    medianRent,
    homeownershipRate,
    totalHousingUnits,
    occupiedUnits,
    vacantUnits,
    vacancyRate
  };
}
