import type { MortgageRates } from "@shared/schema";
import { getLatestMortgageRate } from "./dataPipeline/fredDownloader";

const FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=";
const CACHE_MS = 6 * 60 * 60 * 1000; // Freddie Mac publishes weekly; refresh a few times a day
let cached: { at: number; rates: MortgageRates } | null = null;

// Latest value of a FRED series from its public CSV (no API key needed).
async function latestFredValue(seriesId: string): Promise<{ date: string; rate: number } | null> {
  const res = await fetch(FRED_CSV + seriesId, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`FRED ${seriesId} returned ${res.status}`);
  const lines = (await res.text()).trim().split(/\r?\n/).slice(1);
  for (let i = lines.length - 1; i >= 0; i--) {
    const [date, value] = lines[i].split(",");
    const rate = parseFloat(value);
    if (date && Number.isFinite(rate) && rate > 0) return { date: date.trim(), rate };
  }
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function ratesFrom30(rate30: number, date: string, rate15?: number): MortgageRates {
  return {
    thirtyYearFixed: round2(rate30),
    fifteenYearFixed: round2(rate15 ?? rate30 - 0.70),
    fiveYearArm: round2(rate30 - 0.40),
    jumbo: round2(rate30 + 0.20),
    fha: round2(rate30 - 0.30),
    va: round2(rate30 - 0.60),
    lastUpdated: date,
    source: "Freddie Mac weekly survey (FRED)",
  };
}

export async function fetchMortgageRates(): Promise<MortgageRates> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rates;
  try {
    const [r30, r15] = await Promise.all([
      latestFredValue("MORTGAGE30US"),
      latestFredValue("MORTGAGE15US").catch(() => null),
    ]);
    if (r30) {
      const rates = ratesFrom30(r30.rate, r30.date, r15?.rate);
      cached = { at: Date.now(), rates };
      return rates;
    }
  } catch (error) {
    console.error("FRED mortgage rate fetch failed:", error);
  }
  return getFredRatesOrDefault();
}

async function getFredRatesOrDefault(): Promise<MortgageRates> {
  try {
    const fredRate = await getLatestMortgageRate();
    if (fredRate && fredRate.rate > 0) return ratesFrom30(fredRate.rate, fredRate.date);
  } catch (error) {
    console.error("FRED rate lookup failed:", error);
  }
  return getDefaultRates();
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
