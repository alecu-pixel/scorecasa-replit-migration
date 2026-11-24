import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, GraduationCap, Shield, MapPin, DollarSign, Home, Lightbulb as Sparkles, Clock, Target, LineChart, Building } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useLocation } from 'wouter';
import Logo from '@/components/Logo';
import ScoreDisplay from '@/components/ScoreDisplay';
import InvestmentAnalysisDisplay from '@/components/InvestmentAnalysisDisplay';
import MetricCard from '@/components/MetricCard';
import DemographicsDisplay from '@/components/DemographicsDisplay';
import WalkabilityDisplay from '@/components/WalkabilityDisplay';
import MarketDataDisplay from '@/components/MarketDataDisplay';
import SchoolsDisplay from '@/components/SchoolsDisplay';
import PropertyListings from '@/components/PropertyListings';
import MapView from '@/components/MapView';
import PdfExportButton from '@/components/PdfExportButton';
import MortgageCalculator from '@/components/MortgageCalculator';
import InvestmentCalculators from '@/components/InvestmentCalculators';
import ComparableSales from '@/components/ComparableSales';
import FloodRisk from '@/components/FloodRisk';
import EnvironmentalRisk from '@/components/EnvironmentalRisk';
import SeismicRisk from '@/components/SeismicRisk';
import JobsProximity from '@/components/JobsProximity';
import AppreciationOutlook from '@/components/AppreciationOutlook';
import EnhancedSafetyScore from '@/components/EnhancedSafetyScore';
import AffordabilityMetrics from '@/components/AffordabilityMetrics';
import { ConfidenceBadge, ForecastRange, SourceAgreement, DataDisclaimer, buildCrossValidationSignals } from '@/components/DataConfidence';
import type { PropertyAnalysisResult } from '@shared/schema';

const demoData: PropertyAnalysisResult = {
  address: "1600 Congress Ave, Austin, TX 78701",
  zipCode: "78701",
  fipsCode: "48453",
  score: 7.8,
  scoreBreakdown: [
    { label: "Market Strength", score: 82, weight: 0.20, reasoning: [
      { factor: "Average Days on Market", value: "23 days", benchmark: "<30 days = hot, 30-60 = healthy, >90 = slow", impact: "26 of 30 pts", explanation: "Properties sell in just 23 days on average — strong buyer demand is driving quick sales in downtown Austin" },
      { factor: "Homeownership Rate", value: "44.2%", benchmark: "60-75%+ (stable neighborhoods)", impact: "3 of 25 pts", explanation: "Low homeownership rate of 44.2% reflects Austin's urban core rental market" },
      { factor: "Vacancy Rate", value: "6.8%", benchmark: "<5% = tight, 5-10% = healthy, >12% = concerning", impact: "20 of 25 pts", explanation: "Vacancy rate of 6.8% is within healthy range for most markets" },
      { factor: "1-Year Home Value Forecast", value: "+4.2%", benchmark: "3-8%+ growth = strong appreciation", impact: "11 of 15 pts", explanation: "Home values are projected to grow 4.2% over the next year — strong appreciation expected" },
    ]},
    { label: "Demographic Trends", score: 88, weight: 0.20, reasoning: [
      { factor: "Median Household Income", value: "$89,500", benchmark: "$50,000-$100,000+ (national range)", impact: "+15 of 20 pts", explanation: "High income area ($89,500) indicates strong purchasing power and economic stability" },
      { factor: "Employment Rate", value: "94.2%", benchmark: "85-95%+ (healthy range)", impact: "+6 of 8 pts", explanation: "Strong employment rate of 94.2% signals a robust local economy" },
      { factor: "College Education Rate", value: "68.5%", benchmark: "25-50%+ (US avg ~33%)", impact: "+10 of 10 pts", explanation: "Highly educated area (68.5% college-educated) correlates with higher property values" },
      { factor: "5-Year Growth Trends", value: "8.2% avg", benchmark: "2-10%+ (population, income, housing)", impact: "+7 of 10 pts", explanation: "Population grew 4.5%, incomes changed 12.8%, housing stock changed 7.2% over 5 years. Strong growth signals rising demand" },
    ]},
    { label: "School Quality", score: 84, weight: 0.15, reasoning: [
      { factor: "Average Star Rating", value: "4.3 / 5 stars", benchmark: "3.0 = average, 4.0+ = strong", impact: "Base score: 86/100", explanation: "Above-average school quality drives family demand and property values" },
      { factor: "Graduation Rate", value: "91.2%", benchmark: "85-95%+ (strong)", impact: "+6 bonus pts", explanation: "High graduation rate of 91.2% signals quality education outcomes" },
    ]},
    { label: "Safety Score", score: 71, weight: 0.15, reasoning: [
      { factor: "Poverty Rate", value: "12.3%", benchmark: "<5% = very safe, 10-20% = moderate, >20% = elevated risk", impact: "-20 pts (penalty)", explanation: "Moderate poverty rate of 12.3% indicates some economic stress in the area" },
      { factor: "Property Abandonment Rate", value: "3.2%", benchmark: "<5% = good, >20% = neighborhood decline", impact: "No penalty", explanation: "Minimal property abandonment (3.2%) indicates a well-maintained neighborhood" },
      { factor: "Overall Vacancy Rate", value: "6.8%", benchmark: "<10% = healthy, >15% = concern", impact: "No penalty", explanation: "Low vacancy rate of 6.8% indicates an occupied, active community" },
    ]},
    { label: "Walkability", score: 90, weight: 0.15, reasoning: [
      { factor: "Nearby Amenities", value: "67 found", benchmark: "15-30+ within walking distance", impact: "Walk Score: 90/100", explanation: "67 amenities nearby makes this a very walkable area — grocery stores, restaurants, and services are easily accessible on foot" },
    ]},
    { label: "Rental Potential", score: 76, weight: 0.15, reasoning: [
      { factor: "Rent-to-Price Ratio", value: "0.62% ($1,450/mo rent, $282,000 home value)", benchmark: "0.8-1.0%+ (1% Rule = excellent)", impact: "+15 of 30 pts", explanation: "Moderate rental yield of 0.62% — rent of $1,450 against $282,000 home value is below the 1% rule target" },
      { factor: "Renter Population", value: "55.8% renters", benchmark: "30-50% = ideal rental market", impact: "+15 of 20 pts", explanation: "High renter population (55.8%) shows strong rental demand, but may indicate affordability issues" },
      { factor: "1-Year Rent Growth Forecast", value: "+3.1%", benchmark: "2-5%+ = strong growth", impact: "+12 of 15 pts", explanation: "Rents projected to grow 3.1% in the next year — strong upward trajectory improves rental income potential" },
    ]},
  ],
  demographics: {
    medianIncome: 89500,
    population: 15842,
    employmentRate: 94.2,
    collegeDegreePct: 68.5,
    housingUnits: 9250,
    zipName: "Austin Downtown, TX",
    povertyRate: 12.3,
    vacancyRate: 6.8,
    abandonmentRate: 1.2,
    medianRent: 1850,
    ownerOccupiedPct: 42.5,
    renterOccupiedPct: 57.5,
    medianYearBuilt: 2008,
    medianHomeValue: 485000,
    highValueHomeCount: 1240,
    highValueHomePer1000: 82.5,
    professionalEmploymentPct: 58.3,
    populationGrowth5yr: 12.4,
    incomeGrowth5yr: 18.2,
    housingGrowth5yr: 14.8,
  },
  walkability: {
    walkScore: 90,
    transitScore: 72,
    bikeScore: 85,
    amenityCount: 347,
    amenities: [
      { name: "Whole Foods Market", type: "node", category: "Groceries", distance: 0.2 },
      { name: "Austin Public Library", type: "way", category: "Libraries", distance: 0.3 },
      { name: "Starbucks", type: "node", category: "Coffee Shops", distance: 0.15 },
      { name: "The Domain", type: "way", category: "Shopping Centers", distance: 0.4 },
      { name: "Zilker Park", type: "way", category: "Parks", distance: 1.2 },
      { name: "Austin Convention Center", type: "way", category: "Entertainment", distance: 0.5 },
      { name: "Dell Seton Medical Center", type: "way", category: "Hospitals", distance: 0.8 },
      { name: "Austin Metro Station", type: "node", category: "Public Transit", distance: 0.2 },
      { name: "Barton Creek Greenbelt", type: "way", category: "Recreation", distance: 1.1 },
      { name: "Austin Fitness Center", type: "node", category: "Fitness", distance: 0.3 },
    ],
    lat: 30.2747,
    lon: -97.7403,
  },
  propertyListings: {
    listings: [
      { property_id: "demo-1", listing_id: "l1", address: "1502 Congress Ave", city: "Austin", state_code: "TX", postal_code: "78701", price: 479000, beds: 2, baths: 2, sqft: 1350, prop_type: "Condo", photo_url: null, lat: 30.2732, lon: -97.7410, daysOnZillow: 18 },
      { property_id: "demo-2", listing_id: "l2", address: "310 Colorado St #404", city: "Austin", state_code: "TX", postal_code: "78701", price: 525000, beds: 2, baths: 2, sqft: 1480, prop_type: "Condo", photo_url: null, lat: 30.2665, lon: -97.7440, daysOnZillow: 25 },
      { property_id: "demo-3", listing_id: "l3", address: "800 Brazos St #1201", city: "Austin", state_code: "TX", postal_code: "78701", price: 445000, beds: 1, baths: 1, sqft: 980, prop_type: "Condo", photo_url: null, lat: 30.2710, lon: -97.7425, daysOnZillow: 42 },
      { property_id: "demo-4", listing_id: "l4", address: "222 E 5th St", city: "Austin", state_code: "TX", postal_code: "78701", price: 549000, beds: 3, baths: 2, sqft: 1650, prop_type: "Townhouse", photo_url: null, lat: 30.2670, lon: -97.7395, daysOnZillow: 12 },
      { property_id: "demo-5", listing_id: "l5", address: "98 San Jacinto Blvd #1805", city: "Austin", state_code: "TX", postal_code: "78701", price: 399000, beds: 1, baths: 1, sqft: 875, prop_type: "Condo", photo_url: null, lat: 30.2640, lon: -97.7415, daysOnZillow: 55 },
      { property_id: "demo-6", listing_id: "l6", address: "555 E 6th St #210", city: "Austin", state_code: "TX", postal_code: "78701", price: 510000, beds: 2, baths: 2, sqft: 1400, prop_type: "Condo", photo_url: null, lat: 30.2680, lon: -97.7350, daysOnZillow: 30 },
    ],
    total_count: 127,
    median_price: 485000,
    avg_price: 512000,
    avg_days_on_market: 32,
  },
  marketData: {
    zipCode: "78701",
    medianHomeValue: 485000,
    medianRent: 1850,
    homeownershipRate: 42.5,
    totalHousingUnits: 9250,
    occupiedUnits: 8621,
    vacantUnits: 629,
    vacancyRate: 6.8,
  },
  forecastData: {
    homeValueForecast: {
      currentValue: 485000,
      forecastedValue: 504400,
      forecastGrowth: 4.0,
      forecastDate: "January 2027",
      regionName: "Austin, TX",
      regionType: "Metro",
      dataSource: "Zillow Research Data"
    },
    rentForecast: {
      currentRent: 1850,
      forecastedRent: 1905,
      forecastGrowth: 3.0,
      forecastDate: "January 2027",
      regionName: "Austin, TX",
      regionType: "Metro",
      dataSource: "Zillow Research Data"
    },
    marketVelocity: {
      daysToPending: 18,
      daysToClose: 42,
      saleToListRatio: 0.985,
      inventoryLevel: "low",
      marketSpeed: "fast",
      dataSource: "Zillow Research Data"
    },
    rentalEstimate: {
      estimatedRent: 2150,
      rentRangeLow: 1950,
      rentRangeHigh: 2400,
      comparableCount: 12,
      dataSource: "RentCast API"
    }
  },
  schools: {
    schools: [
      {
        school_id: "sd-1",
        name: "Austin High School",
        address: "1715 W Cesar Chavez St, Austin, TX 78703",
        latitude: 30.2697,
        longitude: -97.7628,
        distance_miles: 1.2,
        charter: false,
        magnet: false,
        grades: "9-12",
        enrollment: 2145,
        free_reduced_lunch_pct: 35,
        poverty_pct: 0,
        reading_proficiency: 0,
        math_proficiency: 0,
        overall_score: 8.2,
        star_rating: 4,
        state_rank: 245,
        state_rank_of: 1842,
        state_percentile: 87,
        student_teacher_ratio: 16.2,
        school_level: "High",
        district_name: "Austin ISD",
        graduation_rate: 92.5,
        chronic_absenteeism_rate: 11.2,
        spending_per_pupil: 12450,
        is_title_i: false,
        is_virtual: false,
        county: "Travis",
        phone: "(512) 414-2505",
        url: "https://www.austinisd.org/schools/austin-high"
      },
      {
        school_id: "sd-2",
        name: "O. Henry Middle School",
        address: "2610 W 10th St, Austin, TX 78703",
        latitude: 30.2756,
        longitude: -97.7612,
        distance_miles: 1.5,
        charter: false,
        magnet: false,
        grades: "6-8",
        enrollment: 867,
        free_reduced_lunch_pct: 28,
        poverty_pct: 0,
        reading_proficiency: 0,
        math_proficiency: 0,
        overall_score: 7.8,
        star_rating: 4,
        state_rank: 512,
        state_rank_of: 2156,
        state_percentile: 76,
        student_teacher_ratio: 14.8,
        school_level: "Middle",
        district_name: "Austin ISD",
        chronic_absenteeism_rate: 9.8,
        spending_per_pupil: 11890,
        is_title_i: false,
        is_virtual: false,
        county: "Travis",
        phone: "(512) 414-3254",
        url: "https://www.austinisd.org/schools/ohenry"
      },
      {
        school_id: "sd-3",
        name: "Bryker Woods Elementary",
        address: "3309 Kerbey Ln, Austin, TX 78703",
        latitude: 30.2991,
        longitude: -97.7545,
        distance_miles: 2.1,
        charter: false,
        magnet: false,
        grades: "K-5",
        enrollment: 412,
        free_reduced_lunch_pct: 15,
        poverty_pct: 0,
        reading_proficiency: 0,
        math_proficiency: 0,
        overall_score: 9.1,
        star_rating: 5,
        state_rank: 89,
        state_rank_of: 4521,
        state_percentile: 98,
        student_teacher_ratio: 12.5,
        school_level: "Elementary",
        district_name: "Austin ISD",
        chronic_absenteeism_rate: 6.5,
        spending_per_pupil: 13200,
        is_title_i: false,
        is_virtual: false,
        county: "Travis",
        phone: "(512) 414-2039",
        url: "https://www.austinisd.org/schools/brykerwoods"
      }
    ],
    average_score: 8.4,
    top_school_score: 9.1,
    schools_within_5_miles: 24,
    data_source: 'schooldigger',
    average_star_rating: 4.3,
    top_star_rating: 5,
    average_state_percentile: 87,
    average_graduation_rate: 92.5,
    average_spending_per_pupil: 12513,
    average_absenteeism_rate: 9.2
  },
  investmentAnalysis: {
    phases: [
      {
        title: "Strong Urban Growth Market",
        description: "Austin's downtown area shows robust economic indicators with 18.2% income growth and 12.4% population growth over the past 5 years. The neighborhood has a highly educated population (68.5% college degree) and strong professional employment (58.3%), suggesting a stable tenant base for rental properties."
      },
      {
        title: "Premium Location with Walkability",
        description: "With a Walk Score of 90 and 347 nearby amenities, this location offers exceptional urban convenience. Proximity to major employers, entertainment, shopping, and public transit makes it attractive for both owner-occupants and renters seeking a car-optional lifestyle."
      },
      {
        title: "Balanced Investment Opportunity",
        description: "The 57.5% renter-occupied rate indicates strong rental demand, while the median rent of $1,850 provides moderate cash flow potential. Properties in this area benefit from Austin's tech-driven economy and ongoing urban development, though investors should account for the competitive market (32 days on market average)."
      }
    ],
    pros: [
      "Exceptional walkability with 347 nearby amenities",
      "Strong income growth (18.2% over 5 years)",
      "Highly educated population (68.5% college degrees)",
      "Robust employment rate (94.2%)",
      "Fast-moving market (32 days on average)",
      "Growing population (12.4% 5-year growth)"
    ],
    cons: [
      "Higher vacancy rate (6.8%) compared to national average",
      "Moderate poverty rate (12.3%)",
      "Competitive pricing with median home value at $485K",
      "Renter-heavy market may have higher turnover",
      "Lower school scores (75 average) compared to suburban areas"
    ]
  },
  crimeData: {
    stateAbbr: "TX",
    stateName: "Texas",
    year: 2022,
    population: 30029572,
    violentCrimeRate: 446.5,
    propertyCrimeRate: 2456.8,
    violentCrimeTotal: 134120,
    propertyCrimeTotal: 737682,
    murderRate: 6.1,
    robberyRate: 84.2,
    assaultRate: 285.3,
    burglaryRate: 412.5,
    larcenyRate: 1732.6,
    motorVehicleTheftRate: 311.7,
    nationalViolentCrimeRate: 380.7,
    nationalPropertyCrimeRate: 1958.2,
    violentCrimeVsNational: 17.3,
    propertyCrimeVsNational: 25.5,
    safetyScore: 71,
  },
  enrichedCrimeData: {
    zipCode: "78701",
    stateAbbr: "TX",
    stateName: "Texas",
    lat: 30.2747,
    lng: -97.7404,
    nearbyZips: [
      { zipCode: "78702", state: "TX", overallGrade: "C+", violentCrimeGrade: "C", propertyCrimeGrade: "C+", overallScore: 78, gradeColor: "#eab308" },
      { zipCode: "78703", state: "TX", overallGrade: "A-", violentCrimeGrade: "A", propertyCrimeGrade: "B+", overallScore: 92, gradeColor: "#22c55e" },
      { zipCode: "78704", state: "TX", overallGrade: "B", violentCrimeGrade: "B", propertyCrimeGrade: "B-", overallScore: 85, gradeColor: "#84cc16" },
      { zipCode: "78705", state: "TX", overallGrade: "C", violentCrimeGrade: "C-", propertyCrimeGrade: "C+", overallScore: 75, gradeColor: "#eab308" },
      { zipCode: "78721", state: "TX", overallGrade: "D+", violentCrimeGrade: "D", propertyCrimeGrade: "D+", overallScore: 68, gradeColor: "#f97316" },
      { zipCode: "78751", state: "TX", overallGrade: "B-", violentCrimeGrade: "B", propertyCrimeGrade: "C+", overallScore: 82, gradeColor: "#84cc16" },
    ],
    zipLevelData: {
      available: true,
      overallGrade: "B",
      overallScore: 85,
      violentCrimeGrade: "B+",
      violentCrimeScore: 88,
      propertyCrimeGrade: "B",
      propertyCrimeScore: 85,
      gradeLabel: "Safe",
      gradeColor: "#84cc16",
      dataYear: 2023
    },
    stateLevelData: {
      available: true,
      violentCrimeRate: 446.5,
      propertyCrimeRate: 2456.8,
      violentCrimeVsNational: 17.3,
      propertyCrimeVsNational: 25.5,
      violentCrimeComparison: "17% above national average",
      propertyCrimeComparison: "26% above national average",
      murderRate: 6.1,
      robberyRate: 84.2,
      assaultRate: 285.3,
      burglaryRate: 412.5,
      larcenyRate: 1732.6,
      motorVehicleTheftRate: 311.7,
      dataYear: 2022
    },
    nationalBenchmarks: {
      available: true,
      violentVictimizationRate: 22.5,
      propertyVictimizationRate: 101.4,
      crimeTypeBreakdowns: [
        { type: 'homicide', label: 'Homicide', nationalRate: 6.1, description: 'Murder and non-negligent manslaughter' },
        { type: 'robbery', label: 'Robbery', nationalRate: 68.2, description: 'Taking property by force or threat' },
        { type: 'assault', label: 'Aggravated Assault', nationalRate: 244.8, description: 'Attack with intent to cause serious harm' },
        { type: 'burglary', label: 'Burglary', nationalRate: 271.5, description: 'Unlawful entry to commit a crime' },
        { type: 'larceny', label: 'Larceny/Theft', nationalRate: 1398.5, description: 'Theft of property without force' },
        { type: 'motorVehicleTheft', label: 'Motor Vehicle Theft', nationalRate: 318.3, description: 'Theft or attempted theft of a vehicle' }
      ],
      dataYear: 2023
    },
    compositeSafetyScore: 78,
    safetyLabel: "Safe",
    safetyColor: "#84cc16",
    dataSources: {
      zipCode: 'rapidapi',
      state: 'cached',
      national: 'nibrs'
    },
    summary: {
      headline: "Safety Grade: B",
      description: "This ZIP code has a good safety rating with crime rates below average.",
      keyInsights: [
        "Low violent crime rate",
        "Moderate property crime rate",
        "State violent crime 17% above national avg"
      ]
    }
  },
  estimatedPropertyPrice: {
    price: 485000,
    source: 'median',
    sourceDescription: 'Based on median listing price in the area'
  },
  affordabilityData: {
    mortgageTrends: {
      currentRate: 6.89,
      previousWeekRate: 6.97,
      previousMonthRate: 7.02,
      previousYearRate: 7.31,
      weekOverWeekChange: -0.08,
      monthOverMonthChange: -0.13,
      yearOverYearChange: -0.42,
      trendDirection: 'falling',
      trendStrength: 'moderate',
      historicalAverage: 5.8,
      vsHistoricalAverage: 1.09,
      rateOutlook: 'Rates are trending downward and above historical average. Favorable conditions for buyers.',
      lastUpdated: '2026-01-28',
      dataSource: 'FRED (Federal Reserve Economic Data)',
      historicalRates: [
        { date: '2025-02-01', rate: 7.31 },
        { date: '2025-03-01', rate: 7.28 },
        { date: '2025-04-01', rate: 7.15 },
        { date: '2025-05-01', rate: 7.08 },
        { date: '2025-06-01', rate: 7.12 },
        { date: '2025-07-01', rate: 7.05 },
        { date: '2025-08-01', rate: 6.98 },
        { date: '2025-09-01', rate: 7.02 },
        { date: '2025-10-01', rate: 6.95 },
        { date: '2025-11-01', rate: 6.92 },
        { date: '2025-12-01', rate: 6.97 },
        { date: '2026-01-01', rate: 6.89 }
      ]
    },
    overvaluation: {
      valueToIncomeRatio: 5.4,
      nationalAverageRatio: 4.8,
      historicalAverageRatio: 4.2,
      overvaluationPercent: 28.6,
      overvaluationLabel: 'overvalued',
      overvaluationColor: '#f97316',
      riskLevel: 'medium',
      insight: 'Prices are 29% above historical norms relative to income. Consider negotiating or waiting for corrections.'
    },
    buyVsRent: {
      monthlyMortgagePayment: 2850,
      monthlyRent: 1850,
      buyVsRentRatio: 1.54,
      buyVsRentDifferential: 54.1,
      recommendation: 'rent',
      recommendationStrength: 'moderate',
      breakEvenYears: 6.2,
      insight: 'Renting is currently more cost-effective. Consider renting while building savings for a larger down payment.'
    },
    propertyTax: {
      estimatedAnnualTax: 9700,
      estimatedMonthlyTax: 808,
      effectiveTaxRate: 2.0,
      stateTaxRateAverage: 1.6,
      vsStateAverage: '25% above state average',
      taxBurdenLevel: 'high',
      insight: 'Texas has no income tax but higher property taxes. Factor this into your total housing costs.'
    },
    affordabilityScore: {
      score: 5.8,
      label: 'Moderate',
      color: '#eab308',
      monthlyPaymentToIncome: 38.2,
      salaryNeededToAfford: 112500,
      affordabilityGap: -23000,
      isAffordableForMedianIncome: false,
      insight: 'Housing costs require 38% of median income, above the recommended 28% threshold.'
    },
    fairMarketRent: {
      fmr: {
        zipCode: '78701',
        countyName: 'Travis County',
        stateCode: 'TX',
        fiscalYear: 2025,
        efficiency: 1150,
        oneBedroom: 1380,
        twoBedroom: 1720,
        threeBedroom: 2180,
        fourBedroom: 2650,
        smallAreaFMR: false,
        metroPrimaryEstimate: true,
        source: 'hud_api'
      },
      marketRent: 1850,
      fmrVsMarket: -7.0,
      section8Viable: true,
      section8Insight: 'FMR covers approximately 93% of market rent. Viable for Section 8 with minimal gap.',
      rentalStrategyRecommendation: 'FMR is close to market rent. Section 8 may be a viable rental strategy with minimal rent discount.'
    },
    buildingPermits: {
      stateCode: 'TX',
      stateName: 'Texas',
      year: 2025,
      month: 12,
      totalUnits: 8542,
      singleFamilyUnits: 2156,
      multiFamilyUnits: 6386,
      yearOverYearChange: 12.4,
      permitTrend: 'increasing',
      supplyOutlook: 'expanding',
      constructionActivityLevel: 'high',
      insight: 'Strong construction activity indicates a growing market with new supply coming online.',
      source: 'census_api'
    },
    employment: {
      stateCode: 'TX',
      stateName: 'Texas',
      unemploymentRate: 4.1,
      laborForceParticipation: 64.2,
      employmentGrowthYoY: 2.8,
      nationalUnemploymentRate: 4.2,
      vsNationalUnemployment: -0.1,
      jobMarketStrength: 'strong',
      jobMarketScore: 8.2,
      topIndustries: ['Technology', 'Healthcare', 'Government'],
      economicOutlook: 'Texas continues to lead in job growth with a diversified economy and strong tech sector presence.',
      insight: 'State unemployment is below national average with strong job market indicators.',
      lastUpdated: '2026-01-28',
      source: 'bls_api'
    },
    marketTimingSignal: {
      signal: 'wait',
      confidence: 68,
      factors: ['Rates declining', 'Prices elevated', 'Strong job market', 'High inventory growth'],
      buyScore: 2,
      maxScore: 5,
      reasoning: [
        { factor: 'Price Valuation', value: '+18.3% overvalued', benchmark: '<0% = undervalued, 0-20% = reasonable, >20% = overvalued', impact: '+1 pt', explanation: 'Prices are 18.3% above historical norms but still within a reasonable range (value-to-income ratio: 4.8x vs national avg 4.0x)' },
        { factor: 'Mortgage Rate Trend', value: 'Falling (6.8% -> 6.5%)', benchmark: 'Falling = favorable, Rising = unfavorable', impact: '+1 pt', explanation: 'Mortgage rates are trending downward, which increases buying power - lower rates mean lower monthly payments for the same loan amount' },
        { factor: 'Population Growth (5yr)', value: '+4.5%', benchmark: '>2% = strong growth', impact: '+1 pt', explanation: 'Population grew 4.5% over 5 years - growing population drives housing demand and supports property values' },
        { factor: 'Inventory Change', value: '+8.2%', benchmark: '>5% increase = more supply, more negotiating power', impact: '-1 pt', explanation: 'Housing inventory increased 8.2% - rising inventory gives buyers more choices but may signal cooling demand' },
      ]
    },
    investmentGrade: {
      grade: 'B',
      score: 74,
      summary: 'Good investment potential with strong economic fundamentals, though valuations are stretched.'
    },
    dataCompleteness: {
      tier1Complete: true,
      tier2Complete: true,
      dataSources: ['FRED (Federal Reserve)', 'US Census Bureau ACS', 'HUD Fair Market Rent', 'Census Building Permits', 'BLS Employment Data']
    }
  },
  floodRisk: {
    floodZone: 'X',
    floodZoneSubType: null,
    riskLevel: 'minimal',
    riskLabel: 'Minimal Risk',
    description: 'Areas outside the 500-year floodplain. Low risk of flooding, though localized flooding can still occur.',
    color: '#22c55e',
    insuranceRequired: false,
    isSpecialFloodHazardArea: false,
    baseFloodElevation: null,
    floodScore: 95,
    estimatedInsurance: {
      annual: 485,
      monthly: 40,
      note: 'Flood insurance is not required but may be recommended. Private flood policies are often available at lower cost.',
    },
    dataSource: 'FEMA National Flood Hazard Layer (NFHL)',
    lat: 30.2747,
    lon: -97.7403,
  },
  environmentalRisk: {
    riskScore: 32,
    riskLevel: 'low',
    riskLabel: 'Low Environmental Risk',
    pm25Percentile: 38,
    ozonePercentile: 45,
    dieselPmPercentile: 41,
    superfundProximity: false,
    superfundProxPercentile: 12,
    wastewater: false,
    airQualityIndex: 42,
    usAqi: 42,
    pm25Concentration: 6.2,
    ozoneConcentration: 88,
    no2Concentration: 8.4,
    insight: 'Air quality is good near this property. The current US AQI reads 42 (Good), with PM2.5 at 6.2 μg/m³ — well below EPA\'s annual standard of 12 μg/m³.',
    keyRisks: [],
    dataSource: 'EPA AirNow (Houston)',
    lat: 30.2747,
    lon: -97.7403,
  },
  seismicRisk: {
    pga: 2.1,
    riskLevel: 'very_low',
    riskLabel: 'Very Low Seismic Risk',
    affectedRegion: 'Austin, TX',
    insight: 'Central Texas sits on a stable geologic platform with negligible earthquake activity. No active fault lines are in the vicinity. Standard construction is fully adequate.',
    lat: 30.2747,
    lon: -97.7403,
    dataSource: 'USGS National Seismic Hazard Maps (ASCE 7-22)',
  },
  jobsProximity: {
    censusTract: '48453001100',
    totalJobs: 12450,
    jobDensity: 'high',
    jobDensityLabel: 'High Employment Center',
    topSectors: [
      { name: 'Professional & Technical Services', jobs: 3210 },
      { name: 'Healthcare & Social Assistance', jobs: 2180 },
      { name: 'Finance & Insurance', jobs: 1890 },
      { name: 'Information & Technology', jobs: 1540 },
      { name: 'Retail Trade', jobs: 980 },
    ],
    insight: 'Strong employment hub with 12,450 jobs, primarily in Professional & Technical Services and Healthcare. High job density supports strong rental demand, lower vacancy risk, and sustained property values.',
    dataSource: 'Census LEHD/LODES 2021',
    dataYear: 2021,
  },
  apiStatus: {
    census: 'success',
    growth: 'success',
    walkability: 'success',
    propertyListings: 'success',
    marketData: 'success',
    schools: 'success',
    crimeData: 'success',
    affordability: 'success',
    floodRisk: 'success',
    jobsProximity: 'success',
  },
};

export default function Demo() {
  const [, setLocation] = useLocation();
  const [scoringMode, setScoringMode] = useState<'homebuyer' | 'investor'>('homebuyer');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-auto" />
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-white/10"
                onClick={() => setLocation('/')} 
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
              <Button 
                className="btn-gradient-purple"
                onClick={() => setLocation('/pricing')} 
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Demo Banner */}
        <section className="py-8">
          <div className="glass-card p-6 text-center rounded-lg border-cyan-500/30 glow-cyan-sm">
            <Badge className="mb-3 bg-purple-400 text-gray-950 border-0" data-testid="badge-demo">
              <Sparkles className="w-3 h-3 mr-1" />
              Sample report
            </Badge>
            <h2 className="text-2xl font-bold mb-2 text-white">What a ScoreCasa report looks like</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              This is a real-format example. Your report for any U.S. address has the same sections, filled in with current data from the Census Bureau, FEMA, USGS, Zillow Research, OpenStreetMap and more.
            </p>
          </div>
        </section>

        {/* PDF Export Target - wraps report content */}
        <div id="demo-report">
        {/* Address Header */}
        <section className="pb-8">
          <div className="flex items-start gap-3 glass-card p-6 rounded-lg border-gray-700/50">
            <MapPin className="w-6 h-6 text-cyan-400 icon-glow mt-1" />
            <div>
              <h3 className="text-2xl font-semibold text-white" data-testid="text-address">{demoData.address}</h3>
              <p className="text-sm text-gray-400 mt-1">ZIP Code: {demoData.zipCode}</p>
            </div>
          </div>
        </section>

        {/* Score Display */}
        <section className="pb-8">
          <ScoreDisplay
            score={demoData.score}
            scoreBreakdown={demoData.scoreBreakdown}
            onModeChange={setScoringMode}
          />
        </section>

        {/* Market Forecasts - NEW */}
        {demoData.forecastData && (
          <section className="pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-purple-400 text-gray-950 border-0">
                <LineChart className="w-3 h-3 mr-1" />
                NEW
              </Badge>
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
                1-Year Market Forecasts
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Home Value Forecast */}
              <Card className="glass-card border-cyan-500/30 glow-cyan-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400 icon-glow" />
                    <CardTitle className="text-sm text-gray-400">Home Value Forecast</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-home-forecast">
                    ${demoData.forecastData.homeValueForecast.forecastedValue.toLocaleString()}
                  </div>
                  <div className={`text-sm font-semibold ${demoData.forecastData.homeValueForecast.forecastGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {demoData.forecastData.homeValueForecast.forecastGrowth >= 0 ? '+' : ''}{demoData.forecastData.homeValueForecast.forecastGrowth}% by {demoData.forecastData.homeValueForecast.forecastDate}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: ${demoData.forecastData.homeValueForecast.currentValue.toLocaleString()}
                  </div>
                  <ForecastRange value={demoData.forecastData.homeValueForecast.forecastedValue} marginPercent={5} format="currency" label="Est. range" />
                  <div className="mt-1.5">
                    <ConfidenceBadge sourceKey="zillow_home" compact />
                  </div>
                </CardContent>
              </Card>

              {/* Rent Forecast */}
              <Card className="glass-card border-purple-500/30 glow-purple-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-purple-400 icon-glow-purple" />
                    <CardTitle className="text-sm text-gray-400">Rent Forecast</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-rent-forecast">
                    ${demoData.forecastData.rentForecast.forecastedRent.toLocaleString()}/mo
                  </div>
                  <div className={`text-sm font-semibold ${demoData.forecastData.rentForecast.forecastGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {demoData.forecastData.rentForecast.forecastGrowth >= 0 ? '+' : ''}{demoData.forecastData.rentForecast.forecastGrowth}% by {demoData.forecastData.rentForecast.forecastDate}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: ${demoData.forecastData.rentForecast.currentRent.toLocaleString()}/mo
                  </div>
                  <ForecastRange value={demoData.forecastData.rentForecast.forecastedRent} marginPercent={7.5} format="currency" label="Est. range" />
                  <div className="mt-1.5">
                    <ConfidenceBadge sourceKey="zillow_rent" compact />
                  </div>
                </CardContent>
              </Card>

              {/* Market Velocity */}
              <Card className="glass-card border-green-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <CardTitle className="text-sm text-gray-400">Market Velocity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-days-pending">
                    {demoData.forecastData.marketVelocity.daysToPending} days
                  </div>
                  <div className="text-sm text-green-400 font-semibold">
                    {demoData.forecastData.marketVelocity.marketSpeed === 'fast' ? 'Fast-Moving Market' : 
                     demoData.forecastData.marketVelocity.marketSpeed === 'moderate' ? 'Moderate Market' : 'Slow Market'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg time to go pending
                  </div>
                </CardContent>
              </Card>

              {/* Sale-to-List Ratio */}
              <Card className="glass-card border-orange-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-400" />
                    <CardTitle className="text-sm text-gray-400">Sale-to-List Ratio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-sale-list">
                    {(demoData.forecastData.marketVelocity.saleToListRatio * 100).toFixed(1)}%
                  </div>
                  <div className={`text-sm font-semibold ${demoData.forecastData.marketVelocity.saleToListRatio >= 1 ? 'text-orange-400' : 'text-blue-400'}`}>
                    {demoData.forecastData.marketVelocity.saleToListRatio >= 1 ? 'Sellers\' Market' : 'Buyers\' Market'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Homes sell at {demoData.forecastData.marketVelocity.saleToListRatio >= 1 ? 'or above' : 'below'} list price
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Property-Specific Rental Estimate */}
            <div className="mt-4">
              <Card className="glass-card border-cyan-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <DollarSign className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Property Rental Estimate</div>
                        <div className="text-xl font-bold text-white" data-testid="text-rental-estimate">
                          ${demoData.forecastData.rentalEstimate.estimatedRent.toLocaleString()}/mo
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Range: </span>
                        <span className="text-gray-300">${demoData.forecastData.rentalEstimate.rentRangeLow.toLocaleString()} - ${demoData.forecastData.rentalEstimate.rentRangeHigh.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Based on: </span>
                        <span className="text-gray-300">{demoData.forecastData.rentalEstimate.comparableCount} comps</span>
                      </div>
                      <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                        RentCast Data
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 space-y-3">
              <SourceAgreement 
                signals={buildCrossValidationSignals(
                  demoData.forecastData,
                  demoData.affordabilityData,
                  demoData.demographics
                )} 
              />
            </div>
          </section>
        )}

        {/* Metrics Grid */}
        <section className="pb-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            Key Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={TrendingUp}
              title="Market Strength"
              score={demoData.scoreBreakdown[0].score}
              description="Based on days on market and market statistics"
              tooltip="Combines how quickly properties sell (days on market), homeownership rates, vacancy rates, property age, and high-value home concentration. Higher scores indicate a strong, stable market with low vacancy and quick sales."
              reasoning={demoData.scoreBreakdown[0].reasoning}
            />
            <MetricCard
              icon={Users}
              title="Demographic Trends"
              score={demoData.scoreBreakdown[1].score}
              description="Based on Census 2022-2023 ACS data"
              tooltip="Analyzes median household income, employment rates, education levels, and professional employment percentages. Higher scores indicate affluent, educated communities with strong job markets, which typically support better property values."
              reasoning={demoData.scoreBreakdown[1].reasoning}
            />
            <MetricCard
              icon={GraduationCap}
              title="School Quality"
              score={demoData.scoreBreakdown[2].score}
              description="Based on SchoolDigger rankings (4.3★ avg)"
              tooltip="Evaluates schools using SchoolDigger's official star ratings and state percentile rankings. Schools are rated 1-5 stars based on test scores and other quality metrics. Higher percentiles mean the school performs better than that percentage of schools statewide."
              reasoning={demoData.scoreBreakdown[2].reasoning}
            />
            <MetricCard
              icon={Shield}
              title="Safety Score"
              score={demoData.scoreBreakdown[3].score}
              description={
                demoData.crimeData 
                  ? (() => {
                      const score = demoData.crimeData.safetyScore || 50;
                      let label = 'Average';
                      if (score >= 70) label = 'Very Safe';
                      else if (score >= 55) label = 'Safer than Average';
                      else if (score >= 45) label = 'Average';
                      else if (score >= 30) label = 'Above Average Risk';
                      else label = 'Higher Risk';
                      return `${demoData.crimeData.stateName}: ${label}`;
                    })()
                  : "Based on Census poverty and vacancy rates"
              }
              tooltip={
                demoData.crimeData
                  ? `Based on FBI Crime Data (${demoData.crimeData.year}). ${demoData.crimeData.stateName} violent crime: ${demoData.crimeData.violentCrimeRate.toFixed(0)}/100K (${demoData.crimeData.violentCrimeVsNational > 0 ? '+' : ''}${demoData.crimeData.violentCrimeVsNational.toFixed(0)}% vs national avg of ${demoData.crimeData.nationalViolentCrimeRate.toFixed(0)}). Property crime: ${demoData.crimeData.propertyCrimeRate.toFixed(0)}/100K. Score combines violent (60%) and property (40%) crime rates.`
                  : "Uses Census poverty rates, vacancy rates, and property abandonment rates as proxy indicators for neighborhood safety. Lower poverty and vacancy typically correlate with safer neighborhoods. This is an estimate, not a guarantee of safety."
              }
              reasoning={demoData.scoreBreakdown[3].reasoning}
            />
            <MetricCard
              icon={MapPin}
              title="Walkability"
              score={demoData.scoreBreakdown[4].score}
              description="Based on OpenStreetMap data"
              tooltip="Analyzes 50+ types of nearby amenities including restaurants, shops, parks, transit stops, healthcare facilities, and entertainment. Higher scores mean residents can easily walk to essential services, which enhances quality of life and property appeal."
              reasoning={demoData.scoreBreakdown[4].reasoning}
            />
            <MetricCard
              icon={DollarSign}
              title="Rental Potential"
              score={demoData.scoreBreakdown[5].score}
              description="Based on Census rent and home value data"
              tooltip="Calculates the rent-to-price ratio (annual rent divided by home value) and considers the balance of owner-occupied versus rental properties. The '1% rule' suggests monthly rent should be 1% of property value for good cash flow."
              reasoning={demoData.scoreBreakdown[5].reasoning}
            />
          </div>
        </section>

        {/* Property Listings */}
        {demoData.propertyListings && (
          <section className="pb-8">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
              Market Overview
            </h3>
            <PropertyListings data={demoData.propertyListings} />
          </section>
        )}

        {/* Affordability & Value Analysis */}
        {demoData.affordabilityData && (
          <section className="pb-8">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
              Affordability & Value Analysis
            </h3>
            <AffordabilityMetrics data={demoData.affordabilityData} />
          </section>
        )}

        {/* Detailed Analysis */}
        <section className="pb-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            Detailed Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DemographicsDisplay data={demoData.demographics} />
            <WalkabilityDisplay data={demoData.walkability} />
            {demoData.marketData && (
              <MarketDataDisplay data={demoData.marketData} />
            )}
            {demoData.schools && demoData.schools.schools.length > 0 && (
              <SchoolsDisplay data={demoData.schools} />
            )}
          </div>
        </section>

        {/* Enhanced Safety Analysis */}
        {(demoData.enrichedCrimeData || demoData.crimeData) && (
          <section className="pb-8">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
              Safety & Crime Analysis
            </h3>
            <EnhancedSafetyScore 
              enrichedData={demoData.enrichedCrimeData} 
              legacyData={demoData.crimeData} 
            />
          </section>
        )}

        {/* Flood Risk Assessment */}
        <section className="pb-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            Flood Risk Assessment
          </h3>
          <FloodRisk data={demoData.floodRisk} />
        </section>

        {/* Environmental & Seismic Risk */}
        <section className="pb-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            Environmental &amp; Seismic Risk
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EnvironmentalRisk data={demoData.environmentalRisk} />
            <SeismicRisk data={demoData.seismicRisk} />
          </div>
        </section>

        {/* Jobs Proximity */}
        <section className="pb-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            Employment &amp; Jobs Proximity
          </h3>
          <JobsProximity data={demoData.jobsProximity} />
        </section>

        {/* Appreciation / Purchase Outlook */}
        <section className="pb-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            {scoringMode === 'homebuyer' ? 'Home Purchase Outlook' : 'Appreciation Outlook'}
          </h3>
          <AppreciationOutlook
            forecastData={demoData.forecastData}
            affordabilityData={demoData.affordabilityData}
            demographics={demoData.demographics}
            medianHomeValue={demoData.demographics?.medianHomeValue}
            mode={scoringMode}
          />
        </section>

        {/* Investment / Home Purchase Analysis */}
        {demoData.investmentAnalysis && (
          <section className="pb-8">
            <InvestmentAnalysisDisplay
              analysis={demoData.investmentAnalysis}
              mode={scoringMode}
              scoreBreakdown={demoData.scoreBreakdown}
              demographics={demoData.demographics ?? undefined}
              schools={demoData.schools ?? undefined}
              walkability={demoData.walkability ?? undefined}
            />
          </section>
        )}

        {/* Map View */}
        {demoData.walkability.lat && demoData.walkability.lon && (
          <section className="pb-12">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
              Property Location
            </h3>
            <MapView 
              lat={demoData.walkability.lat} 
              lon={demoData.walkability.lon} 
              address={demoData.address}
              showFloodZones={true}
            />
          </section>
        )}

        {/* Comparable Sales Analysis */}
        {demoData.propertyListings && demoData.propertyListings.listings.length > 0 && (
          <section className="pb-12">
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
              Comparable Sales Analysis
            </h3>
            <ComparableSales 
              listings={demoData.propertyListings.listings}
              totalCount={demoData.propertyListings.total_count}
              medianPrice={demoData.propertyListings.median_price}
              avgPrice={demoData.propertyListings.avg_price}
              avgDaysOnMarket={demoData.propertyListings.avg_days_on_market}
              subjectPropertyPrice={demoData.demographics.medianHomeValue}
            />
          </section>
        )}

        {/* Mortgage Calculator */}
        <section className="pb-12">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
            Mortgage Calculator
          </h3>
          <MortgageCalculator initialHomePrice={demoData.demographics.medianHomeValue} />
        </section>

        {/* Investment Calculators */}
        <section className="mt-8">
          <InvestmentCalculators analysisResult={demoData} />
        </section>
        </div>

        {/* Export PDF Button */}
        <section className="pb-12 flex justify-center">
          <PdfExportButton 
            targetId="demo-report" 
            address={demoData.address}
          />
        </section>

        {/* Data Transparency Section */}
        <section className="pb-8">
          <DataDisclaimer variant="section" />
        </section>

        {/* CTA Section */}
        <section className="py-12 border-t border-gray-800 hero-glow">
          <div className="text-center max-w-2xl mx-auto relative z-10">
            <h3 className="text-3xl font-bold mb-4 text-white">
              Want this for the home you’re looking at?
            </h3>
            <p className="text-lg text-gray-400 mb-6">
              Your first 2 reports are free while early-bird spots last. After that, 5 reports cost $10.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                className="btn-gradient-purple"
                onClick={() => setLocation('/pricing')} 
                data-testid="button-cta-pricing"
              >
                See pricing
              </Button>
              <Button 
                size="lg" 
                className="btn-outline-cyan"
                onClick={() => window.location.href = '/login?mode=signup'} 
                data-testid="button-cta-login"
              >
                Create a free account
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-6">
              <a href="https://www.facebook.com/profile.php?id=61584350274435" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-facebook">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-purple-400 transition-colors p-2 rounded-md" data-testid="link-instagram">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="https://x.com/ScoreCasa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-x">
                <FaXTwitter className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@scorecasa" target="_blank" rel="noopener noreferrer" aria-label="Visit our TikTok page" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-tiktok">
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
              <span className="text-gray-700">•</span>
              <a href="/terms" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-terms">
                Terms and Conditions
              </a>
              <span className="text-gray-700">•</span>
              <a href="/contact" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-contact">
                Contact Us
              </a>
            </div>
            <p className="text-xs text-gray-600">
              ScoreCasa is a research tool, not financial, legal or real estate advice.
            </p>
            <p className="text-sm text-gray-500">
              &copy; 2025 ScoreCasa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
