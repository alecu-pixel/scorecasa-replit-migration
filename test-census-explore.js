// Quick test script to verify Census exploration endpoint
const zipCode = '90210'; // Beverly Hills

fetch(`http://localhost:5000/api/explore-census/${zipCode}`)
  .then(res => res.json())
  .then(data => {
    console.log('\n=== CENSUS DATA EXPLORATION RESULTS ===\n');
    console.log(`ZIP Code: ${data.zipCode}`);
    console.log(`\nSummary:`);
    console.log(`- Total datasets queried: ${data.summary.totalDatasets}`);
    console.log(`- Available: ${data.summary.available}`);
    console.log(`- Unavailable: ${data.summary.unavailable}`);
    console.log(`- API Key Used: ${data.summary.apiKeyUsed ? 'Yes' : 'No'}`);
    
    console.log(`\n--- Dataset Results ---\n`);
    
    data.datasets.forEach((dataset, idx) => {
      console.log(`${idx + 1}. ${dataset.category} - ${dataset.description}`);
      console.log(`   Status: ${dataset.available ? '✓ AVAILABLE' : '✗ UNAVAILABLE'}`);
      
      if (dataset.available && dataset.variables) {
        console.log(`   Variables found: ${dataset.variables.length}`);
        // Show first 3 variables as sample
        dataset.variables.slice(0, 3).forEach(v => {
          console.log(`     - ${v.code}: ${v.value}`);
        });
        if (dataset.variables.length > 3) {
          console.log(`     ... and ${dataset.variables.length - 3} more`);
        }
      } else if (dataset.error) {
        console.log(`   Error: ${dataset.error}`);
      }
      console.log('');
    });
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
