import type { MortgageRates } from "@shared/schema";
import { getLatestMortgageRate } from "./dataPipeline/fredDownloader";

export async function fetchMortgageRates(): Promise<MortgageRates> {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (apiKey) {
    try {
      const url = 'https://us-realtor.p.rapidapi.com/mortgage/rates';
      
      console.log('Fetching mortgage rates from US Realtor API');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey.trim(),
          'x-rapidapi-host': 'us-realtor.p.rapidapi.com'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Mortgage API response:', JSON.stringify(data, null, 2));
        return parseRatesResponse(data);
      }

      console.log(`Mortgage API returned ${response.status}, trying FRED fallback`);
    } catch (error) {
      console.error('Mortgage rates fetch error:', error);
    }
  }

  return getFredRatesOrDefault();
}

async function getFredRatesOrDefault(): Promise<MortgageRates> {
  try {
    const fredRate = await getLatestMortgageRate();
    if (fredRate && fredRate.rate > 0) {
      const rate30yr = Math.round(fredRate.rate * 100) / 100;
      console.log(`Using FRED cached mortgage rate: ${rate30yr}% (as of ${fredRate.date})`);
      return {
        thirtyYearFixed: rate30yr,
        fifteenYearFixed: Math.round((rate30yr - 0.70) * 100) / 100,
        fiveYearArm: Math.round((rate30yr - 0.40) * 100) / 100,
        jumbo: Math.round((rate30yr + 0.20) * 100) / 100,
        fha: Math.round((rate30yr - 0.30) * 100) / 100,
        va: Math.round((rate30yr - 0.60) * 100) / 100,
        lastUpdated: fredRate.date,
        source: 'FRED (Freddie Mac)'
      };
    }
  } catch (error) {
    console.error('FRED rate lookup failed:', error);
  }

  return getDefaultRates();
}

function parseRatesResponse(data: any): MortgageRates {
  try {
    const rates = data?.rates || data?.data?.rates || data;
    
    const rate30yr = rates?.rate30yr || rates?.thirtyYearFixed || rates?.['30yr_fixed'] || null;
    const rate15yr = rates?.rate15yr || rates?.fifteenYearFixed || rates?.['15yr_fixed'] || null;
    const rate5yrArm = rates?.rate5yrArm || rates?.fiveYearArm || rates?.['5yr_arm'] || null;
    const rateJumbo = rates?.rateJumbo || rates?.jumbo || rates?.jumbo30yr || null;
    const rateFha = rates?.rateFha || rates?.fha || rates?.fha30yr || null;
    const rateVa = rates?.rateVa || rates?.va || rates?.va30yr || null;

    return {
      thirtyYearFixed: rate30yr ? parseFloat(rate30yr) : 6.85,
      fifteenYearFixed: rate15yr ? parseFloat(rate15yr) : 6.15,
      fiveYearArm: rate5yrArm ? parseFloat(rate5yrArm) : 6.45,
      jumbo: rateJumbo ? parseFloat(rateJumbo) : 7.05,
      fha: rateFha ? parseFloat(rateFha) : 6.55,
      va: rateVa ? parseFloat(rateVa) : 6.25,
      lastUpdated: new Date().toISOString(),
      source: 'US Realtor API'
    };
  } catch (error) {
    console.error('Error parsing mortgage rates:', error);
    return getDefaultRates();
  }
}

function getDefaultRates(): MortgageRates {
  return {
    thirtyYearFixed: 6.85,
    fifteenYearFixed: 6.15,
    fiveYearArm: 6.45,
    jumbo: 7.05,
    fha: 6.55,
    va: 6.25,
    lastUpdated: new Date().toISOString(),
    source: 'Current market estimates'
  };
}

export interface MortgageCalculation {
  monthlyPayment: number;
  principalAndInterest: number;
  propertyTax: number;
  homeInsurance: number;
  pmi: number;
  totalInterest: number;
  totalPayment: number;
  loanAmount: number;
  downPaymentAmount: number;
}

export function calculateMortgage(
  homePrice: number,
  downPaymentPercent: number,
  interestRate: number,
  loanTermYears: number,
  propertyTaxRate: number = 1.1,
  homeInsuranceYearly: number = 1200,
  includePmi: boolean = true
): MortgageCalculation {
  const downPaymentAmount = (homePrice * downPaymentPercent) / 100;
  const loanAmount = homePrice - downPaymentAmount;
  
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;
  
  let principalAndInterest: number;
  if (monthlyRate === 0) {
    principalAndInterest = loanAmount / numberOfPayments;
  } else {
    principalAndInterest = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  }
  
  const propertyTax = (homePrice * (propertyTaxRate / 100)) / 12;
  
  const homeInsurance = homeInsuranceYearly / 12;
  
  let pmi = 0;
  if (includePmi && downPaymentPercent < 20) {
    pmi = (loanAmount * 0.005) / 12;
  }
  
  const monthlyPayment = principalAndInterest + propertyTax + homeInsurance + pmi;
  
  const totalInterest = (principalAndInterest * numberOfPayments) - loanAmount;
  const totalPayment = monthlyPayment * numberOfPayments;
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    principalAndInterest: Math.round(principalAndInterest * 100) / 100,
    propertyTax: Math.round(propertyTax * 100) / 100,
    homeInsurance: Math.round(homeInsurance * 100) / 100,
    pmi: Math.round(pmi * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    loanAmount: Math.round(loanAmount * 100) / 100,
    downPaymentAmount: Math.round(downPaymentAmount * 100) / 100
  };
}
