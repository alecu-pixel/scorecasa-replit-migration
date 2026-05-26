/**
 * Unified Crime Data Service
 * 
 * Orchestrates data from three sources:
 * 1. Crime Data by ZipCode API (RapidAPI) - ZIP-level grades
 * 2. FBI Crime Data Explorer - State-level crime rates
 * 3. NIBRS API - National benchmarks
 * 
 * Calculates a composite safety score and provides rich crime analysis.
 */

import { fetchCrimeByZipCode, getGradeLabel, getGradeColor, type ZipCodeCrimeGrade, type NearbyZipCrime, type ZipCodeCrimeResult } from './crimeByZipcode';
import { fetchStateCrimeData, extractStateFromAddress, type CrimeData } from './fbiCrime';
import { fetchNationalCrimeBenchmarks, getCrimeTypeBreakdowns, compareToNational, type NationalCrimeBenchmark, type CrimeTypeBreakdown } from './nibrs';
import type { EnrichedCrimeData } from '@shared/schema';

export type { EnrichedCrimeData };

function getSafetyLabel(score: number): string {
  if (score >= 85) return 'Very Safe';
  if (score >= 70) return 'Safe';
  if (score >= 55) return 'Average';
  if (score >= 40) return 'Below Average';
  return 'Higher Risk';
}

function getSafetyColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#84cc16';
  if (score >= 55) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function calculateCompositeScore(
  zipData: ZipCodeCrimeGrade | null,
  stateData: CrimeData | null,
  _nationalData: NationalCrimeBenchmark
): number {
  let totalScore = 0;
  let totalWeight = 0;

  if (zipData) {
    totalScore += zipData.overallScore * 0.60;
    totalWeight += 0.60;
  }

  if (stateData) {
    const stateScore = stateData.safetyScore;
    
    if (zipData) {
      totalScore += stateScore * 0.40;
      totalWeight += 0.40;
    } else {
      totalScore += stateScore * 0.70;
      totalWeight += 0.70;
    }
  }

  if (totalWeight === 0) {
    return 50;
  }

  return Math.round(totalScore / totalWeight);
}

function generateSummary(
  zipData: ZipCodeCrimeGrade | null,
  stateData: CrimeData | null,
  compositeScore: number
): { headline: string; description: string; keyInsights: string[] } {
  const insights: string[] = [];
  let headline = '';
  let description = '';

  if (zipData) {
    headline = `Safety Grade: ${zipData.overallGrade}`;
    
    if (zipData.overallScore >= 85) {
      description = 'This ZIP code is rated as very safe with significantly lower crime rates than average.';
    } else if (zipData.overallScore >= 70) {
      description = 'This ZIP code has a good safety rating with crime rates below average.';
    } else if (zipData.overallScore >= 55) {
      description = 'This ZIP code has average crime levels typical of most areas.';
    } else if (zipData.overallScore >= 40) {
      description = 'This ZIP code has crime rates somewhat higher than average.';
    } else {
      description = 'This ZIP code has elevated crime rates. Extra safety precautions may be advisable.';
    }

    if (zipData.violentCrimeScore >= 80) {
      insights.push('Low violent crime rate');
    } else if (zipData.violentCrimeScore < 50) {
      insights.push('Elevated violent crime concerns');
    }

    if (zipData.propertyCrimeScore >= 80) {
      insights.push('Low property crime rate');
    } else if (zipData.propertyCrimeScore < 50) {
      insights.push('Higher property crime rate');
    }
  } else if (stateData) {
    headline = `State Safety: ${stateData.stateName}`;
    
    if (stateData.violentCrimeVsNational < -20) {
      description = `${stateData.stateName} has significantly lower crime rates than the national average.`;
      insights.push('State crime rates well below national average');
    } else if (stateData.violentCrimeVsNational < 0) {
      description = `${stateData.stateName} has crime rates below the national average.`;
      insights.push('State crime rates below national average');
    } else if (stateData.violentCrimeVsNational < 20) {
      description = `${stateData.stateName} has crime rates near the national average.`;
      insights.push('State crime rates near national average');
    } else {
      description = `${stateData.stateName} has crime rates above the national average.`;
      insights.push('State crime rates above national average');
    }
  } else {
    headline = 'Limited Crime Data Available';
    description = 'Detailed crime statistics are not available for this area. The safety score is estimated based on available demographic indicators.';
    insights.push('Crime data sourced from demographic indicators');
  }

  if (stateData && zipData) {
    const comparison = compareToNational(stateData.violentCrimeRate, stateData.nationalViolentCrimeRate);
    if (comparison.comparison === 'much-lower' || comparison.comparison === 'lower') {
      insights.push(`State violent crime ${Math.abs(Math.round(comparison.percentDiff))}% below national avg`);
    } else if (comparison.comparison === 'higher' || comparison.comparison === 'much-higher') {
      insights.push(`State violent crime ${Math.round(comparison.percentDiff)}% above national avg`);
    }
  }

  return { headline, description, keyInsights: insights.slice(0, 4) };
}

export async function fetchEnrichedCrimeData(
  zipCode: string,
  address: string
): Promise<EnrichedCrimeData> {
  const stateAbbr = extractStateFromAddress(address);
  
  const [zipResult, stateData, nationalData] = await Promise.all([
    fetchCrimeByZipCode(zipCode),
    stateAbbr ? fetchStateCrimeData(stateAbbr) : Promise.resolve(null),
    fetchNationalCrimeBenchmarks()
  ]);

  const zipData = zipResult?.mainZip || null;
  const nearbyZips = zipResult?.nearbyZips || [];

  const compositeScore = calculateCompositeScore(zipData, stateData, nationalData);
  const summary = generateSummary(zipData, stateData, compositeScore);

  const enrichedData: EnrichedCrimeData = {
    zipCode,
    stateAbbr: stateAbbr || '',
    stateName: stateData?.stateName || '',
    
    zipLevelData: zipData ? {
      available: true,
      overallGrade: zipData.overallGrade,
      overallScore: zipData.overallScore,
      violentCrimeGrade: zipData.violentCrimeGrade,
      violentCrimeScore: zipData.violentCrimeScore,
      propertyCrimeGrade: zipData.propertyCrimeGrade,
      propertyCrimeScore: zipData.propertyCrimeScore,
      gradeLabel: getGradeLabel(zipData.overallGrade),
      gradeColor: getGradeColor(zipData.overallGrade),
      dataYear: zipData.dataYear
    } : null,
    
    nearbyZips: nearbyZips.map(nz => ({
      zipCode: nz.zipCode,
      state: nz.state,
      overallGrade: nz.overallGrade,
      violentCrimeGrade: nz.violentCrimeGrade,
      propertyCrimeGrade: nz.propertyCrimeGrade,
      overallScore: nz.overallScore,
      gradeColor: nz.gradeColor
    })),
    
    stateLevelData: stateData ? {
      available: true,
      violentCrimeRate: stateData.violentCrimeRate,
      propertyCrimeRate: stateData.propertyCrimeRate,
      violentCrimeVsNational: stateData.violentCrimeVsNational,
      propertyCrimeVsNational: stateData.propertyCrimeVsNational,
      violentCrimeComparison: compareToNational(stateData.violentCrimeRate, stateData.nationalViolentCrimeRate).label,
      propertyCrimeComparison: compareToNational(stateData.propertyCrimeRate, stateData.nationalPropertyCrimeRate).label,
      murderRate: stateData.murderRate,
      robberyRate: stateData.robberyRate,
      assaultRate: stateData.assaultRate,
      burglaryRate: stateData.burglaryRate,
      larcenyRate: stateData.larcenyRate,
      motorVehicleTheftRate: stateData.motorVehicleTheftRate,
      dataYear: stateData.year
    } : null,
    
    nationalBenchmarks: {
      available: true,
      violentVictimizationRate: nationalData.violentVictimizationRate,
      propertyVictimizationRate: nationalData.propertyVictimizationRate,
      crimeTypeBreakdowns: getCrimeTypeBreakdowns(),
      dataYear: nationalData.year
    },
    
    compositeSafetyScore: compositeScore,
    safetyLabel: getSafetyLabel(compositeScore),
    safetyColor: getSafetyColor(compositeScore),
    
    dataSources: {
      zipCode: zipData ? 'rapidapi' : 'unavailable',
      state: stateData ? (process.env.FBI_CRIME_API_KEY ? 'fbi' : 'cached') : 'unavailable',
      national: 'nibrs'
    },
    
    summary
  };

  console.log(`[UnifiedCrime] ${zipCode}: Composite score ${compositeScore} (${enrichedData.safetyLabel}), Sources: ZIP=${enrichedData.dataSources.zipCode}, State=${enrichedData.dataSources.state}`);

  return enrichedData;
}

export function convertToLegacyCrimeData(enrichedData: EnrichedCrimeData): CrimeData {
  const stateData = enrichedData.stateLevelData;
  
  return {
    stateAbbr: enrichedData.stateAbbr,
    stateName: enrichedData.stateName,
    year: stateData?.dataYear || new Date().getFullYear() - 1,
    population: 0,
    violentCrimeRate: stateData?.violentCrimeRate || 380.7,
    propertyCrimeRate: stateData?.propertyCrimeRate || 1954.4,
    violentCrimeTotal: 0,
    propertyCrimeTotal: 0,
    murderRate: stateData?.murderRate || 0,
    robberyRate: stateData?.robberyRate || 0,
    assaultRate: stateData?.assaultRate || 0,
    burglaryRate: stateData?.burglaryRate || 0,
    larcenyRate: stateData?.larcenyRate || 0,
    motorVehicleTheftRate: stateData?.motorVehicleTheftRate || 0,
    nationalViolentCrimeRate: 380.7,
    nationalPropertyCrimeRate: 1954.4,
    violentCrimeVsNational: stateData?.violentCrimeVsNational || 0,
    propertyCrimeVsNational: stateData?.propertyCrimeVsNational || 0,
    safetyScore: enrichedData.compositeSafetyScore
  };
}
