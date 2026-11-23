/**
 * Census Data Exploration Service
 * 
 * Queries various Census Bureau datasets to identify additional data
 * that could enhance property investment analysis.
 */

interface CensusDataset {
  category: string;
  variables: string[];
  description: string;
}

interface ExplorationResult {
  category: string;
  description: string;
  available: boolean;
  sampleData?: Record<string, any>;
  error?: string;
  variables?: Array<{
    code: string;
    label: string;
    value: any;
  }>;
}

// Define datasets to explore
const DATASETS_TO_EXPLORE: CensusDataset[] = [
  {
    category: 'Crime Proxy',
    description: 'Poverty and vacancy rates as crime indicators',
    variables: [
      'B17001_002E', // Income below poverty level
      'B17001_001E', // Total for poverty status
      'B25004_008E', // Vacant housing for other reasons
      'B25002_003E'  // Vacant housing units
    ]
  },
  {
    category: 'Commute Patterns',
    description: 'Transportation and commute time data',
    variables: [
      'B08303_001E', // Total commute time
      'B08303_008E', // 30-34 minutes
      'B08303_009E', // 35-39 minutes
      'B08303_010E', // 40-44 minutes
      'B08303_011E', // 45-59 minutes
      'B08303_012E', // 60-89 minutes
      'B08303_013E', // 90+ minutes
      'B08301_010E', // Public transportation
      'B08301_001E'  // Total means of transportation
    ]
  },
  {
    category: 'Housing Characteristics',
    description: 'Property age, value distribution, and type',
    variables: [
      'B25035_001E', // Median year structure built
      'B25077_001E', // Median home value
      'B25075_001E', // Total for value ranges (base)
      'B25075_025E', // $500k-$750k
      'B25075_026E', // $750k-$1M
      'B25075_027E', // $1M+
      'B25024_002E', // Single-family detached
      'B25024_003E'  // Single-family attached
    ]
  },
  {
    category: 'Economic Indicators',
    description: 'Business ownership and economic diversity',
    variables: [
      'B24080_001E', // Total occupation
      'B24080_002E', // Management occupations
      'B24080_003E', // Business and financial operations
      'B24080_004E', // Computer and mathematical
      'B19001_001E', // Total household income
      'B19001_014E', // $100k-$125k
      'B19001_015E', // $125k-$150k
      'B19001_016E', // $150k-$200k
      'B19001_017E'  // $200k+
    ]
  },
  {
    category: 'Rent & Property Investment',
    description: 'Rental market and property investment metrics',
    variables: [
      'B25064_001E', // Median gross rent
      'B25003_002E', // Owner-occupied
      'B25003_003E', // Renter-occupied
      'B25056_001E', // Contract rent asked
      'B25091_002E', // Owners with mortgage
      'B25091_013E'  // Renters
    ]
  },
  {
    category: 'Demographics Detail',
    description: 'Age distribution and household composition',
    variables: [
      'B01001_001E', // Total population
      'B01001_003E', // Male under 5
      'B01001_020E', // Male 25-29
      'B01001_021E', // Male 30-34
      'B01001_044E', // Female 25-29
      'B01001_045E', // Female 30-34
      'B11001_001E', // Total households
      'B11001_002E', // Family households
      'B11001_007E'  // Non-family households
    ]
  }
];

export async function exploreCensusData(zipCode: string): Promise<ExplorationResult[]> {
  const apiKey = process.env.CENSUS_API_KEY;
  const year = 2024; // Latest ACS 5-year data
  
  const results: ExplorationResult[] = [];
  
  for (const dataset of DATASETS_TO_EXPLORE) {
    try {
      const variables = ['NAME', ...dataset.variables].join(',');
      const url = `https://api.census.gov/data/${year}/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zipCode}${apiKey ? `&key=${apiKey}` : ''}`;
      
      console.log(`Fetching ${dataset.category}...`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`${dataset.category} failed: ${response.status}`);
        results.push({
          category: dataset.category,
          description: dataset.description,
          available: false,
          error: `API returned ${response.status}`
        });
        continue;
      }
      
      if (response.status === 204) {
        results.push({
          category: dataset.category,
          description: dataset.description,
          available: false,
          error: 'No data available (204)'
        });
        continue;
      }
      
      const data = await response.json();
      
      if (!data || data.length < 2) {
        results.push({
          category: dataset.category,
          description: dataset.description,
          available: false,
          error: 'Empty response'
        });
        continue;
      }
      
      // Parse the response - first row is headers, second row is values
      const headers = data[0];
      const values = data[1];
      
      const sampleData: Record<string, any> = {};
      const variableDetails: Array<{ code: string; label: string; value: any }> = [];
      
      for (let i = 1; i < headers.length - 1; i++) { // Skip NAME and ZCTA columns
        const code = headers[i];
        const value = values[i];
        sampleData[code] = value;
        variableDetails.push({
          code,
          label: code, // In a real implementation, you'd map to human-readable labels
          value: value !== null && value !== '-666666666' ? parseInt(value) : null
        });
      }
      
      results.push({
        category: dataset.category,
        description: dataset.description,
        available: true,
        sampleData,
        variables: variableDetails
      });
      
      console.log(`${dataset.category}: SUCCESS (${variableDetails.length} variables)`);
      
    } catch (error: any) {
      console.error(`Error fetching ${dataset.category}:`, error.message);
      results.push({
        category: dataset.category,
        description: dataset.description,
        available: false,
        error: error.message
      });
    }
  }
  
  return results;
}
