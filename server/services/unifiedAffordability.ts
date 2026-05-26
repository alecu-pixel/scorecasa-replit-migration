import { fetchMortgageTrends, type MortgageTrendData } from './fredMortgage';
import { 
  calculateOvervaluation, 
  calculateBuyVsRent, 
  calculatePropertyTax, 
  calculateAffordabilityScore,
  calculateMarketTimingSignal,
  type OvervaluationData,
  type BuyVsRentData,
  type PropertyTaxData,
  type AffordabilityScore
} from './affordability';
import { fetchFairMarketRent, analyzeFMRComparison, type FairMarketRent, type FMRComparison } from './hudFairMarketRent';
import { fetchBuildingPermits, type BuildingPermitsData } from './censusBuildingPermits';
import { fetchEmploymentData, type EmploymentData } from './blsEmployment';

export interface ComprehensiveAffordabilityData {
  mortgageTrends: MortgageTrendData;
  overvaluation: OvervaluationData;
  buyVsRent: BuyVsRentData;
  propertyTax: PropertyTaxData;
  affordabilityScore: AffordabilityScore;
  fairMarketRent: FMRComparison;
  buildingPermits: BuildingPermitsData;
  employment: EmploymentData;
  marketTimingSignal: {
    signal: 'buy' | 'wait' | 'caution';
    confidence: number;
    factors: string[];
  };
  investmentGrade: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
    summary: string;
  };
  dataCompleteness: {
    tier1Complete: boolean;
    tier2Complete: boolean;
    dataSources: string[];
  };
}

function calculateInvestmentGrade(
  affordabilityScore: AffordabilityScore,
  overvaluation: OvervaluationData,
  employment: EmploymentData,
  buyVsRent: BuyVsRentData
): ComprehensiveAffordabilityData['investmentGrade'] {
  let totalScore = 0;
  
  totalScore += affordabilityScore.score * 2.5;
  
  if (overvaluation.overvaluationPercent < -10) {
    totalScore += 20;
  } else if (overvaluation.overvaluationPercent < 10) {
    totalScore += 15;
  } else if (overvaluation.overvaluationPercent < 25) {
    totalScore += 10;
  } else if (overvaluation.overvaluationPercent < 40) {
    totalScore += 5;
  }
  
  totalScore += employment.jobMarketScore * 2;
  
  if (buyVsRent.recommendation === 'buy') {
    totalScore += buyVsRent.recommendationStrength === 'strong' ? 15 : 
                  buyVsRent.recommendationStrength === 'moderate' ? 10 : 5;
  } else if (buyVsRent.recommendation === 'neutral') {
    totalScore += 5;
  }

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let summary: string;

  if (totalScore >= 75) {
    grade = 'A';
    summary = 'Excellent investment opportunity with strong fundamentals across affordability, valuation, and job market.';
  } else if (totalScore >= 60) {
    grade = 'B';
    summary = 'Good investment potential with solid fundamentals. Some areas may warrant additional due diligence.';
  } else if (totalScore >= 45) {
    grade = 'C';
    summary = 'Average market conditions. Careful analysis recommended before committing to purchase.';
  } else if (totalScore >= 30) {
    grade = 'D';
    summary = 'Below average conditions. Consider waiting for better timing or exploring other markets.';
  } else {
    grade = 'F';
    summary = 'Challenging market conditions with significant concerns across multiple metrics. High risk investment.';
  }

  return { grade, score: Math.round(totalScore), summary };
}

export async function fetchComprehensiveAffordabilityData(
  zipCode: string,
  stateCode: string,
  medianHomeValue: number,
  medianIncome: number,
  medianRent: number,
  populationGrowth: number = 0
): Promise<ComprehensiveAffordabilityData> {
  console.log(`[UnifiedAffordability] Fetching comprehensive data for ZIP ${zipCode}, State ${stateCode}`);
  
  const [mortgageTrends, fairMarketRentData, buildingPermits, employment] = await Promise.all([
    fetchMortgageTrends(),
    fetchFairMarketRent(zipCode, medianRent, stateCode),
    fetchBuildingPermits(stateCode),
    fetchEmploymentData(stateCode)
  ]);

  const currentMortgageRate = mortgageTrends.currentRate;

  const overvaluation = calculateOvervaluation(medianHomeValue, medianIncome);
  const buyVsRent = calculateBuyVsRent(medianHomeValue, medianRent, currentMortgageRate);
  const propertyTax = calculatePropertyTax(medianHomeValue, stateCode);
  const affordabilityScore = calculateAffordabilityScore(medianHomeValue, medianIncome, currentMortgageRate);
  const fairMarketRent = analyzeFMRComparison(fairMarketRentData, medianRent);
  const marketTimingSignal = calculateMarketTimingSignal(
    overvaluation,
    mortgageTrends.trendDirection,
    populationGrowth
  );
  const investmentGrade = calculateInvestmentGrade(affordabilityScore, overvaluation, employment, buyVsRent);

  const dataSources: string[] = [];
  if (mortgageTrends.dataSource.includes('FRED')) dataSources.push('FRED (Federal Reserve)');
  if (fairMarketRentData.source === 'hud_api') dataSources.push('HUD Fair Market Rent');
  if (buildingPermits.source === 'census_api') dataSources.push('Census Building Permits');
  if (employment.source === 'bls_api') dataSources.push('BLS Employment Data');
  dataSources.push('US Census Bureau ACS');

  return {
    mortgageTrends,
    overvaluation,
    buyVsRent,
    propertyTax,
    affordabilityScore,
    fairMarketRent,
    buildingPermits,
    employment,
    marketTimingSignal,
    investmentGrade,
    dataCompleteness: {
      tier1Complete: true,
      tier2Complete: employment.source === 'bls_api' || buildingPermits.source === 'census_api',
      dataSources
    }
  };
}

export type { 
  MortgageTrendData,
  OvervaluationData, 
  BuyVsRentData, 
  PropertyTaxData, 
  AffordabilityScore,
  FairMarketRent,
  FMRComparison,
  BuildingPermitsData,
  EmploymentData
};
