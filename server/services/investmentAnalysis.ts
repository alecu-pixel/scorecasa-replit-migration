import type { CensusData, GrowthData, WalkabilityData, SchoolData, PropertyListingsData, MarketData, ScoreBreakdown } from "@shared/schema";

interface AnalysisInput {
  address: string;
  zipCode: string;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown[];
  demographics: CensusData & GrowthData;
  walkability: WalkabilityData;
  propertyListings?: PropertyListingsData | null;
  marketData?: MarketData | null;
  schools?: SchoolData | null;
}

export interface InvestmentAnalysis {
  phases: {
    title: string;
    description: string;
  }[];
  pros: string[];
  cons: string[];
}

export async function generateInvestmentAnalysis(input: AnalysisInput): Promise<InvestmentAnalysis> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.warn('[Investment Analysis] PERPLEXITY_API_KEY not found, returning default analysis');
    return getDefaultAnalysis(input);
  }

  try {
    // Prepare context for the AI
    const context = buildAnalysisContext(input);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a real estate investment analyst. Provide clear, actionable, data-driven analysis based on the specific property metrics provided. Be concise and focus on unique insights from the actual data.'
          },
          {
            role: 'user',
            content: `Analyze this property investment opportunity and provide your response in this EXACT JSON format (return ONLY valid JSON, no markdown formatting, no code blocks):

{
  "phases": [
    {"title": "Short-term Outlook", "description": "2-3 sentences about immediate investment considerations"},
    {"title": "Medium-term Growth", "description": "2-3 sentences about 3-5 year potential"},
    {"title": "Long-term Perspective", "description": "2-3 sentences about long-term value (optional)"}
  ],
  "pros": ["Specific strength based on data", "Another strength", "Third strength", "Fourth strength"],
  "cons": ["Specific concern from data", "Another concern", "Third concern"]
}

Property Data:
${context}

IMPORTANT: Reference specific numbers from the data above. For example, if income is $120,000, mention "Strong median income of $120K". If walkability is 0, mention "Limited walkability requires consideration". Make each analysis unique to THIS property's actual data.`
          }
        ],
        max_tokens: 1200,
        temperature: 0.4,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    // Parse the JSON response
    const analysis = JSON.parse(content) as InvestmentAnalysis;
    
    // Validate the structure
    if (!analysis.phases || !Array.isArray(analysis.phases) || analysis.phases.length === 0) {
      throw new Error('Invalid analysis structure: missing phases');
    }
    if (!analysis.pros || !Array.isArray(analysis.pros) || analysis.pros.length === 0) {
      throw new Error('Invalid analysis structure: missing pros');
    }
    if (!analysis.cons || !Array.isArray(analysis.cons) || analysis.cons.length === 0) {
      throw new Error('Invalid analysis structure: missing cons');
    }

    return analysis;
    
  } catch (error) {
    console.error('[Investment Analysis] Error generating analysis:', error);
    return getDefaultAnalysis(input);
  }
}

function buildAnalysisContext(input: AnalysisInput): string {
  const lines: string[] = [
    `Address: ${input.address}`,
    `ZIP Code: ${input.zipCode}`,
    `Overall Investment Score: ${input.finalScore}/10`,
    '',
    'Score Breakdown:'
  ];

  input.scoreBreakdown.forEach(item => {
    const scoreOutOf10 = (item.score / 10).toFixed(1);
    lines.push(`- ${item.label}: ${scoreOutOf10}/10 (weight: ${(item.weight * 100).toFixed(0)}%)`);
  });

  lines.push('', 'Key Metrics:');
  lines.push(`- Median Income: $${input.demographics.medianIncome.toLocaleString()}`);
  lines.push(`- Employment Rate: ${input.demographics.employmentRate.toFixed(1)}%`);
  lines.push(`- College Degree %: ${input.demographics.collegeDegreePct.toFixed(1)}%`);
  lines.push(`- Professional Employment %: ${input.demographics.professionalEmploymentPct.toFixed(1)}%`);
  lines.push(`- Population Growth (5yr): ${input.demographics.populationGrowth5yr.toFixed(1)}%`);
  lines.push(`- Income Growth (5yr): ${input.demographics.incomeGrowth5yr.toFixed(1)}%`);
  lines.push(`- Walkability Score: ${input.walkability.walkScore}/100`);
  
  if (input.schools) {
    lines.push(`- Average School Rating: ${input.schools.average_score.toFixed(1)}/10`);
  }
  
  if (input.propertyListings) {
    lines.push(`- Avg Days on Market: ${input.propertyListings.avg_days_on_market} days`);
  }
  
  if (input.marketData) {
    if (input.marketData.homeownershipRate !== null && input.marketData.homeownershipRate !== undefined) {
      lines.push(`- Homeownership Rate: ${input.marketData.homeownershipRate.toFixed(1)}%`);
    }
    if (input.marketData.vacancyRate !== null && input.marketData.vacancyRate !== undefined) {
      lines.push(`- Vacancy Rate: ${input.marketData.vacancyRate.toFixed(1)}%`);
    }
  }

  if (input.demographics.medianHomeValue > 0) {
    lines.push(`- Median Home Value: $${input.demographics.medianHomeValue.toLocaleString()}`);
  }
  
  if (input.demographics.medianRent > 0) {
    lines.push(`- Median Monthly Rent: $${input.demographics.medianRent.toLocaleString()}`);
  }

  return lines.join('\n');
}

function getDefaultAnalysis(input: AnalysisInput): InvestmentAnalysis {
  const { finalScore, scoreBreakdown, demographics, walkability, propertyListings, marketData, schools } = input;
  
  // Extract specific metrics for targeted analysis
  const marketStrength = scoreBreakdown.find(s => s.label === 'Market Strength')?.score || 0;
  const demographicScore = scoreBreakdown.find(s => s.label === 'Demographic Trends')?.score || 0;
  const schoolScore = scoreBreakdown.find(s => s.label === 'School Quality')?.score || 0;
  const walkScore = walkability.walkScore;
  const income = demographics.medianIncome;
  const incomeGrowth = demographics.incomeGrowth5yr;
  const popGrowth = demographics.populationGrowth5yr;
  const employmentRate = demographics.employmentRate;
  const daysOnMarket = propertyListings?.avg_days_on_market;
  
  const phases = [];
  const pros = [];
  const cons = [];

  // Phase 1: Immediate Market Assessment
  let phase1Title = 'Current Market Position';
  let phase1Desc = '';
  
  if (marketStrength >= 70) {
    phase1Desc = `Strong market fundamentals with a ${marketStrength}/100 market score. `;
    if (daysOnMarket && daysOnMarket < 45) {
      phase1Desc += `Properties move quickly here (${daysOnMarket} days average), indicating healthy demand. `;
    }
    phase1Desc += `This suggests favorable conditions for both appreciation and rental income.`;
  } else if (marketStrength >= 50) {
    phase1Desc = `Moderate market conditions (${marketStrength}/100 score). `;
    phase1Desc += daysOnMarket && daysOnMarket > 60 
      ? `Properties take ${daysOnMarket} days to sell on average, suggesting a buyer's market with negotiation room.`
      : `Market activity appears balanced, offering reasonable entry opportunities.`;
  } else {
    phase1Desc = `Softer market conditions reflected in the ${marketStrength}/100 score. `;
    phase1Desc += `This area may require careful property selection and active management to achieve positive returns.`;
  }
  
  phases.push({ title: phase1Title, description: phase1Desc });

  // Phase 2: Demographic & Economic Trends
  let phase2Title = 'Economic Trajectory';
  let phase2Desc = '';
  
  if (income >= 100000) {
    phase2Desc = `High median income of $${(income/1000).toFixed(0)}K indicates strong purchasing power. `;
  } else if (income >= 70000) {
    phase2Desc = `Median income of $${(income/1000).toFixed(0)}K suggests moderate economic stability. `;
  } else {
    phase2Desc = `Lower median income ($${(income/1000).toFixed(0)}K) may impact rental rates and appreciation potential. `;
  }
  
  if (popGrowth > 2) {
    phase2Desc += `Population growth of ${popGrowth.toFixed(1)}% signals expanding demand for housing.`;
  } else if (popGrowth > 0) {
    phase2Desc += `Modest population growth (${popGrowth.toFixed(1)}%) indicates stable demand.`;
  } else {
    phase2Desc += `Population decline (${popGrowth.toFixed(1)}%) raises concerns about long-term demand.`;
  }
  
  if (incomeGrowth > 3) {
    phase2Desc += ` Income growth of ${incomeGrowth.toFixed(1)}% shows improving economic conditions.`;
  } else if (incomeGrowth < 0) {
    phase2Desc += ` Declining incomes (${incomeGrowth.toFixed(1)}%) warrant caution.`;
  }
  
  phases.push({ title: phase2Title, description: phase2Desc });

  // Phase 3: Investment Positioning (optional, based on score)
  if (finalScore >= 5.5) {
    let phase3Desc = '';
    
    if (schoolScore >= 60 && walkScore >= 50) {
      phase3Desc = `Excellent lifestyle amenities with ${schoolScore}/100 schools and ${walkScore}/100 walkability make this attractive to families and quality tenants. `;
    } else if (schoolScore >= 60) {
      phase3Desc = `Strong schools (${schoolScore}/100) appeal to families, though limited walkability (${walkScore}/100) may require car dependency. `;
    } else if (walkScore >= 50) {
      phase3Desc = `Good walkability (${walkScore}/100) attracts urban-minded renters, though school scores (${schoolScore}/100) may limit family appeal. `;
    } else {
      phase3Desc = `Lower walkability (${walkScore}/100) and school scores (${schoolScore}/100) suggest targeting different tenant demographics. `;
    }
    
    phase3Desc += finalScore >= 7 
      ? `Overall score of ${finalScore.toFixed(1)}/10 positions this as a solid long-term hold.`
      : `The ${finalScore.toFixed(1)}/10 score suggests moderate returns with proper management.`;
    
    phases.push({ title: 'Long-term Positioning', description: phase3Desc });
  }

  // Generate data-driven pros
  if (income >= 90000) pros.push(`High median income ($${(income/1000).toFixed(0)}K) supports strong rental rates`);
  if (employmentRate >= 95) pros.push(`Excellent employment rate (${employmentRate.toFixed(1)}%) indicates economic stability`);
  if (popGrowth > 2) pros.push(`Strong population growth (${popGrowth.toFixed(1)}%) driving housing demand`);
  if (incomeGrowth > 3) pros.push(`Rising incomes (${incomeGrowth.toFixed(1)}% growth) suggest improving market`);
  if (marketStrength >= 70) pros.push(`Strong market fundamentals (${marketStrength}/100 score)`);
  if (schoolScore >= 70) pros.push(`High-quality schools (${schoolScore}/100) attract families`);
  if (walkScore >= 70) pros.push(`Excellent walkability (${walkScore}/100) for urban lifestyle`);
  if (daysOnMarket && daysOnMarket < 40) pros.push(`Fast-moving market (${daysOnMarket} days average) shows demand`);
  if (demographicScore >= 80) pros.push(`Outstanding demographic trends (${demographicScore}/100 score)`);
  
  // If no strong pros identified, add moderate ones
  if (pros.length < 3) {
    if (income >= 60000) pros.push(`Moderate income levels ($${(income/1000).toFixed(0)}K) provide baseline stability`);
    if (employmentRate >= 90) pros.push(`Solid employment rate (${employmentRate.toFixed(1)}%)`);
    if (finalScore >= 5) pros.push(`Overall score of ${finalScore.toFixed(1)}/10 suggests acceptable investment potential`);
  }

  // Generate data-driven cons
  if (income < 60000) cons.push(`Lower median income ($${(income/1000).toFixed(0)}K) may limit rent growth`);
  if (employmentRate < 92) cons.push(`Below-average employment (${employmentRate.toFixed(1)}%) indicates economic weakness`);
  if (popGrowth < 0) cons.push(`Population decline (${popGrowth.toFixed(1)}%) signals shrinking demand`);
  if (incomeGrowth < 0) cons.push(`Falling incomes (${incomeGrowth.toFixed(1)}%) raise concern about affordability`);
  if (walkScore < 30) cons.push(`Very low walkability (${walkScore}/100) requires car ownership`);
  if (schoolScore < 50) cons.push(`Below-average schools (${schoolScore}/100) may deter families`);
  if (daysOnMarket && daysOnMarket > 90) cons.push(`Slow market (${daysOnMarket} days to sell) suggests weak demand`);
  if (marketStrength < 40) cons.push(`Weak market fundamentals (${marketStrength}/100 score)`);
  if (demographicScore < 40) cons.push(`Concerning demographic trends (${demographicScore}/100 score)`);
  
  // Ensure minimum cons
  if (cons.length < 2) {
    if (finalScore < 7) cons.push(`Investment score of ${finalScore.toFixed(1)}/10 indicates room for improvement`);
    if (walkScore < 50 && !cons.some(c => c.includes('walkability'))) cons.push(`Limited walkability (${walkScore}/100) may affect appeal`);
  }

  return { phases, pros, cons };
}
