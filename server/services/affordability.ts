export interface OvervaluationData {
  valueToIncomeRatio: number;
  nationalAverageRatio: number;
  historicalAverageRatio: number;
  overvaluationPercent: number;
  overvaluationLabel: 'severely_overvalued' | 'overvalued' | 'fairly_valued' | 'undervalued' | 'severely_undervalued';
  overvaluationColor: string;
  riskLevel: 'high' | 'medium' | 'low';
  insight: string;
}

export interface BuyVsRentData {
  monthlyMortgagePayment: number;
  monthlyRent: number;
  buyVsRentRatio: number;
  buyVsRentDifferential: number;
  recommendation: 'buy' | 'rent' | 'neutral';
  recommendationStrength: 'strong' | 'moderate' | 'slight';
  breakEvenYears: number;
  insight: string;
}

export interface PropertyTaxData {
  estimatedAnnualTax: number;
  estimatedMonthlyTax: number;
  effectiveTaxRate: number;
  stateTaxRateAverage: number;
  vsStateAverage: string;
  taxBurdenLevel: 'high' | 'moderate' | 'low';
  insight: string;
}

export interface AffordabilityScore {
  score: number;
  label: string;
  color: string;
  monthlyPaymentToIncome: number;
  salaryNeededToAfford: number;
  affordabilityGap: number;
  isAffordableForMedianIncome: boolean;
  insight: string;
}

export interface AffordabilityAnalysis {
  overvaluation: OvervaluationData;
  buyVsRent: BuyVsRentData;
  propertyTax: PropertyTaxData;
  affordabilityScore: AffordabilityScore;
  marketTimingSignal: {
    signal: 'buy' | 'wait' | 'caution';
    confidence: number;
    factors: string[];
    reasoning?: { factor: string; value: string; benchmark: string; impact: string; explanation: string }[];
    buyScore?: number;
    maxScore?: number;
  };
}

const NATIONAL_AVERAGE_VALUE_TO_INCOME = 4.5;
const HISTORICAL_AVERAGE_VALUE_TO_INCOME = 3.5;
const MONTHLY_INCOME_THRESHOLD = 0.28;

const STATE_TAX_RATES: { [key: string]: number } = {
  'AL': 0.41, 'AK': 1.19, 'AZ': 0.62, 'AR': 0.62, 'CA': 0.76,
  'CO': 0.51, 'CT': 2.14, 'DE': 0.57, 'FL': 0.89, 'GA': 0.92,
  'HI': 0.28, 'ID': 0.69, 'IL': 2.27, 'IN': 0.85, 'IA': 1.57,
  'KS': 1.41, 'KY': 0.86, 'LA': 0.55, 'ME': 1.36, 'MD': 1.09,
  'MA': 1.23, 'MI': 1.54, 'MN': 1.12, 'MS': 0.81, 'MO': 0.97,
  'MT': 0.84, 'NE': 1.73, 'NV': 0.60, 'NH': 2.18, 'NJ': 2.49,
  'NM': 0.80, 'NY': 1.72, 'NC': 0.84, 'ND': 0.98, 'OH': 1.56,
  'OK': 0.90, 'OR': 0.97, 'PA': 1.58, 'RI': 1.53, 'SC': 0.57,
  'SD': 1.31, 'TN': 0.71, 'TX': 1.80, 'UT': 0.63, 'VT': 1.90,
  'VA': 0.82, 'WA': 1.03, 'WV': 0.58, 'WI': 1.85, 'WY': 0.61,
  'DC': 0.56
};

export function calculateOvervaluation(
  medianHomeValue: number,
  medianIncome: number
): OvervaluationData {
  if (medianIncome <= 0 || medianHomeValue <= 0) {
    return {
      valueToIncomeRatio: 0,
      nationalAverageRatio: NATIONAL_AVERAGE_VALUE_TO_INCOME,
      historicalAverageRatio: HISTORICAL_AVERAGE_VALUE_TO_INCOME,
      overvaluationPercent: 0,
      overvaluationLabel: 'fairly_valued',
      overvaluationColor: '#22c55e',
      riskLevel: 'low',
      insight: 'Unable to calculate - insufficient data'
    };
  }

  const valueToIncomeRatio = medianHomeValue / medianIncome;
  const overvaluationPercent = ((valueToIncomeRatio - HISTORICAL_AVERAGE_VALUE_TO_INCOME) / HISTORICAL_AVERAGE_VALUE_TO_INCOME) * 100;

  let overvaluationLabel: OvervaluationData['overvaluationLabel'];
  let overvaluationColor: string;
  let riskLevel: 'high' | 'medium' | 'low';

  if (overvaluationPercent >= 50) {
    overvaluationLabel = 'severely_overvalued';
    overvaluationColor = '#ef4444';
    riskLevel = 'high';
  } else if (overvaluationPercent >= 20) {
    overvaluationLabel = 'overvalued';
    overvaluationColor = '#f97316';
    riskLevel = 'medium';
  } else if (overvaluationPercent >= -10) {
    overvaluationLabel = 'fairly_valued';
    overvaluationColor = '#22c55e';
    riskLevel = 'low';
  } else if (overvaluationPercent >= -30) {
    overvaluationLabel = 'undervalued';
    overvaluationColor = '#3b82f6';
    riskLevel = 'low';
  } else {
    overvaluationLabel = 'severely_undervalued';
    overvaluationColor = '#6366f1';
    riskLevel = 'low';
  }

  const insight = overvaluationPercent >= 30
    ? `Home prices are ${Math.abs(overvaluationPercent).toFixed(0)}% above historical norms relative to local incomes. Exercise caution.`
    : overvaluationPercent >= 10
    ? `Prices are elevated but not extreme. Monitor market conditions before buying.`
    : overvaluationPercent >= -10
    ? `Prices align well with local income levels. Fair market conditions.`
    : `Potential value opportunity - prices are below historical norms relative to incomes.`;

  return {
    valueToIncomeRatio: parseFloat(valueToIncomeRatio.toFixed(2)),
    nationalAverageRatio: NATIONAL_AVERAGE_VALUE_TO_INCOME,
    historicalAverageRatio: HISTORICAL_AVERAGE_VALUE_TO_INCOME,
    overvaluationPercent: parseFloat(overvaluationPercent.toFixed(1)),
    overvaluationLabel,
    overvaluationColor,
    riskLevel,
    insight
  };
}

export function calculateBuyVsRent(
  homePrice: number,
  medianRent: number,
  mortgageRate: number,
  downPaymentPercent: number = 20
): BuyVsRentData {
  if (homePrice <= 0 || medianRent <= 0) {
    return {
      monthlyMortgagePayment: 0,
      monthlyRent: medianRent,
      buyVsRentRatio: 0,
      buyVsRentDifferential: 0,
      recommendation: 'neutral',
      recommendationStrength: 'slight',
      breakEvenYears: 0,
      insight: 'Unable to calculate - insufficient data'
    };
  }

  const loanAmount = homePrice * (1 - downPaymentPercent / 100);
  const monthlyRate = mortgageRate / 100 / 12;
  const numPayments = 30 * 12;
  
  const monthlyPrincipalInterest = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  const monthlyPropertyTax = (homePrice * 0.012) / 12;
  const monthlyInsurance = (homePrice * 0.005) / 12;
  
  const monthlyMortgagePayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance;
  const buyVsRentRatio = monthlyMortgagePayment / medianRent;
  const buyVsRentDifferential = ((monthlyMortgagePayment - medianRent) / medianRent) * 100;

  let recommendation: 'buy' | 'rent' | 'neutral';
  let recommendationStrength: 'strong' | 'moderate' | 'slight';

  if (buyVsRentRatio <= 1.0) {
    recommendation = 'buy';
    recommendationStrength = buyVsRentRatio <= 0.8 ? 'strong' : buyVsRentRatio <= 0.9 ? 'moderate' : 'slight';
  } else if (buyVsRentRatio <= 1.2) {
    recommendation = 'neutral';
    recommendationStrength = 'slight';
  } else {
    recommendation = 'rent';
    recommendationStrength = buyVsRentRatio >= 1.5 ? 'strong' : buyVsRentRatio >= 1.3 ? 'moderate' : 'slight';
  }

  const annualRentIncrease = 0.03;
  const annualAppreciation = 0.03;
  const downPayment = homePrice * (downPaymentPercent / 100);
  
  let breakEvenYears = 0;
  let cumulativeRent = 0;
  let cumulativeBuyCost = downPayment;
  
  for (let year = 1; year <= 30; year++) {
    const yearlyRent = medianRent * 12 * Math.pow(1 + annualRentIncrease, year - 1);
    const yearlyMortgage = monthlyMortgagePayment * 12;
    const equity = homePrice * Math.pow(1 + annualAppreciation, year) - loanAmount;
    
    cumulativeRent += yearlyRent;
    cumulativeBuyCost += yearlyMortgage;
    
    if (cumulativeBuyCost - equity < cumulativeRent && breakEvenYears === 0) {
      breakEvenYears = year;
      break;
    }
  }

  const insight = recommendation === 'buy'
    ? `Buying costs ${Math.abs(buyVsRentDifferential).toFixed(0)}% less than renting monthly. Strong case for homeownership.`
    : recommendation === 'rent'
    ? `Buying costs ${buyVsRentDifferential.toFixed(0)}% more than renting. Consider renting while saving for a larger down payment.`
    : `Monthly costs are comparable. Decision depends on your long-term plans and lifestyle preferences.`;

  return {
    monthlyMortgagePayment: Math.round(monthlyMortgagePayment),
    monthlyRent: medianRent,
    buyVsRentRatio: parseFloat(buyVsRentRatio.toFixed(2)),
    buyVsRentDifferential: parseFloat(buyVsRentDifferential.toFixed(1)),
    recommendation,
    recommendationStrength,
    breakEvenYears: breakEvenYears || 7,
    insight
  };
}

export function calculatePropertyTax(
  homeValue: number,
  stateAbbr: string
): PropertyTaxData {
  const stateTaxRate = STATE_TAX_RATES[stateAbbr.toUpperCase()] || 1.1;
  const nationalAverageRate = 1.1;
  
  const estimatedAnnualTax = homeValue * (stateTaxRate / 100);
  const estimatedMonthlyTax = estimatedAnnualTax / 12;
  
  const vsStateAverage = stateTaxRate > nationalAverageRate
    ? `${((stateTaxRate / nationalAverageRate - 1) * 100).toFixed(0)}% above national average`
    : stateTaxRate < nationalAverageRate
    ? `${((1 - stateTaxRate / nationalAverageRate) * 100).toFixed(0)}% below national average`
    : 'At national average';

  let taxBurdenLevel: 'high' | 'moderate' | 'low';
  if (stateTaxRate >= 1.5) {
    taxBurdenLevel = 'high';
  } else if (stateTaxRate >= 0.8) {
    taxBurdenLevel = 'moderate';
  } else {
    taxBurdenLevel = 'low';
  }

  const insight = taxBurdenLevel === 'high'
    ? `${stateAbbr.toUpperCase()} has high property taxes. Budget $${Math.round(estimatedMonthlyTax)}/month for taxes alone.`
    : taxBurdenLevel === 'low'
    ? `${stateAbbr.toUpperCase()} has relatively low property taxes, reducing your monthly costs.`
    : `Property taxes in ${stateAbbr.toUpperCase()} are moderate compared to other states.`;

  return {
    estimatedAnnualTax: Math.round(estimatedAnnualTax),
    estimatedMonthlyTax: Math.round(estimatedMonthlyTax),
    effectiveTaxRate: stateTaxRate,
    stateTaxRateAverage: stateTaxRate,
    vsStateAverage,
    taxBurdenLevel,
    insight
  };
}

export function calculateAffordabilityScore(
  homePrice: number,
  medianIncome: number,
  mortgageRate: number,
  downPaymentPercent: number = 20
): AffordabilityScore {
  if (homePrice <= 0 || medianIncome <= 0) {
    return {
      score: 0,
      label: 'Unknown',
      color: '#6b7280',
      monthlyPaymentToIncome: 0,
      salaryNeededToAfford: 0,
      affordabilityGap: 0,
      isAffordableForMedianIncome: false,
      insight: 'Unable to calculate - insufficient data'
    };
  }

  const loanAmount = homePrice * (1 - downPaymentPercent / 100);
  const monthlyRate = mortgageRate / 100 / 12;
  const numPayments = 30 * 12;
  
  const monthlyPrincipalInterest = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  const monthlyPropertyTax = (homePrice * 0.012) / 12;
  const monthlyInsurance = (homePrice * 0.005) / 12;
  const totalMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance;
  
  const monthlyIncome = medianIncome / 12;
  const monthlyPaymentToIncome = (totalMonthlyPayment / monthlyIncome) * 100;
  
  const salaryNeededToAfford = (totalMonthlyPayment / MONTHLY_INCOME_THRESHOLD) * 12;
  const affordabilityGap = salaryNeededToAfford - medianIncome;
  const isAffordableForMedianIncome = affordabilityGap <= 0;

  let score: number;
  if (monthlyPaymentToIncome <= 20) {
    score = 10;
  } else if (monthlyPaymentToIncome <= 25) {
    score = 8;
  } else if (monthlyPaymentToIncome <= 28) {
    score = 7;
  } else if (monthlyPaymentToIncome <= 33) {
    score = 5;
  } else if (monthlyPaymentToIncome <= 40) {
    score = 3;
  } else {
    score = 1;
  }

  let label: string;
  let color: string;

  if (score >= 8) {
    label = 'Very Affordable';
    color = '#22c55e';
  } else if (score >= 6) {
    label = 'Affordable';
    color = '#84cc16';
  } else if (score >= 4) {
    label = 'Moderately Affordable';
    color = '#eab308';
  } else if (score >= 2) {
    label = 'Challenging';
    color = '#f97316';
  } else {
    label = 'Unaffordable';
    color = '#ef4444';
  }

  const insight = isAffordableForMedianIncome
    ? `A median-income household can afford typical homes here. Housing costs would be ${monthlyPaymentToIncome.toFixed(0)}% of income.`
    : `Median-income households are priced out. You'd need to earn $${Math.round(salaryNeededToAfford).toLocaleString()} to afford typical homes.`;

  return {
    score,
    label,
    color,
    monthlyPaymentToIncome: parseFloat(monthlyPaymentToIncome.toFixed(1)),
    salaryNeededToAfford: Math.round(salaryNeededToAfford),
    affordabilityGap: Math.round(affordabilityGap),
    isAffordableForMedianIncome,
    insight
  };
}

export function calculateMarketTimingSignal(
  overvaluation: OvervaluationData,
  mortgageTrendDirection: 'rising' | 'falling' | 'stable',
  populationGrowth: number,
  inventoryChange?: number
): AffordabilityAnalysis['marketTimingSignal'] {
  const factors: string[] = [];
  const reasoning: { factor: string; value: string; benchmark: string; impact: string; explanation: string }[] = [];
  let buyScore = 0;
  const maxScore = 5;

  if (overvaluation.overvaluationPercent < 0) {
    buyScore += 2;
    factors.push('Prices below historical norms');
    reasoning.push({
      factor: 'Price Valuation',
      value: `${overvaluation.overvaluationPercent.toFixed(1)}% vs historical norms`,
      benchmark: '<0% = undervalued, 0-20% = fair, >20% = overvalued',
      impact: '+2 buy points',
      explanation: `Properties are ${Math.abs(overvaluation.overvaluationPercent).toFixed(1)}% below historical price norms (value-to-income ratio: ${overvaluation.valueToIncomeRatio.toFixed(1)}x vs national avg ${overvaluation.nationalAverageRatio.toFixed(1)}x) — this signals a potential buying opportunity`
    });
  } else if (overvaluation.overvaluationPercent < 20) {
    buyScore += 1;
    factors.push('Prices within reasonable range');
    reasoning.push({
      factor: 'Price Valuation',
      value: `${overvaluation.overvaluationPercent.toFixed(1)}% above historical norms`,
      benchmark: '<0% = undervalued, 0-20% = fair, >20% = overvalued',
      impact: '+1 buy point',
      explanation: `Prices are ${overvaluation.overvaluationPercent.toFixed(1)}% above historical norms but still within a reasonable range (value-to-income ratio: ${overvaluation.valueToIncomeRatio.toFixed(1)}x vs national avg ${overvaluation.nationalAverageRatio.toFixed(1)}x)`
    });
  } else {
    buyScore -= 1;
    factors.push('Elevated price levels');
    reasoning.push({
      factor: 'Price Valuation',
      value: `${overvaluation.overvaluationPercent.toFixed(1)}% above historical norms`,
      benchmark: '<0% = undervalued, 0-20% = fair, >20% = overvalued',
      impact: '-1 buy point',
      explanation: `Properties are overvalued by ${overvaluation.overvaluationPercent.toFixed(1)}% compared to historical norms (value-to-income ratio: ${overvaluation.valueToIncomeRatio.toFixed(1)}x vs national avg ${overvaluation.nationalAverageRatio.toFixed(1)}x) — elevated prices increase risk of correction`
    });
  }

  if (mortgageTrendDirection === 'falling') {
    buyScore += 1;
    factors.push('Mortgage rates trending down');
    reasoning.push({
      factor: 'Mortgage Rate Trend',
      value: `Rates trending ${mortgageTrendDirection}`,
      benchmark: 'Falling = favorable, Rising = unfavorable',
      impact: '+1 buy point',
      explanation: `Mortgage rates are trending downward, which increases buying power — lower rates mean lower monthly payments for the same loan amount`
    });
  } else if (mortgageTrendDirection === 'rising') {
    buyScore -= 1;
    factors.push('Mortgage rates trending up');
    reasoning.push({
      factor: 'Mortgage Rate Trend',
      value: `Rates trending ${mortgageTrendDirection}`,
      benchmark: 'Falling = favorable, Rising = unfavorable',
      impact: '-1 buy point',
      explanation: `Mortgage rates are trending upward, reducing buying power — each rate increase raises monthly payment costs and reduces how much home you can afford`
    });
  } else {
    reasoning.push({
      factor: 'Mortgage Rate Trend',
      value: 'Rates stable',
      benchmark: 'Falling = favorable, Rising = unfavorable',
      impact: '0 buy points (neutral)',
      explanation: 'Mortgage rates are stable with no clear direction — neither helping nor hurting buying conditions'
    });
  }

  if (populationGrowth > 2) {
    buyScore += 1;
    factors.push('Strong population growth');
    reasoning.push({
      factor: 'Population Growth (5yr)',
      value: `${populationGrowth.toFixed(1)}%`,
      benchmark: '>2% = strong demand driver, <-1% = declining',
      impact: '+1 buy point',
      explanation: `Population grew ${populationGrowth.toFixed(1)}% over 5 years — growing population drives housing demand and supports property values`
    });
  } else if (populationGrowth < -1) {
    buyScore -= 1;
    factors.push('Population decline');
    reasoning.push({
      factor: 'Population Growth (5yr)',
      value: `${populationGrowth.toFixed(1)}%`,
      benchmark: '>2% = strong demand driver, <-1% = declining',
      impact: '-1 buy point',
      explanation: `Population declined ${Math.abs(populationGrowth).toFixed(1)}% over 5 years — shrinking population reduces housing demand and can depress prices`
    });
  } else {
    reasoning.push({
      factor: 'Population Growth (5yr)',
      value: `${populationGrowth.toFixed(1)}%`,
      benchmark: '>2% = strong demand driver, <-1% = declining',
      impact: '0 buy points (neutral)',
      explanation: `Population change of ${populationGrowth.toFixed(1)}% is modest — not strongly affecting market timing in either direction`
    });
  }

  if (inventoryChange !== undefined) {
    if (inventoryChange > 20) {
      buyScore += 1;
      factors.push('Rising inventory (buyer leverage)');
      reasoning.push({
        factor: 'Housing Inventory Change',
        value: `+${inventoryChange.toFixed(1)}% increase`,
        benchmark: '>20% rise = buyer leverage, <-10% = seller leverage',
        impact: '+1 buy point',
        explanation: `Housing inventory increased ${inventoryChange.toFixed(1)}% — more homes on the market gives buyers negotiating power and more choices`
      });
    } else if (inventoryChange < -10) {
      buyScore -= 1;
      factors.push('Tight inventory (seller market)');
      reasoning.push({
        factor: 'Housing Inventory Change',
        value: `${inventoryChange.toFixed(1)}% decrease`,
        benchmark: '>20% rise = buyer leverage, <-10% = seller leverage',
        impact: '-1 buy point',
        explanation: `Housing inventory dropped ${Math.abs(inventoryChange).toFixed(1)}% — fewer homes on the market means more competition among buyers and less negotiating room`
      });
    } else {
      reasoning.push({
        factor: 'Housing Inventory Change',
        value: `${inventoryChange >= 0 ? '+' : ''}${inventoryChange.toFixed(1)}%`,
        benchmark: '>20% rise = buyer leverage, <-10% = seller leverage',
        impact: '0 buy points (neutral)',
        explanation: `Inventory change of ${inventoryChange.toFixed(1)}% is within normal range — not significantly favoring buyers or sellers`
      });
    }
  }

  let signal: 'buy' | 'wait' | 'caution';
  let confidence: number;

  if (buyScore >= 2) {
    signal = 'buy';
    confidence = Math.min(90, 60 + buyScore * 10);
  } else if (buyScore <= -1) {
    signal = 'caution';
    confidence = Math.min(90, 60 + Math.abs(buyScore) * 10);
  } else {
    signal = 'wait';
    confidence = 50;
  }

  return { signal, confidence, factors, reasoning, buyScore, maxScore };
}
