/**
 * SchoolDigger API Service (Pro Tier)
 * Documentation: https://developer.schooldigger.com/docs
 * 
 * Pro Tier Features:
 * - Search by latitude/longitude (geographic search)
 * - Star ratings (0-5, 5 is best)
 * - Statewide rankings and percentiles (4 years history)
 * - Test scores at State/District/School level
 * - Student/teacher ratios
 * - Enrollment data & demographics
 * - Graduation rates
 * - Chronic absenteeism rates
 * - School spending per pupil
 * - Title I, Magnet, Charter, Virtual flags
 */

const BASE_URL = 'https://api.schooldigger.com/v1.2';
const APP_ID = process.env.SCHOOLDIGGER_APP_ID;
const APP_KEY = process.env.SCHOOLDIGGER_APP_KEY;

// v1.2 API response interface
export interface SchoolDiggerSchool {
  schoolid: string;
  schoolName: string;
  phone: string;
  url: string;
  urlCompare: string;
  address: {
    latLong?: {
      latitude: number;
      longitude: number;
    };
    street: string;
    city: string;
    state: string;
    stateFull: string;
    zip: string;
  };
  distance?: number; // Only present with geographic search (Pro tier)
  lowGrade: string;
  highGrade: string;
  schoolLevel: string;
  isCharterSchool: string; // "Yes", "No", "(n/a)"
  isMagnetSchool: string;
  isVirtualSchool: string;
  isTitleISchool: string;
  isTitleISchoolwideSchool: string;
  isPrivate: boolean;
  district?: {
    districtID: string;
    districtName: string;
  };
  county?: {
    countyName: string;
  };
  rankHistory?: Array<{
    year: number;
    rank: number;
    rankOf: number;
    rankStars: number;
    rankLevel: string;
    rankStatewidePercentage: number;
    averageStandardScore: number;
  }>;
  rankMovement?: number;
  schoolYearlyDetails?: Array<{
    year: number;
    numberOfStudents: number;
    percentFreeDiscLunch: number | null;
    teachersFulltime: number | null;
    pupilTeacherRatio: number | null;
  }>;
  // Test scores (Pro tier) - for high schools
  testScores?: Array<{
    test: string;
    subject: string;
    year: number;
    grade: string;
    schoolTestScore?: {
      studentsTested: number;
      meanScaledScore: number;
      percentMetStandard: number;
    };
  }>;
}

export interface SchoolDiggerResponse {
  schoolList: SchoolDiggerSchool[];
  numberOfSchools: number;
  numberOfPages: number;
}

export interface SchoolDiggerData {
  schools: ProcessedSchoolDiggerSchool[];
  averageRating: number;
  topRating: number;
  averageRankPercentile: number;
  schoolsWithin5Miles: number;
  dataSource: 'schooldigger';
  // Pro tier aggregates
  averageGraduationRate: number | null;
  averageSpendingPerPupil: number | null;
  averageAbsenteeismRate: number | null;
}

export interface ProcessedSchoolDiggerSchool {
  schoolId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  schoolLevel: string;
  grades: string;
  isCharter: boolean;
  isMagnet: boolean;
  isTitleI: boolean;
  isVirtual: boolean;
  districtName: string;
  county: string;
  phone: string;
  url: string;
  starRating: number;
  stateRank: number;
  stateRankOf: number;
  statePercentile: number;
  enrollment: number;
  teacherCount: number;
  studentTeacherRatio: number;
  freeLunchPercent: number;
  // Pro tier fields
  graduationRate: number | null;
  chronicAbsenteeismRate: number | null;
  spendingPerPupil: number | null;
  overallScore: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateOverallScore(school: ProcessedSchoolDiggerSchool): number {
  let score = 5;
  let factors = 0;
  
  // Star rating is the primary factor (0-5 scale → 0-10)
  if (school.starRating > 0) {
    score = school.starRating * 2;
    factors++;
  }
  
  // State percentile as a significant factor
  if (school.statePercentile > 0) {
    const percentileScore = (school.statePercentile / 100) * 10;
    score = factors > 0 ? (score + percentileScore) / 2 : percentileScore;
    factors++;
  }
  
  // Graduation rate bonus (for high schools)
  if (school.graduationRate !== null && school.graduationRate > 0) {
    const gradBonus = (school.graduationRate / 100) * 0.5;
    score += gradBonus;
  }
  
  // Student-teacher ratio bonus (lower is better)
  if (school.studentTeacherRatio > 0 && school.studentTeacherRatio < 15) {
    score += 0.3;
  } else if (school.studentTeacherRatio > 25) {
    score -= 0.2;
  }
  
  // Chronic absenteeism penalty (higher is worse)
  if (school.chronicAbsenteeismRate !== null && school.chronicAbsenteeismRate > 20) {
    score -= 0.3;
  } else if (school.chronicAbsenteeismRate !== null && school.chronicAbsenteeismRate < 10) {
    score += 0.2;
  }
  
  // Magnet school bonus
  if (school.isMagnet) {
    score += 0.2;
  }
  
  return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

function processSchool(school: SchoolDiggerSchool, centerLat: number, centerLon: number): ProcessedSchoolDiggerSchool | null {
  // Skip schools without lat/long coordinates
  if (!school.address?.latLong?.latitude || !school.address?.latLong?.longitude) {
    return null;
  }
  
  const latestRank = school.rankHistory?.[0];
  const latestDetails = school.schoolYearlyDetails?.[0];
  
  // Use API-provided distance if available (Pro tier), otherwise calculate
  const distance = school.distance ?? calculateDistance(
    centerLat, 
    centerLon, 
    school.address.latLong.latitude, 
    school.address.latLong.longitude
  );

  // Convert string flags to booleans (API returns "Yes"/"No"/"(n/a)")
  const isCharter = school.isCharterSchool === 'Yes';
  const isMagnet = school.isMagnetSchool === 'Yes';
  const isTitleI = school.isTitleISchool === 'Yes';
  const isVirtual = school.isVirtualSchool === 'Yes';

  const processed: ProcessedSchoolDiggerSchool = {
    schoolId: school.schoolid,
    name: school.schoolName,
    address: `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.zip}`,
    latitude: school.address.latLong.latitude,
    longitude: school.address.latLong.longitude,
    distanceMiles: Math.round(distance * 10) / 10,
    schoolLevel: school.schoolLevel || 'Unknown',
    grades: `${school.lowGrade || 'K'}-${school.highGrade || '12'}`,
    isCharter,
    isMagnet,
    isTitleI,
    isVirtual,
    districtName: school.district?.districtName || (school.isPrivate ? 'Private' : 'Unknown'),
    county: school.county?.countyName?.replace(' County', '') || 'Unknown',
    phone: school.phone || '',
    url: school.url || '',
    starRating: latestRank?.rankStars || 0,
    stateRank: latestRank?.rank || 0,
    stateRankOf: latestRank?.rankOf || 0,
    statePercentile: Math.round(latestRank?.rankStatewidePercentage || 0),
    enrollment: latestDetails?.numberOfStudents || 0,
    teacherCount: Math.round(latestDetails?.teachersFulltime || 0),
    studentTeacherRatio: Math.round((latestDetails?.pupilTeacherRatio || 0) * 10) / 10,
    freeLunchPercent: Math.round(latestDetails?.percentFreeDiscLunch || 0),
    // These Pro tier fields aren't in the v1.2 list endpoint, set to null
    graduationRate: null,
    chronicAbsenteeismRate: null,
    spendingPerPupil: null,
    overallScore: 0
  };
  
  processed.overallScore = calculateOverallScore(processed);
  
  return processed;
}

export async function fetchSchoolDiggerData(
  latitude: number,
  longitude: number,
  state: string,
  radiusMiles: number = 10
): Promise<SchoolDiggerData | null> {
  if (!APP_ID || !APP_KEY) {
    console.log('SchoolDigger API credentials not configured');
    return null;
  }

  console.log(`Fetching SchoolDigger Pro data for ${state} near (${latitude}, ${longitude})`);

  try {
    const params = new URLSearchParams({
      st: state.toUpperCase(),
      nearLatitude: latitude.toString(),
      nearLongitude: longitude.toString(),
      distanceMiles: radiusMiles.toString(),
      perPage: '50', // Pro tier allows more results
      sortBy: 'distance',
      appID: APP_ID,
      appKey: APP_KEY
    });

    const url = `${BASE_URL}/schools?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SchoolDigger API error ${response.status}: ${errorText}`);
      return null;
    }

    const data: SchoolDiggerResponse = await response.json();
    
    if (!data.schoolList || data.schoolList.length === 0) {
      console.log('No schools found in SchoolDigger response');
      return null;
    }

    console.log(`SchoolDigger returned ${data.schoolList.length} schools`);

    const processedSchools = data.schoolList
      .map(school => processSchool(school, latitude, longitude))
      .filter((s): s is ProcessedSchoolDiggerSchool => s !== null && s.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, 30); // Keep up to 30 schools for comprehensive view

    // Calculate averages for star ratings
    const schoolsWithRatings = processedSchools.filter(s => s.starRating > 0);
    const averageRating = schoolsWithRatings.length > 0
      ? Math.round((schoolsWithRatings.reduce((sum, s) => sum + s.starRating, 0) / schoolsWithRatings.length) * 10) / 10
      : 0;

    const topRating = schoolsWithRatings.length > 0
      ? Math.max(...schoolsWithRatings.map(s => s.starRating))
      : 0;

    // Calculate averages for percentile
    const schoolsWithPercentile = processedSchools.filter(s => s.statePercentile > 0);
    const averagePercentile = schoolsWithPercentile.length > 0
      ? Math.round(schoolsWithPercentile.reduce((sum, s) => sum + s.statePercentile, 0) / schoolsWithPercentile.length)
      : 0;

    // Pro tier: Calculate graduation rate average
    const schoolsWithGradRate = processedSchools.filter(s => s.graduationRate !== null && s.graduationRate > 0);
    const averageGraduationRate = schoolsWithGradRate.length > 0
      ? Math.round((schoolsWithGradRate.reduce((sum, s) => sum + (s.graduationRate || 0), 0) / schoolsWithGradRate.length) * 10) / 10
      : null;

    // Pro tier: Calculate spending per pupil average
    const schoolsWithSpending = processedSchools.filter(s => s.spendingPerPupil !== null && s.spendingPerPupil > 0);
    const averageSpendingPerPupil = schoolsWithSpending.length > 0
      ? Math.round(schoolsWithSpending.reduce((sum, s) => sum + (s.spendingPerPupil || 0), 0) / schoolsWithSpending.length)
      : null;

    // Pro tier: Calculate absenteeism rate average
    const schoolsWithAbsenteeism = processedSchools.filter(s => s.chronicAbsenteeismRate !== null);
    const averageAbsenteeismRate = schoolsWithAbsenteeism.length > 0
      ? Math.round((schoolsWithAbsenteeism.reduce((sum, s) => sum + (s.chronicAbsenteeismRate || 0), 0) / schoolsWithAbsenteeism.length) * 10) / 10
      : null;

    const schoolsWithin5Miles = processedSchools.filter(s => s.distanceMiles <= 5).length;

    console.log(`Processed ${processedSchools.length} schools:`);
    console.log(`  - Avg rating: ${averageRating}/5, Avg percentile: ${averagePercentile}%`);
    console.log(`  - Avg graduation rate: ${averageGraduationRate || 'N/A'}%`);
    console.log(`  - Avg spending/pupil: $${averageSpendingPerPupil || 'N/A'}`);
    console.log(`  - Avg absenteeism: ${averageAbsenteeismRate || 'N/A'}%`);

    return {
      schools: processedSchools,
      averageRating,
      topRating,
      averageRankPercentile: averagePercentile,
      schoolsWithin5Miles,
      dataSource: 'schooldigger',
      averageGraduationRate,
      averageSpendingPerPupil,
      averageAbsenteeismRate
    };
  } catch (error: any) {
    console.error('SchoolDigger fetch error:', error.message);
    return null;
  }
}

export function getStateFromAddress(address: string): string | null {
  const stateAbbreviations = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];
  
  const addressUpper = address.toUpperCase();
  for (const state of stateAbbreviations) {
    const pattern = new RegExp(`\\b${state}\\b`);
    if (pattern.test(addressUpper)) {
      return state;
    }
  }
  
  return null;
}
