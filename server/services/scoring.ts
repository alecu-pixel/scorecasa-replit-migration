import type { CensusData, GrowthData, WalkabilityData, SchoolData, ScoreBreakdown, ScoreReasoning, PropertyListingsData, MarketData, CrimeData, FHFAAppreciationData, RedfinMarketHeatData, IRSNetMigrationData, JobsProximityData } from "@shared/schema";

export interface ForecastData {
  homeValueForecast?: {
    oneYearForecast: number;
    currentValue: number | null;
    forecastDate: string;
  } | null;
  rentForecast?: {
    oneYearForecast: number;
    currentRent: number | null;
    forecastDate: string;
  } | null;
  marketVelocity?: {
    daysToClose: number | null;
    daysToPending: number | null;
    saleToListRatio: number | null;
  } | null;
}

interface ScoreCalculationInput {
  demographics: CensusData & GrowthData;
  walkability: WalkabilityData;
  propertyListings?: PropertyListingsData | null;
  marketData?: MarketData | null;
  schools?: SchoolData | null;
  crimeData?: CrimeData | null;
  forecasts?: ForecastData | null;
  fhfaData?: FHFAAppreciationData | null;
  redfinData?: RedfinMarketHeatData | null;
  irsMigrationData?: IRSNetMigrationData | null;
  jobsProximityData?: JobsProximityData | null;
}

export function calculateInvestmentScore(data: ScoreCalculationInput): {
  finalScore: number;
  scoreBreakdown: ScoreBreakdown[];
} {
  const demographicResult = calculateDemographicScore(data.demographics, data.irsMigrationData);
  const walkabilityScore = (data.walkability.walkScore / 100) * 100;
  const walkReasoning: ScoreReasoning[] = [{
    factor: 'Nearby Amenities',
    value: `${data.walkability.amenities.length} found`,
    benchmark: '15-30+ within walking distance',
    impact: `Walk Score: ${data.walkability.walkScore}/100`,
    explanation: data.walkability.walkScore >= 70
      ? `${data.walkability.amenities.length} amenities nearby makes this a very walkable area — grocery stores, restaurants, and services are easily accessible on foot`
      : data.walkability.walkScore >= 50
        ? `${data.walkability.amenities.length} nearby amenities provide moderate walkability — some errands can be done on foot`
        : `Only ${data.walkability.amenities.length} amenities nearby means most errands require a car`
  }];
  
  let schoolQuality = 50;
  const schoolReasoning: ScoreReasoning[] = [];
  if (data.schools) {
    let baseScore = 50;
    let bonusPoints = 0;
    
    if (data.schools.average_state_percentile && data.schools.average_state_percentile > 0) {
      baseScore = data.schools.average_state_percentile;
      schoolReasoning.push({
        factor: 'State Percentile Ranking',
        value: `${data.schools.average_state_percentile.toFixed(0)}th percentile`,
        benchmark: '50th = average, 75th+ = strong',
        impact: `Base score: ${baseScore.toFixed(0)}/100`,
        explanation: baseScore >= 75 ? `Schools rank in the top ${(100 - baseScore).toFixed(0)}% statewide — significantly above average` : baseScore >= 50 ? `Schools rank above the state median` : `Schools rank below the state median, which may affect property values`
      });
    } else if (data.schools.average_star_rating && data.schools.average_star_rating > 0) {
      baseScore = (data.schools.average_star_rating / 5) * 100;
      schoolReasoning.push({
        factor: 'Average Star Rating',
        value: `${data.schools.average_star_rating.toFixed(1)} / 5 stars`,
        benchmark: '3.0 = average, 4.0+ = strong',
        impact: `Base score: ${baseScore.toFixed(0)}/100`,
        explanation: data.schools.average_star_rating >= 4 ? `Above-average school quality drives family demand and property values` : `School ratings are moderate — could limit demand from families with children`
      });
    } else {
      baseScore = (data.schools.average_score / 10) * 100;
      schoolReasoning.push({
        factor: 'Average School Score',
        value: `${data.schools.average_score.toFixed(1)} / 10`,
        benchmark: '5.0 = average, 7.0+ = strong',
        impact: `Base score: ${baseScore.toFixed(0)}/100`,
        explanation: `Nearby schools score ${data.schools.average_score.toFixed(1)} out of 10 based on available metrics`
      });
    }
    
    if (data.schools.average_graduation_rate && data.schools.average_graduation_rate > 0) {
      let gradPts = 0;
      if (data.schools.average_graduation_rate >= 95) gradPts = 8;
      else if (data.schools.average_graduation_rate >= 90) gradPts = 6;
      else if (data.schools.average_graduation_rate >= 85) gradPts = 4;
      else if (data.schools.average_graduation_rate >= 80) gradPts = 2;
      else if (data.schools.average_graduation_rate < 70) gradPts = -5;
      bonusPoints += gradPts;
      schoolReasoning.push({
        factor: 'Graduation Rate',
        value: `${data.schools.average_graduation_rate.toFixed(1)}%`,
        benchmark: '85-95%+ (strong)',
        impact: gradPts >= 0 ? `+${gradPts} bonus pts` : `${gradPts} pts (penalty)`,
        explanation: data.schools.average_graduation_rate >= 90 ? `High graduation rate of ${data.schools.average_graduation_rate.toFixed(1)}% signals quality education outcomes` : `Graduation rate of ${data.schools.average_graduation_rate.toFixed(1)}% is below the target threshold`
      });
    }
    
    if (data.schools.average_absenteeism_rate !== undefined && data.schools.average_absenteeism_rate > 0) {
      let absPts = 0;
      if (data.schools.average_absenteeism_rate > 25) absPts = -10;
      else if (data.schools.average_absenteeism_rate > 20) absPts = -6;
      else if (data.schools.average_absenteeism_rate > 15) absPts = -3;
      else if (data.schools.average_absenteeism_rate < 10) absPts = 3;
      bonusPoints += absPts;
      schoolReasoning.push({
        factor: 'Chronic Absenteeism',
        value: `${data.schools.average_absenteeism_rate.toFixed(1)}%`,
        benchmark: '<10% = excellent, >20% = concern',
        impact: absPts >= 0 ? `+${absPts} bonus pts` : `${absPts} pts (penalty)`,
        explanation: data.schools.average_absenteeism_rate < 15 ? `Low absenteeism (${data.schools.average_absenteeism_rate.toFixed(1)}%) indicates engaged students and families` : `High absenteeism rate of ${data.schools.average_absenteeism_rate.toFixed(1)}% is a concern for school quality`
      });
    }
    
    if (data.schools.average_spending_per_pupil && data.schools.average_spending_per_pupil > 0) {
      let spendPts = 0;
      if (data.schools.average_spending_per_pupil >= 15000) spendPts = 5;
      else if (data.schools.average_spending_per_pupil >= 12000) spendPts = 3;
      else if (data.schools.average_spending_per_pupil >= 10000) spendPts = 1;
      else if (data.schools.average_spending_per_pupil < 8000) spendPts = -2;
      bonusPoints += spendPts;
      schoolReasoning.push({
        factor: 'Spending Per Pupil',
        value: `$${data.schools.average_spending_per_pupil.toLocaleString()}`,
        benchmark: '$10,000-$15,000+ (well-funded)',
        impact: spendPts >= 0 ? `+${spendPts} bonus pts` : `${spendPts} pts (penalty)`,
        explanation: `$${data.schools.average_spending_per_pupil.toLocaleString()} per student ${data.schools.average_spending_per_pupil >= 12000 ? 'is above average, indicating well-funded schools' : 'is below average, which may limit school resources'}`
      });
    }
    
    schoolQuality = Math.min(100, Math.max(0, baseScore + bonusPoints));
  } else {
    schoolReasoning.push({
      factor: 'School Data',
      value: 'Not available',
      benchmark: 'N/A',
      impact: 'Default score: 50/100',
      explanation: 'No school data available for this area — using baseline default score'
    });
  }
  
  const marketResult = calculateMarketStrength(data.propertyListings, data.marketData, data.demographics, data.forecasts, data.fhfaData, data.redfinData);
  
  const safetyResult = data.crimeData 
    ? { score: data.crimeData.safetyScore, reasoning: [{
        factor: 'FBI Crime Data',
        value: `Safety Score: ${data.crimeData.safetyScore}/100`,
        benchmark: '70+ = safe, 85+ = very safe',
        impact: `Score: ${data.crimeData.safetyScore}/100`,
        explanation: data.crimeData.safetyScore >= 80 ? `FBI crime statistics indicate this is a safe area with low crime rates` : data.crimeData.safetyScore >= 60 ? `Crime rates are moderate — some areas for concern but generally manageable` : `Elevated crime rates in this area warrant careful consideration`
      }] as ScoreReasoning[] }
    : calculateSafetyScore(data.demographics);
  
  const rentalResult = calculateRentalPotential(data.demographics, data.propertyListings, data.marketData, data.forecasts);
  
  const jobsResult = calculateJobsScore(data.jobsProximityData);

  const scoreBreakdown: ScoreBreakdown[] = [
    { label: 'Market Strength', score: marketResult.score, weight: 0.22, reasoning: marketResult.reasoning },
    { label: 'Demographic Trends', score: demographicResult.score, weight: 0.18, reasoning: demographicResult.reasoning },
    { label: 'School Quality', score: schoolQuality, weight: 0.20, reasoning: schoolReasoning },
    { label: 'Safety Score', score: safetyResult.score, weight: 0.14, reasoning: safetyResult.reasoning },
    { label: 'Jobs Proximity', score: jobsResult.score, weight: 0.08, reasoning: jobsResult.reasoning },
    { label: 'Walkability', score: walkabilityScore, weight: 0.10, reasoning: walkReasoning },
    { label: 'Rental Potential', score: rentalResult.score, weight: 0.08, reasoning: rentalResult.reasoning },
  ];

  const finalScore = scoreBreakdown.reduce((total, item) => {
    return total + (item.score * item.weight);
  }, 0) / 10;

  return {
    finalScore: parseFloat(finalScore.toFixed(1)),
    scoreBreakdown
  };
}

function calculateDemographicScore(demographics: CensusData & GrowthData, irsMigration?: IRSNetMigrationData | null): { score: number; reasoning: ScoreReasoning[] } {
  let score = 50;
  const reasoning: ScoreReasoning[] = [];

  const income = demographics.medianIncome;
  let incomePoints = 0;
  if (income > 100000) incomePoints = 20;
  else if (income > 75000) incomePoints = 15;
  else if (income > 50000) incomePoints = 10;
  else if (income > 35000) incomePoints = 5;
  score += incomePoints;
  reasoning.push({
    factor: 'Median Household Income',
    value: `$${income.toLocaleString()}`,
    benchmark: '$50,000-$100,000+ (national range)',
    impact: `+${incomePoints} of 20 pts`,
    explanation: income > 75000 ? `High income area ($${income.toLocaleString()}) indicates strong purchasing power and economic stability` : income > 50000 ? `Moderate income area supports stable housing demand` : `Below-average income may limit property appreciation potential`
  });

  const empRate = demographics.employmentRate;
  let empPoints = 0;
  if (empRate > 95) empPoints = 8;
  else if (empRate > 90) empPoints = 6;
  else if (empRate > 85) empPoints = 3;
  score += empPoints;
  reasoning.push({
    factor: 'Employment Rate',
    value: `${empRate.toFixed(1)}%`,
    benchmark: '85-95%+ (healthy range)',
    impact: `+${empPoints} of 8 pts`,
    explanation: empRate > 90 ? `Strong employment rate of ${empRate.toFixed(1)}% signals a robust local economy` : empRate > 85 ? `Employment rate of ${empRate.toFixed(1)}% is adequate but leaves room for improvement` : `Employment rate of ${empRate.toFixed(1)}% is below the healthy threshold of 85%`
  });

  const eduPct = demographics.collegeDegreePct;
  let eduPoints = 0;
  if (eduPct > 50) eduPoints = 10;
  else if (eduPct > 35) eduPoints = 7;
  else if (eduPct > 25) eduPoints = 4;
  score += eduPoints;
  reasoning.push({
    factor: 'College Education Rate',
    value: `${eduPct.toFixed(1)}%`,
    benchmark: '25-50%+ (US avg ~33%)',
    impact: `+${eduPoints} of 10 pts`,
    explanation: eduPct > 50 ? `Highly educated area (${eduPct.toFixed(1)}% college-educated) correlates with higher property values` : eduPct > 35 ? `Above-average education level supports neighborhood desirability` : `Education rate is below the national average of ~33%`
  });

  const profPct = demographics.professionalEmploymentPct;
  let profPoints = 0;
  if (profPct > 60) profPoints = 7;
  else if (profPct > 50) profPoints = 6;
  else if (profPct > 40) profPoints = 5;
  else if (profPct > 30) profPoints = 3;
  else if (profPct > 20) profPoints = 1;
  score += profPoints;
  reasoning.push({
    factor: 'Professional Employment',
    value: `${profPct.toFixed(1)}%`,
    benchmark: '30-60%+ (professional workforce)',
    impact: `+${profPoints} of 7 pts`,
    explanation: profPct > 40 ? `High concentration of professional workers (${profPct.toFixed(1)}%) indicates an affluent, stable area` : `${profPct.toFixed(1)}% professional employment is below the threshold for premium neighborhoods`
  });

  const avgGrowth = (demographics.populationGrowth5yr + demographics.incomeGrowth5yr + demographics.housingGrowth5yr) / 3;
  let growthPoints = 0;
  if (avgGrowth > 10) growthPoints = 10;
  else if (avgGrowth > 5) growthPoints = 7;
  else if (avgGrowth > 2) growthPoints = 4;
  else if (avgGrowth < -5) growthPoints = -10;
  score += growthPoints;
  reasoning.push({
    factor: '5-Year Growth Trends',
    value: `${avgGrowth.toFixed(1)}% avg`,
    benchmark: '2-10%+ (population, income, housing)',
    impact: growthPoints >= 0 ? `+${growthPoints} of 10 pts` : `${growthPoints} pts (penalty)`,
    explanation: `Population grew ${demographics.populationGrowth5yr.toFixed(1)}%, incomes changed ${demographics.incomeGrowth5yr.toFixed(1)}%, housing stock changed ${demographics.housingGrowth5yr.toFixed(1)}% over 5 years. ${avgGrowth > 5 ? 'Strong growth signals rising demand' : avgGrowth > 0 ? 'Modest growth indicates a stable market' : 'Declining trends suggest weakening demand'}`
  });

  // IRS SOI Migration Data — net household migration signal
  if (irsMigration) {
    const net = irsMigration.netMigration;
    let migrationPoints = 0;
    if (net > 2000) migrationPoints = 12;
    else if (net > 1000) migrationPoints = 9;
    else if (net > 500) migrationPoints = 6;
    else if (net > 100) migrationPoints = 3;
    else if (net < -2000) migrationPoints = -12;
    else if (net < -1000) migrationPoints = -9;
    else if (net < -500) migrationPoints = -6;
    else if (net < -100) migrationPoints = -3;
    score += migrationPoints;
    const netDir = net > 0 ? `+${net.toLocaleString()}` : net.toLocaleString();
    reasoning.push({
      factor: 'IRS Population Migration',
      value: `${netDir} households/yr net`,
      benchmark: '+500 = positive, -500 = negative signal',
      impact: migrationPoints >= 0 ? `+${migrationPoints} of 12 pts` : `${migrationPoints} pts (penalty)`,
      explanation: irsMigration.insight,
    });
  }

  return { score: Math.min(100, Math.max(0, score)), reasoning };
}

function calculateMarketStrength(
  propertyListings: PropertyListingsData | null | undefined,
  marketData: MarketData | null | undefined,
  demographics: CensusData & GrowthData,
  forecasts?: ForecastData | null,
  fhfaData?: FHFAAppreciationData | null,
  redfinData?: RedfinMarketHeatData | null
): { score: number; reasoning: ScoreReasoning[] } {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const reasoning: ScoreReasoning[] = [];
  
  if (propertyListings?.avg_days_on_market !== null && propertyListings?.avg_days_on_market !== undefined) {
    const dom = propertyListings.avg_days_on_market;
    let domScore = 0;
    if (dom < 15) domScore = 30;
    else if (dom < 30) domScore = 26;
    else if (dom < 45) domScore = 21;
    else if (dom < 60) domScore = 15;
    else if (dom < 90) domScore = 9;
    else if (dom < 120) domScore = 4;
    totalScore += domScore;
    maxPossibleScore += 30;
    reasoning.push({
      factor: 'Average Days on Market',
      value: `${dom} days`,
      benchmark: '<30 days = hot, 30-60 = healthy, >90 = slow',
      impact: `${domScore} of 30 pts`,
      explanation: dom < 30 ? `Properties sell in just ${dom} days on average — strong buyer demand is driving quick sales` : dom < 60 ? `Properties spend ${dom} days on market, indicating healthy but not frenzied demand` : `Properties linger ${dom} days on average, suggesting weaker demand or overpricing in this market`
    });
  }

  if (marketData?.homeownershipRate !== null && marketData?.homeownershipRate !== undefined) {
    const rate = marketData.homeownershipRate;
    let ownershipScore = 0;
    if (rate > 75) ownershipScore = 25;
    else if (rate > 70) ownershipScore = 23;
    else if (rate > 65) ownershipScore = 20;
    else if (rate > 60) ownershipScore = 17;
    else if (rate > 55) ownershipScore = 13;
    else if (rate > 50) ownershipScore = 10;
    else if (rate > 45) ownershipScore = 7;
    else if (rate > 40) ownershipScore = 3;
    totalScore += ownershipScore;
    maxPossibleScore += 25;
    reasoning.push({
      factor: 'Homeownership Rate',
      value: `${rate.toFixed(1)}%`,
      benchmark: '60-75%+ (stable neighborhoods)',
      impact: `${ownershipScore} of 25 pts`,
      explanation: rate > 65 ? `High homeownership rate of ${rate.toFixed(1)}% indicates a stable, invested community` : rate > 50 ? `Moderate homeownership (${rate.toFixed(1)}%) — mix of owners and renters` : `Low homeownership rate of ${rate.toFixed(1)}% may indicate a transient population`
    });
  }

  if (marketData?.vacancyRate !== null && marketData?.vacancyRate !== undefined) {
    const vacancy = marketData.vacancyRate;
    let vacancyScore = 0;
    if (vacancy < 3) vacancyScore = 25;
    else if (vacancy < 5) vacancyScore = 23;
    else if (vacancy < 7) vacancyScore = 20;
    else if (vacancy < 10) vacancyScore = 17;
    else if (vacancy < 12) vacancyScore = 13;
    else if (vacancy < 15) vacancyScore = 8;
    else if (vacancy < 18) vacancyScore = 4;
    totalScore += vacancyScore;
    maxPossibleScore += 25;
    reasoning.push({
      factor: 'Vacancy Rate',
      value: `${vacancy.toFixed(1)}%`,
      benchmark: '<5% = tight, 5-10% = healthy, >12% = concerning',
      impact: `${vacancyScore} of 25 pts`,
      explanation: vacancy < 5 ? `Very low vacancy rate of ${vacancy.toFixed(1)}% means strong housing demand — properties don't sit empty` : vacancy < 10 ? `Vacancy rate of ${vacancy.toFixed(1)}% is within healthy range for most markets` : `Elevated vacancy rate of ${vacancy.toFixed(1)}% suggests oversupply or declining demand in this area`
    });
  }

  if (demographics.medianYearBuilt > 0) {
    const currentYear = new Date().getFullYear();
    const propertyAge = currentYear - demographics.medianYearBuilt;
    let ageScore = 0;
    if (propertyAge < 10) ageScore = 10;
    else if (propertyAge < 20) ageScore = 9;
    else if (propertyAge < 30) ageScore = 7;
    else if (propertyAge < 40) ageScore = 5;
    else if (propertyAge < 50) ageScore = 3;
    else ageScore = 2;
    totalScore += ageScore;
    maxPossibleScore += 10;
    reasoning.push({
      factor: 'Median Property Age',
      value: `Built ~${demographics.medianYearBuilt} (${propertyAge} years old)`,
      benchmark: '<20 yrs = new, 20-40 = moderate, 40+ = aging',
      impact: `${ageScore} of 10 pts`,
      explanation: propertyAge < 20 ? `Relatively new housing stock (median built ~${demographics.medianYearBuilt}) indicates recent development and investment` : propertyAge < 40 ? `Moderate-age housing (built ~${demographics.medianYearBuilt}) — established area with reasonable maintenance needs` : `Aging housing stock (built ~${demographics.medianYearBuilt}) may require higher maintenance costs`
    });
  }

  if (demographics.highValueHomePer1000 > 0) {
    let highValueScore = 0;
    const per1000 = demographics.highValueHomePer1000;
    if (per1000 >= 500) highValueScore = 10;
    else if (per1000 >= 300) highValueScore = 9;
    else if (per1000 >= 200) highValueScore = 8;
    else if (per1000 >= 100) highValueScore = 6;
    else if (per1000 >= 50) highValueScore = 4;
    else highValueScore = 2;
    totalScore += highValueScore;
    maxPossibleScore += 10;
    reasoning.push({
      factor: 'High-Value Home Concentration',
      value: `${(per1000 / 10).toFixed(1)}% of homes`,
      benchmark: '20%+ = premium market',
      impact: `${highValueScore} of 10 pts`,
      explanation: per1000 >= 200 ? `${(per1000 / 10).toFixed(1)}% of homes are high-value — this is a premium market with strong property values` : `${(per1000 / 10).toFixed(1)}% high-value homes is below the premium market threshold`
    });
  }

  if (forecasts?.homeValueForecast?.oneYearForecast !== undefined && forecasts.homeValueForecast.oneYearForecast !== null) {
    const forecast = forecasts.homeValueForecast.oneYearForecast;
    let forecastScore = 0;
    if (forecast >= 8) forecastScore = 15;
    else if (forecast >= 5) forecastScore = 13;
    else if (forecast >= 3) forecastScore = 11;
    else if (forecast >= 1) forecastScore = 8;
    else if (forecast >= 0) forecastScore = 5;
    else if (forecast >= -2) forecastScore = 2;
    totalScore += forecastScore;
    maxPossibleScore += 15;
    reasoning.push({
      factor: '1-Year Home Value Forecast',
      value: `${forecast >= 0 ? '+' : ''}${forecast.toFixed(1)}%`,
      benchmark: '3-8%+ growth = strong appreciation',
      impact: `${forecastScore} of 15 pts`,
      explanation: forecast >= 3 ? `Home values are projected to grow ${forecast.toFixed(1)}% over the next year — strong appreciation expected` : forecast >= 0 ? `Modest ${forecast.toFixed(1)}% growth projected — stable but not high-growth market` : `Home values are projected to decline ${Math.abs(forecast).toFixed(1)}% — potential buying opportunity but higher risk`
    });
  }

  if (forecasts?.marketVelocity?.daysToPending !== undefined && forecasts.marketVelocity.daysToPending !== null) {
    const daysToPending = forecasts.marketVelocity.daysToPending;
    let velocityScore = 0;
    if (daysToPending < 10) velocityScore = 10;
    else if (daysToPending < 15) velocityScore = 9;
    else if (daysToPending < 21) velocityScore = 7;
    else if (daysToPending < 30) velocityScore = 5;
    else if (daysToPending < 45) velocityScore = 3;
    else velocityScore = 1;
    totalScore += velocityScore;
    maxPossibleScore += 10;
    reasoning.push({
      factor: 'Market Velocity (Days to Pending)',
      value: `${daysToPending} days`,
      benchmark: '<15 = fast, 15-30 = moderate, 30+ = slow',
      impact: `${velocityScore} of 10 pts`,
      explanation: daysToPending < 15 ? `Listings go to pending in just ${daysToPending} days — buyers are competing aggressively` : daysToPending < 30 ? `${daysToPending} days to pending reflects a balanced market pace` : `${daysToPending} days to pending indicates slower buyer activity`
    });
  }

  if (forecasts?.marketVelocity?.saleToListRatio !== undefined && forecasts.marketVelocity.saleToListRatio !== null) {
    const ratio = forecasts.marketVelocity.saleToListRatio;
    let ratioScore = 0;
    if (ratio >= 1.02) ratioScore = 10;
    else if (ratio >= 1.00) ratioScore = 9;
    else if (ratio >= 0.98) ratioScore = 7;
    else if (ratio >= 0.95) ratioScore = 5;
    else if (ratio >= 0.92) ratioScore = 3;
    else ratioScore = 1;
    totalScore += ratioScore;
    maxPossibleScore += 10;
    reasoning.push({
      factor: 'Sale-to-List Price Ratio',
      value: `${(ratio * 100).toFixed(1)}%`,
      benchmark: '98-102% = balanced, 100%+ = seller advantage',
      impact: `${ratioScore} of 10 pts`,
      explanation: ratio >= 1.0 ? `Homes are selling at ${(ratio * 100).toFixed(1)}% of asking price — sellers are getting full price or above, indicating strong demand` : ratio >= 0.95 ? `Homes sell at ${(ratio * 100).toFixed(1)}% of list price — buyers have some negotiating power` : `Deep discounting at ${(ratio * 100).toFixed(1)}% of list price suggests a buyer's market with room to negotiate`
    });
  }

  // FHFA Historical Appreciation — 5yr state-level HPI trend
  if (fhfaData?.appreciation5yr !== null && fhfaData?.appreciation5yr !== undefined) {
    const app5yr = fhfaData.appreciation5yr;
    let fhfaScore = 0;
    if (app5yr >= 40) fhfaScore = 15;
    else if (app5yr >= 25) fhfaScore = 13;
    else if (app5yr >= 15) fhfaScore = 11;
    else if (app5yr >= 8) fhfaScore = 8;
    else if (app5yr >= 3) fhfaScore = 5;
    else if (app5yr >= 0) fhfaScore = 2;
    else fhfaScore = 0;
    totalScore += fhfaScore;
    maxPossibleScore += 15;
    const vsUs = fhfaData.us5yr !== null ? ` (US: +${fhfaData.us5yr.toFixed(0)}%)` : '';
    reasoning.push({
      factor: `FHFA Historical Appreciation (${fhfaData.stateCode})`,
      value: `+${app5yr.toFixed(0)}% over 5 yrs${vsUs}`,
      benchmark: '15-25%+ (5yr) = strong appreciation',
      impact: `${fhfaScore} of 15 pts`,
      explanation: fhfaData.insight,
    });
  }

  // Redfin Market Heat — competition signals
  if (redfinData?.pctHomesAboveList !== null && redfinData?.pctHomesAboveList !== undefined) {
    const pctAbove = redfinData.pctHomesAboveList;
    const pctDrops = redfinData.pctHomesWithDrops ?? 50;
    let redfinScore = 0;
    if (pctAbove >= 50) redfinScore = 10;
    else if (pctAbove >= 35) redfinScore = 8;
    else if (pctAbove >= 20) redfinScore = 6;
    else if (pctAbove >= 10) redfinScore = 4;
    else redfinScore = 2;
    // Penalty if many price drops
    if (pctDrops > 30) redfinScore = Math.max(0, redfinScore - 3);
    else if (pctDrops > 20) redfinScore = Math.max(0, redfinScore - 1);
    totalScore += redfinScore;
    maxPossibleScore += 10;
    reasoning.push({
      factor: 'Redfin Market Competition',
      value: `${pctAbove.toFixed(0)}% above list, ${pctDrops.toFixed(0)}% price drops`,
      benchmark: '35%+ above list = competitive, 20%+ drops = softening',
      impact: `${redfinScore} of 10 pts`,
      explanation: redfinData.insight,
    });
  }

  if (maxPossibleScore === 0) {
    return { score: 50, reasoning: [{ factor: 'Market Data', value: 'Not available', benchmark: 'N/A', impact: 'Default score: 50/100', explanation: 'No market data available for this area' }] };
  }
  
  const finalScore = (totalScore / maxPossibleScore) * 100;
  return { score: Math.min(100, Math.max(0, Math.round(finalScore))), reasoning };
}

function calculateSafetyScore(demographics: CensusData & GrowthData): { score: number; reasoning: ScoreReasoning[] } {
  let score = 100;
  const reasoning: ScoreReasoning[] = [];
  
  const povertyRate = demographics.povertyRate;
  let povertyPenalty = 0;
  if (povertyRate > 30) povertyPenalty = 50;
  else if (povertyRate > 20) povertyPenalty = 40;
  else if (povertyRate > 15) povertyPenalty = 30;
  else if (povertyRate > 10) povertyPenalty = 20;
  else if (povertyRate > 5) povertyPenalty = 10;
  score -= povertyPenalty;
  reasoning.push({
    factor: 'Poverty Rate',
    value: `${povertyRate.toFixed(1)}%`,
    benchmark: '<5% = very safe, 10-20% = moderate, >20% = elevated risk',
    impact: povertyPenalty > 0 ? `-${povertyPenalty} pts (penalty)` : 'No penalty',
    explanation: povertyRate <= 5 ? `Very low poverty rate (${povertyRate.toFixed(1)}%) — research shows strong correlation between low poverty and low crime` : povertyRate <= 15 ? `Moderate poverty rate of ${povertyRate.toFixed(1)}% indicates some economic stress in the area` : `High poverty rate of ${povertyRate.toFixed(1)}% is a significant safety risk factor — research links high poverty with elevated crime rates`
  });
  
  const abandonmentRate = demographics.abandonmentRate;
  let abandonPenalty = 0;
  if (abandonmentRate > 40) abandonPenalty = 30;
  else if (abandonmentRate > 30) abandonPenalty = 25;
  else if (abandonmentRate > 20) abandonPenalty = 20;
  else if (abandonmentRate > 10) abandonPenalty = 12;
  else if (abandonmentRate > 5) abandonPenalty = 5;
  score -= abandonPenalty;
  reasoning.push({
    factor: 'Property Abandonment Rate',
    value: `${abandonmentRate.toFixed(1)}%`,
    benchmark: '<5% = good, >20% = neighborhood decline',
    impact: abandonPenalty > 0 ? `-${abandonPenalty} pts (penalty)` : 'No penalty',
    explanation: abandonmentRate <= 5 ? `Minimal property abandonment (${abandonmentRate.toFixed(1)}%) indicates a well-maintained neighborhood` : `${abandonmentRate.toFixed(1)}% abandonment rate signals neighborhood decline — abandoned properties attract crime and lower surrounding property values`
  });
  
  const vacancyRate = demographics.vacancyRate;
  let vacPenalty = 0;
  if (vacancyRate > 20) vacPenalty = 20;
  else if (vacancyRate > 15) vacPenalty = 15;
  else if (vacancyRate > 12) vacPenalty = 10;
  else if (vacancyRate > 10) vacPenalty = 5;
  score -= vacPenalty;
  reasoning.push({
    factor: 'Overall Vacancy Rate',
    value: `${vacancyRate.toFixed(1)}%`,
    benchmark: '<10% = healthy, >15% = concern',
    impact: vacPenalty > 0 ? `-${vacPenalty} pts (penalty)` : 'No penalty',
    explanation: vacancyRate <= 10 ? `Low vacancy rate of ${vacancyRate.toFixed(1)}% indicates an occupied, active community` : `High vacancy rate of ${vacancyRate.toFixed(1)}% can indicate neighborhood problems and reduced safety`
  });
  
  return { score: Math.min(100, Math.max(0, score)), reasoning };
}

function calculateRentalPotential(
  demographics: CensusData & GrowthData,
  propertyListings: PropertyListingsData | null | undefined,
  marketData: MarketData | null | undefined,
  forecasts?: ForecastData | null
): { score: number; reasoning: ScoreReasoning[] } {
  let score = 50;
  const reasoning: ScoreReasoning[] = [];
  
  const medianHomeValue = demographics.medianHomeValue > 0 
    ? demographics.medianHomeValue 
    : (marketData?.medianHomeValue || 0);
  
  const medianRent = demographics.medianRent > 0 
    ? demographics.medianRent 
    : (marketData?.medianRent || 0);
  
  if (medianRent > 0 && medianHomeValue > 0) {
    const annualRent = medianRent * 12;
    const rentToPrice = (annualRent / medianHomeValue) * 100;
    let rtpPoints = 0;
    if (rentToPrice >= 1.0) rtpPoints = 30;
    else if (rentToPrice >= 0.8) rtpPoints = 25;
    else if (rentToPrice >= 0.7) rtpPoints = 20;
    else if (rentToPrice >= 0.6) rtpPoints = 15;
    else if (rentToPrice >= 0.5) rtpPoints = 10;
    else if (rentToPrice >= 0.4) rtpPoints = 5;
    score += rtpPoints;
    reasoning.push({
      factor: 'Rent-to-Price Ratio',
      value: `${rentToPrice.toFixed(2)}% ($${medianRent.toLocaleString()}/mo rent, $${medianHomeValue.toLocaleString()} home value)`,
      benchmark: '0.8-1.0%+ (1% Rule = excellent)',
      impact: `+${rtpPoints} of 30 pts`,
      explanation: rentToPrice >= 0.8 ? `Strong rental yield — monthly rent of $${medianRent.toLocaleString()} relative to $${medianHomeValue.toLocaleString()} home value gives a ${rentToPrice.toFixed(2)}% monthly return, near or above the 1% rule` : rentToPrice >= 0.5 ? `Moderate rental yield of ${rentToPrice.toFixed(2)}% — rent of $${medianRent.toLocaleString()} against $${medianHomeValue.toLocaleString()} home value is below the 1% rule target` : `Low rental yield of ${rentToPrice.toFixed(2)}% — high home prices relative to rents make this less attractive for cash flow investors`
    });
  }
  
  const renterPct = demographics.renterOccupiedPct;
  let renterPoints = 0;
  if (renterPct >= 30 && renterPct <= 50) renterPoints = 20;
  else if (renterPct >= 25 && renterPct < 30) renterPoints = 15;
  else if (renterPct >= 20 && renterPct < 25) renterPoints = 10;
  else if (renterPct > 50 && renterPct <= 60) renterPoints = 15;
  else if (renterPct > 60) renterPoints = 10;
  else renterPoints = 5;
  score += renterPoints;
  reasoning.push({
    factor: 'Renter Population',
    value: `${renterPct.toFixed(1)}% renters`,
    benchmark: '30-50% = ideal rental market',
    impact: `+${renterPoints} of 20 pts`,
    explanation: (renterPct >= 30 && renterPct <= 50) ? `${renterPct.toFixed(1)}% renter-occupied is the sweet spot — enough rental demand without oversaturation` : renterPct > 50 ? `High renter population (${renterPct.toFixed(1)}%) shows strong rental demand, but may indicate affordability issues` : `Low renter percentage (${renterPct.toFixed(1)}%) means limited rental demand — this is primarily an owner-occupied market`
  });

  if (forecasts?.rentForecast?.oneYearForecast !== undefined && forecasts.rentForecast.oneYearForecast !== null) {
    const rentGrowth = forecasts.rentForecast.oneYearForecast;
    let rentGrowthPts = 0;
    if (rentGrowth >= 5) rentGrowthPts = 15;
    else if (rentGrowth >= 3) rentGrowthPts = 12;
    else if (rentGrowth >= 2) rentGrowthPts = 9;
    else if (rentGrowth >= 1) rentGrowthPts = 6;
    else if (rentGrowth >= 0) rentGrowthPts = 3;
    score += rentGrowthPts;
    reasoning.push({
      factor: '1-Year Rent Growth Forecast',
      value: `${rentGrowth >= 0 ? '+' : ''}${rentGrowth.toFixed(1)}%`,
      benchmark: '2-5%+ = strong growth',
      impact: `+${rentGrowthPts} of 15 pts`,
      explanation: rentGrowth >= 3 ? `Rents projected to grow ${rentGrowth.toFixed(1)}% in the next year — strong upward trajectory improves rental income potential` : rentGrowth >= 0 ? `Modest rent growth of ${rentGrowth.toFixed(1)}% expected — stable but not high-growth rental market` : `Rents projected to decline ${Math.abs(rentGrowth).toFixed(1)}% — rental income may decrease`
    });
  }
  
  return { score: Math.min(100, Math.max(0, score)), reasoning };
}

function calculateJobsScore(jobsProximity: JobsProximityData | null | undefined): { score: number; reasoning: ScoreReasoning[] } {
  if (!jobsProximity) {
    return {
      score: 50,
      reasoning: [{
        factor: 'Jobs Proximity',
        value: 'Data pending',
        benchmark: 'LEHD/LODES data loads on first request per state',
        impact: 'Default: 50/100',
        explanation: 'Employment proximity data is being loaded from Census LEHD for this area. Score defaults to neutral until data is available.',
      }],
    };
  }

  const jobs = jobsProximity.totalJobs;
  let score = 0;
  let impactLabel = '';

  if (jobs >= 50000)      { score = 95; impactLabel = '95/100 — Major employment hub'; }
  else if (jobs >= 30000) { score = 88; impactLabel = '88/100 — Large employment center'; }
  else if (jobs >= 15000) { score = 80; impactLabel = '80/100 — Strong employment center'; }
  else if (jobs >= 8000)  { score = 70; impactLabel = '70/100 — Moderate employment center'; }
  else if (jobs >= 4000)  { score = 60; impactLabel = '60/100 — Light urban employment'; }
  else if (jobs >= 1500)  { score = 48; impactLabel = '48/100 — Suburban employment level'; }
  else if (jobs >= 500)   { score = 35; impactLabel = '35/100 — Low employment density'; }
  else if (jobs >= 100)   { score = 22; impactLabel = '22/100 — Minimal local jobs'; }
  else                    { score = 12; impactLabel = '12/100 — Primarily residential area'; }

  const topSectorsList = jobsProximity.topSectors.slice(0, 3).map(s => s.name).join(', ');

  return {
    score,
    reasoning: [
      {
        factor: 'Total Workplace Jobs in Tract',
        value: jobs.toLocaleString() + ' jobs',
        benchmark: '<1,500 = low | 8,000+ = moderate | 30,000+ = major hub',
        impact: impactLabel,
        explanation: jobsProximity.insight,
      },
      ...(topSectorsList ? [{
        factor: 'Leading Employment Sectors',
        value: topSectorsList,
        benchmark: 'Diversification reduces concentration risk',
        impact: 'Contextual',
        explanation: `Top industries in this tract: ${topSectorsList}. Sector diversity reduces reliance on any single employer or industry.`,
      }] : []),
    ],
  };
}
