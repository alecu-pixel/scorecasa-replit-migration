/**
 * School Data Service - Urban Institute Education Data API
 * Documentation: https://educationdata.urban.org/documentation/
 * 
 * Free API providing comprehensive school-level data including:
 * - CCD Directory: Basic school information (location, type, grades)
 * - EDFacts Assessments: Math and reading proficiency rates
 * - MEPS: School poverty measures
 */

interface SchoolDirectoryData {
  school_id: string;
  school_name: string;
  street_location: string;
  city_location: string;
  state_location: string;
  zip_location: string;
  fips: number;
  latitude: number;
  longitude: number;
  charter: number; // 1 = charter, 0 = traditional
  magnet: number;
  lowest_grade_offered: number;
  highest_grade_offered: number;
  enrollment: number;
  free_or_reduced_price_lunch: number;
  free_lunch: number;
  reduced_price_lunch: number;
}

interface SchoolAssessmentData {
  school_id: string;
  school_name: string;
  fips: number;
  grade: number;
  read_test_num_valid: number;
  read_test_pct_prof_midpt: number; // Reading proficiency percentage
  math_test_num_valid: number;
  math_test_pct_prof_midpt: number; // Math proficiency percentage
}

interface SchoolPovertyData {
  school_id: string;
  school_name: string;
  fips: number;
  est_population_5_17_poverty_pct: number; // % students in poverty
}

export interface SchoolInfo {
  school_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_miles?: number;
  charter: boolean;
  magnet: boolean;
  grades: string;
  enrollment: number;
  free_reduced_lunch_pct: number;
  poverty_pct: number;
  reading_proficiency: number;
  math_proficiency: number;
  overall_score: number; // Calculated 1-10 score
}

export interface SchoolData {
  schools: SchoolInfo[];
  average_score: number;
  top_school_score: number;
  schools_within_5_miles: number;
}

const BASE_URL = 'https://educationdata.urban.org/api/v1';
const CURRENT_YEAR = 2021; // Latest year with comprehensive data
const MAX_SCHOOLS = 20; // Limit results

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate school quality score (1-10) based on multiple metrics
 */
function calculateSchoolScore(school: Partial<SchoolInfo>): number {
  let score = 5; // Base score

  // Reading proficiency (0-40% weight)
  if (school.reading_proficiency !== undefined && school.reading_proficiency > 0) {
    score += (school.reading_proficiency / 100) * 2;
  }

  // Math proficiency (0-40% weight)
  if (school.math_proficiency !== undefined && school.math_proficiency > 0) {
    score += (school.math_proficiency / 100) * 2;
  }

  // Poverty rate (inverse scoring - lower poverty = better, 0-20% weight)
  if (school.poverty_pct !== undefined && school.poverty_pct > 0) {
    score += (1 - school.poverty_pct / 100) * 1;
  }

  // Free/reduced lunch (inverse scoring, 0-10% weight)
  if (school.free_reduced_lunch_pct !== undefined && school.free_reduced_lunch_pct > 0) {
    score += (1 - school.free_reduced_lunch_pct / 100) * 0.5;
  }

  // Bonus for magnet schools
  if (school.magnet) {
    score += 0.3;
  }

  return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

/**
 * Fetch school data for a given FIPS code (state + county)
 * @param fips - 5-digit FIPS code (2-digit state + 3-digit county)
 * @param centerLat - Latitude of property for distance calculations
 * @param centerLon - Longitude of property for distance calculations
 */
export async function fetchSchoolData(
  fips: string, 
  centerLat: number | null, 
  centerLon: number | null
): Promise<SchoolData> {
  // Extract state FIPS (first 2 digits) - Urban Institute API uses state FIPS only
  const stateFips = fips.substring(0, 2);
  console.log(`Fetching school data for state FIPS: ${stateFips} (from county FIPS: ${fips})`);

  try {
    // Fetch school directory data (basic info)
    const directoryUrl = `${BASE_URL}/schools/ccd/directory/${CURRENT_YEAR}/?fips=${stateFips}`;
    const directoryResponse = await fetch(directoryUrl);
    
    if (!directoryResponse.ok) {
      throw new Error(`School directory API returned ${directoryResponse.status}`);
    }

    const directoryData = await directoryResponse.json();
    let schools: SchoolDirectoryData[] = directoryData.results || [];

    // Filter schools by proximity if we have center coordinates
    // (API returns state-level data, we need to filter to nearby schools)
    if (centerLat && centerLon) {
      schools = schools.filter(s => {
        if (!s.latitude || !s.longitude) return false;
        const distance = calculateDistance(centerLat, centerLon, s.latitude, s.longitude);
        return distance <= 25; // Keep schools within 25 miles
      });
    }

    console.log(`Found ${schools.length} schools within 25 miles (from state ${stateFips})`);

    if (schools.length === 0) {
      return {
        schools: [],
        average_score: 0,
        top_school_score: 0,
        schools_within_5_miles: 0
      };
    }

    // Get assessment data (test scores) and poverty data in parallel
    const [assessmentData, povertyData] = await Promise.all([
      fetchAssessmentData(fips),
      fetchPovertyData(fips)
    ]);

    // Combine data
    const schoolsWithData: SchoolInfo[] = schools
      .filter(s => s.latitude && s.longitude && s.enrollment > 0)
      .map(school => {
        // Find matching assessment data
        const assessment = assessmentData.find(a => a.school_id === school.school_id);
        const poverty = povertyData.find(p => p.school_id === school.school_id);

        const distance = centerLat && centerLon
          ? calculateDistance(centerLat, centerLon, school.latitude, school.longitude)
          : undefined;

        const freeLunchPct = school.enrollment > 0 
          ? ((school.free_or_reduced_price_lunch || 0) / school.enrollment) * 100 
          : 0;

        const schoolInfo: SchoolInfo = {
          school_id: school.school_id,
          name: school.school_name,
          address: `${school.street_location}, ${school.city_location}, ${school.state_location}`,
          latitude: school.latitude,
          longitude: school.longitude,
          distance_miles: distance,
          charter: school.charter === 1,
          magnet: school.magnet === 1,
          grades: `${school.lowest_grade_offered}-${school.highest_grade_offered}`,
          enrollment: school.enrollment,
          free_reduced_lunch_pct: Math.round(freeLunchPct),
          poverty_pct: Math.round(poverty?.est_population_5_17_poverty_pct || 0),
          reading_proficiency: Math.round(assessment?.read_test_pct_prof_midpt || 0),
          math_proficiency: Math.round(assessment?.math_test_pct_prof_midpt || 0),
          overall_score: 0 // Will calculate below
        };

        schoolInfo.overall_score = calculateSchoolScore(schoolInfo);
        return schoolInfo;
      })
      .filter(s => s.enrollment >= 50) // Filter out very small schools
      .sort((a, b) => {
        // Sort by distance if available, otherwise by score
        if (a.distance_miles !== undefined && b.distance_miles !== undefined) {
          return a.distance_miles - b.distance_miles;
        }
        return b.overall_score - a.overall_score;
      })
      .slice(0, MAX_SCHOOLS);

    const schoolsWithin5Miles = schoolsWithData.filter(s => 
      s.distance_miles !== undefined && s.distance_miles <= 5
    ).length;

    const scores = schoolsWithData.map(s => s.overall_score).filter(s => s > 0);
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const topSchoolScore = scores.length > 0 ? Math.max(...scores) : 0;

    console.log(`Processed ${schoolsWithData.length} schools, avg score: ${averageScore}`);

    return {
      schools: schoolsWithData,
      average_score: averageScore,
      top_school_score: topSchoolScore,
      schools_within_5_miles: schoolsWithin5Miles
    };
  } catch (error: any) {
    console.error('School data fetch error:', error.message);
    throw error;
  }
}

/**
 * Fetch assessment/test score data for schools in a FIPS code
 * Note: Returns all state data (no county-level filtering in API)
 */
async function fetchAssessmentData(fips: string): Promise<SchoolAssessmentData[]> {
  try {
    const stateFips = fips.substring(0, 2);
    const url = `${BASE_URL}/schools/edfacts/assessments/${CURRENT_YEAR}/grade-8/?fips=${stateFips}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`Assessment API returned ${response.status} for state FIPS ${stateFips}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('Assessment data fetch error:', error.message);
    return [];
  }
}

/**
 * Fetch poverty data for schools in a FIPS code
 * Note: Returns all state data (no county-level filtering in API)
 */
async function fetchPovertyData(fips: string): Promise<SchoolPovertyData[]> {
  try {
    const stateFips = fips.substring(0, 2);
    const url = `${BASE_URL}/schools/meps/school-poverty/${CURRENT_YEAR}/?fips=${stateFips}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`Poverty API returned ${response.status} for state FIPS ${stateFips}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('Poverty data fetch error:', error.message);
    return [];
  }
}
