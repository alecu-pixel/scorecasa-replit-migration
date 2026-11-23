import type { CensusData, GrowthData } from "@shared/schema";

export async function getCensusData(zipCode: string): Promise<CensusData> {
  // ACS 5-Year 2024 (2020-2024), the latest release (published Dec 2025)
  const year = 2024;
  const apiKey = process.env.CENSUS_API_KEY || '';
  
  const variables = [
    'NAME',
    'B19013_001E', // Median household income
    'B01003_001E', // Total population
    'B23025_003E', // In labor force
    'B23025_005E', // Unemployed
    'B15003_022E', // Bachelor's degree
    'B15003_023E', // Master's degree
    'B15003_024E', // Professional degree
    'B15003_025E', // Doctorate degree
    'B15003_001E', // Total education population
    'B25001_001E', // Total housing units
    
    // Crime Proxy Data (Priority 1)
    'B17001_002E', // Population below poverty line
    'B17001_001E', // Total population for poverty calculation
    'B25004_008E', // Vacant for "other reasons" (abandonment indicator)
    'B25002_003E', // Total vacant housing units
    
    // Rental & Investment Data (Priority 1)
    'B25064_001E', // Median gross rent
    'B25003_002E', // Owner-occupied housing units
    'B25003_003E', // Renter-occupied housing units
    
    // Housing Characteristics (Priority 2)
    'B25035_001E', // Median year structure built
    'B25077_001E', // Median home value
    'B25075_025E', // Home values $500k-$750k
    'B25075_026E', // Home values $750k-$1M
    'B25075_027E', // Home values $1M+
    
    // Economic Indicators (Priority 2)
    'B24080_001E', // Total civilian employed population 16 years+
    'B24080_002E', // Management, business, science, and arts occupations
    'B24080_003E', // Service occupations
    'B24080_004E'  // Sales and office occupations
  ].join(',');

  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zipCode}${apiKey ? `&key=${apiKey}` : ''}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Census API returned ${response.status}`);
  }

  // Handle 204 No Content - some ZIP codes don't have Census data
  if (response.status === 204) {
    throw new Error('No Census data available for this ZIP code (204)');
  }

  const data = await response.json();
  
  if (!data || data.length < 2) {
    throw new Error('No Census data available for this ZIP code');
  }

  // Parse response - first row is headers, second row is data
  const values = data[1];
  let idx = 1; // Start after NAME
  
  // Basic demographics
  const medianIncome = parseInt(values[idx++]) || 0;
  const population = parseInt(values[idx++]) || 0;
  const laborForce = parseInt(values[idx++]) || 0;
  const unemployed = parseInt(values[idx++]) || 0;
  const bachelor = parseInt(values[idx++]) || 0;
  const master = parseInt(values[idx++]) || 0;
  const professional = parseInt(values[idx++]) || 0;
  const doctorate = parseInt(values[idx++]) || 0;
  const eduTotal = parseInt(values[idx++]) || 1;
  const housingUnits = parseInt(values[idx++]) || 0;

  // Crime proxy data
  const povertyPopulation = parseInt(values[idx++]) || 0;
  const povertyTotal = parseInt(values[idx++]) || 1;
  const vacantOther = parseInt(values[idx++]) || 0;
  const totalVacant = parseInt(values[idx++]) || 0;
  
  // Rental & investment data
  const medianRent = parseInt(values[idx++]) || 0;
  const ownerOccupied = parseInt(values[idx++]) || 0;
  const renterOccupied = parseInt(values[idx++]) || 0;
  
  // Housing characteristics
  const medianYearBuilt = parseInt(values[idx++]) || 0;
  const medianHomeValue = parseInt(values[idx++]) || 0;
  const homes500to750k = parseInt(values[idx++]) || 0;
  const homes750kto1m = parseInt(values[idx++]) || 0;
  const homes1mPlus = parseInt(values[idx++]) || 0;
  
  // Economic indicators
  const totalEmployed = parseInt(values[idx++]) || 1;
  const managementOccupations = parseInt(values[idx++]) || 0;
  const serviceOccupations = parseInt(values[idx++]) || 0;
  const salesOccupations = parseInt(values[idx++]) || 0;

  // Calculate percentages and derived metrics
  const employmentRate = laborForce > 0 ? ((laborForce - unemployed) / laborForce) * 100 : 0;
  const collegeDegreePct = ((bachelor + master + professional + doctorate) / eduTotal) * 100;
  const povertyRate = (povertyPopulation / povertyTotal) * 100;
  const vacancyRate = housingUnits > 0 ? (totalVacant / housingUnits) * 100 : 0;
  const abandonmentRate = totalVacant > 0 ? (vacantOther / totalVacant) * 100 : 0;
  
  // Owner/renter percentages - return 0 if no occupancy data (null would break calculations)
  const totalOccupied = ownerOccupied + renterOccupied;
  const ownerOccupiedPct = totalOccupied > 0 
    ? (ownerOccupied / totalOccupied) * 100 
    : 0;
  
  const professionalEmploymentPct = (managementOccupations / totalEmployed) * 100;
  
  // Normalize high-value homes by total housing units (per 1,000 units for readability)
  const highValueHomeCount = homes500to750k + homes750kto1m + homes1mPlus;
  const highValueHomePer1000 = housingUnits > 0 
    ? (highValueHomeCount / housingUnits) * 1000 
    : 0;

  return {
    medianIncome,
    population,
    employmentRate: parseFloat(employmentRate.toFixed(1)),
    collegeDegreePct: parseFloat(collegeDegreePct.toFixed(1)),
    housingUnits,
    zipName: values[0],
    
    // Crime proxy metrics
    povertyRate: parseFloat(povertyRate.toFixed(1)),
    vacancyRate: parseFloat(vacancyRate.toFixed(1)),
    abandonmentRate: parseFloat(abandonmentRate.toFixed(1)),
    
    // Rental & investment metrics
    medianRent,
    ownerOccupiedPct: parseFloat(ownerOccupiedPct.toFixed(1)),
    renterOccupiedPct: parseFloat((100 - ownerOccupiedPct).toFixed(1)),
    
    // Housing characteristics
    medianYearBuilt,
    medianHomeValue,
    highValueHomeCount,
    highValueHomePer1000: parseFloat(highValueHomePer1000.toFixed(1)),
    
    // Economic indicators
    professionalEmploymentPct: parseFloat(professionalEmploymentPct.toFixed(1))
  };
}

export async function getCensusGrowthData(zipCode: string): Promise<GrowthData> {
  // Compare 2023 (2019-2023 data) vs 2024 (2020-2024 data) for 1-year growth
  // Note: Older years require state specification which we don't have from ZIP alone
  const year1 = 2023;
  const year2 = 2024;
  
  const variables = 'B19013_001E,B01003_001E,B25001_001E'; // Income, Population, Housing
  
  console.log(`Fetching growth data for ZIP ${zipCode}: ${year1} vs ${year2}`);
  
  const [response1, response2] = await Promise.all([
    fetch(`https://api.census.gov/data/${year1}/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zipCode}${process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ''}`),
    fetch(`https://api.census.gov/data/${year2}/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zipCode}${process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : ''}`)
  ]);

  console.log(`Response statuses: ${year1}=${response1.status}, ${year2}=${response2.status}`);

  // Handle 204 No Content responses
  if (response1.status === 204 || response2.status === 204) {
    console.log('Growth data not available (204 No Content)');
    throw new Error('No historical data available for this ZIP code (204)');
  }

  if (!response1.ok || !response2.ok) {
    const text1 = response1.ok ? '' : await response1.text();
    const text2 = response2.ok ? '' : await response2.text();
    console.error(`Growth data fetch failed: ${year1}=${text1}, ${year2}=${text2}`);
    throw new Error('Could not fetch historical data');
  }

  const data1 = await response1.json();
  const data2 = await response2.json();

  console.log(`Data1 length: ${data1?.length}, Data2 length: ${data2?.length}`);

  if (!data1 || data1.length < 2 || !data2 || data2.length < 2) {
    console.error('Insufficient historical data:', { data1, data2 });
    throw new Error('Insufficient historical data');
  }

  const income1 = parseInt(data1[1][0]) || 0;
  const income2 = parseInt(data2[1][0]) || 0;
  const pop1 = parseInt(data1[1][1]) || 0;
  const pop2 = parseInt(data2[1][1]) || 0;
  const housing1 = parseInt(data1[1][2]) || 0;
  const housing2 = parseInt(data2[1][2]) || 0;

  const incomeGrowth = income1 > 0 ? ((income2 - income1) / income1) * 100 : 0;
  const popGrowth = pop1 > 0 ? ((pop2 - pop1) / pop1) * 100 : 0;
  const housingGrowth = housing1 > 0 ? ((housing2 - housing1) / housing1) * 100 : 0;

  return {
    populationGrowth5yr: parseFloat(popGrowth.toFixed(1)),
    incomeGrowth5yr: parseFloat(incomeGrowth.toFixed(1)),
    housingGrowth5yr: parseFloat(housingGrowth.toFixed(1))
  };
}
