// Test multiple ZIP codes for data consistency
const zipCodes = ['10001', '77001', '60601']; // NYC, Houston, Chicago

Promise.all(zipCodes.map(zip => 
  fetch(`http://localhost:5000/api/explore-census/${zip}`)
    .then(res => res.json())
)).then(results => {
  console.log('\n=== MULTI-ZIP CONSISTENCY TEST ===\n');
  
  results.forEach((data, idx) => {
    console.log(`${zipCodes[idx]} (${['NYC', 'Houston', 'Chicago'][idx]}):`);
    console.log(`  Available: ${data.summary.available}/${data.summary.totalDatasets}`);
    console.log(`  Failed: ${data.datasets.filter(d => !d.available).map(d => d.category).join(', ') || 'None'}`);
    console.log('');
  });
  
  // Check which variables are consistently available
  const allCategories = results[0].datasets.map(d => d.category);
  console.log('Category availability across all test ZIPs:');
  allCategories.forEach(category => {
    const availableCount = results.filter(r => 
      r.datasets.find(d => d.category === category && d.available)
    ).length;
    console.log(`  ${category}: ${availableCount}/${results.length} ${availableCount === results.length ? '✓' : '⚠'}`);
  });
}).catch(err => console.error('Error:', err.message));
