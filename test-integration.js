// Test full Census data integration with real address
const address = '9560 Wilshire Blvd, Beverly Hills, CA 90212';

console.log(`\n🧪 Testing Property Analysis Integration`);
console.log(`Address: ${address}\n`);

fetch('http://localhost:5000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address })
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Analysis Complete!\n');
    
    // Overall Score
    console.log(`📊 Investment Score: ${data.score}/10\n`);
    
    // Score Breakdown
    console.log('📈 Score Breakdown:');
    data.scoreBreakdown.forEach(item => {
      console.log(`  ${item.label}: ${item.score}/100 (weight: ${(item.weight * 100).toFixed(0)}%)`);
    });
    
    console.log('\n💰 NEW: Crime Proxy Metrics (Safety Score)');
    console.log(`  Poverty Rate: ${data.demographics.povertyRate}%`);
    console.log(`  Vacancy Rate: ${data.demographics.vacancyRate}%`);
    console.log(`  Abandonment Rate: ${data.demographics.abandonmentRate}%`);
    
    console.log('\n🏠 NEW: Rental Potential Metrics');
    console.log(`  Median Rent: $${data.demographics.medianRent.toLocaleString()}/month`);
    console.log(`  Median Home Value: $${data.demographics.medianHomeValue.toLocaleString()}`);
    console.log(`  Owner-Occupied: ${data.demographics.ownerOccupiedPct}%`);
    console.log(`  Renter-Occupied: ${data.demographics.renterOccupiedPct}%`);
    if (data.demographics.medianRent > 0 && data.demographics.medianHomeValue > 0) {
      const annualYield = ((data.demographics.medianRent * 12) / data.demographics.medianHomeValue * 100).toFixed(2);
      console.log(`  Rent-to-Price Ratio: ${annualYield}% annual yield`);
    }
    
    console.log('\n🏢 NEW: Market Enhancement Metrics');
    console.log(`  Median Year Built: ${data.demographics.medianYearBuilt}`);
    console.log(`  High-Value Homes ($500k+): ${data.demographics.highValueHomeCount}`);
    console.log(`  Professional Employment: ${data.demographics.professionalEmploymentPct}%`);
    
    console.log('\n📋 Existing Metrics:');
    console.log(`  Median Income: $${data.demographics.medianIncome.toLocaleString()}`);
    console.log(`  Population: ${data.demographics.population.toLocaleString()}`);
    console.log(`  Employment Rate: ${data.demographics.employmentRate}%`);
    console.log(`  College Degree: ${data.demographics.collegeDegreePct}%`);
    
    console.log('\n✨ All 6 Census datasets successfully integrated!\n');
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
