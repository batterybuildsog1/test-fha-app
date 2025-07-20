const axios = require('axios');
require('dotenv').config();

async function testInsurancePerThousand() {
  console.log('🧪 Testing Insurance Rates Per $1,000 Coverage...\n');
  
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: XAI_API_KEY not found');
    process.exit(1);
  }

  // Test different states and coverage amounts
  const testStates = [
    { state: 'Texas', stateCode: 'TX' },
    { state: 'Utah', stateCode: 'UT' },
    { state: 'California', stateCode: 'CA' },
    { state: 'Florida', stateCode: 'FL' }
  ];

  const coverageAmounts = [200000, 300000, 500000, 750000];

  console.log('🔍 Test 1: Finding Rate Per $1,000 Sources...\n');

  // Sources that typically show per-$1000 rates
  const perThousandSources = [
    {
      name: 'III.org (Insurance Information Institute)',
      url: 'https://www.iii.org/fact-statistic/facts-statistics-homeowners-and-renters-insurance',
      prompt: 'Find homeowners insurance rates shown as cost per $1,000 of coverage or dwelling coverage. Look for tables with per-thousand rates. Return {"rate_per_1000": number, "source_note": "description"}'
    },
    {
      name: 'NAIC Data',
      url: 'https://content.naic.org/sites/default/files/inline-files/2023%20Dwelling%20Fire%2C%20Homeowners%20Owner-Occupied%2C%20and%20Homeowners%20Tenant%20and%20Condominium%2FCooperative%20Unit%20Owners%20Insurance%20Report.pdf',
      prompt: 'Find average premium per $1,000 of coverage for homeowners insurance by state. Look for rate tables. Return {"rate_per_1000": number, "state": "applicable_state"}'
    },
    {
      name: 'ValuePenguin Rate Calculator',
      url: 'https://www.valuepenguin.com/homeowners-insurance-calculator',
      prompt: 'Find information about how homeowners insurance is calculated per $1,000 of dwelling coverage. Return {"rate_per_1000": number, "calculation_method": "description"}'
    }
  ];

  for (const source of perThousandSources) {
    console.log(`Testing ${source.name}:`);
    
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `FETCH ${source.url}

${source.prompt}

If no per-$1000 rates found, return:
{"error": "no per-thousand rates found", "rate_per_1000": null}

Return JSON only.`
        }],
        search_parameters: { mode: 'off' },
        max_tokens: 400,
        temperature: 0,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      });

      const raw = res.data.choices[0].message.content.trim();
      console.log(`  Raw response: ${raw}`);
      
      try {
        const parsed = JSON.parse(raw);
        if (parsed.rate_per_1000) {
          console.log(`  ✅ Rate: $${parsed.rate_per_1000} per $1,000 coverage`);
          console.log(`  📝 Note: ${parsed.source_note || parsed.calculation_method || 'N/A'}\n`);
        } else {
          console.log(`  ⚠️  ${parsed.error || 'No rate found'}\n`);
        }
      } catch (parseError) {
        console.log(`  ❌ JSON parse failed: ${parseError.message}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  console.log('🏠 Test 2: State-Specific Per-$1000 Rates...\n');

  for (const testState of testStates) {
    console.log(`Testing ${testState.state}:`);
    
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `Search for homeowners insurance rates in ${testState.state}. 
          
Look specifically for:
1. Cost per $1,000 of dwelling coverage
2. Rate tables showing premium per thousand
3. Insurance department data with per-$1000 rates

Calculate if you find annual premiums for specific coverage amounts.
Example: If $300k coverage costs $1,500/year, then rate = $1,500 ÷ 300 = $5.00 per $1,000

Return this format:
{
  "state": "${testState.state}",
  "rate_per_1000": number,
  "source": "where_found",
  "calculation": "how_derived"
}

If no data found:
{"error": "no rate data found", "state": "${testState.state}"}

Return JSON only.`
        }],
        search_parameters: { mode: 'on' },
        max_tokens: 500,
        temperature: 0,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const raw = res.data.choices[0].message.content.trim();
      console.log(`  Raw response: ${raw}`);
      
      try {
        const parsed = JSON.parse(raw);
        if (parsed.rate_per_1000) {
          console.log(`  ✅ ${testState.state}: $${parsed.rate_per_1000} per $1,000`);
          console.log(`  📊 Source: ${parsed.source}`);
          console.log(`  🧮 Calculation: ${parsed.calculation}\n`);
          
          // Test calculations for different home values
          console.log(`  💡 Example calculations for ${testState.state}:`);
          coverageAmounts.forEach(amount => {
            const annualPremium = (amount / 1000) * parsed.rate_per_1000;
            const monthlyPremium = annualPremium / 12;
            console.log(`    $${amount.toLocaleString()} home: $${annualPremium.toFixed(0)}/year ($${monthlyPremium.toFixed(0)}/month)`);
          });
          console.log('');
        } else {
          console.log(`  ⚠️  ${parsed.error}\n`);
        }
      } catch (parseError) {
        console.log(`  ❌ JSON parse failed: ${parseError.message}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  console.log('📊 Test 3: Typical Per-$1000 Rate Ranges...\n');
  
  const typicalRanges = {
    'Low Risk States (UT, ID, VT)': { min: 1.5, max: 3.5 },
    'Moderate Risk States (TX, CO, NV)': { min: 3.0, max: 6.0 },
    'High Risk States (FL, CA, LA)': { min: 6.0, max: 12.0 },
    'Very High Risk (Hurricane/Earthquake)': { min: 10.0, max: 20.0 }
  };

  console.log('Expected per-$1000 ranges by risk level:');
  Object.entries(typicalRanges).forEach(([category, range]) => {
    console.log(`  ${category}: $${range.min} - $${range.max} per $1,000`);
  });

  console.log('\n🎯 Rate Validation Guidelines:');
  console.log('  • Under $1.50: Likely too low or special program');
  console.log('  • $1.50-$3.50: Low risk states, good rates');
  console.log('  • $3.50-$6.00: National average range');
  console.log('  • $6.00-$10.00: Higher risk or coastal areas');
  console.log('  • $10.00+: Very high risk (hurricanes, earthquakes)');
  console.log('  • $20.00+: Extreme risk or luxury properties');

  console.log('\n🏁 Per-$1000 testing completed!');
  console.log('\n📋 Implementation Notes:');
  console.log('1. Update insurance functions to use per-$1000 rates');
  console.log('2. Modify prompts to specifically request per-$1000 data');
  console.log('3. Add fallback calculation from annual premiums');
  console.log('4. Store rates as per-$1000 values in database');
  console.log('5. Calculate annual premium = (home_value / 1000) * rate_per_1000');
}

// Run the test
if (require.main === module) {
  testInsurancePerThousand().catch(console.error);
}

module.exports = { testInsurancePerThousand };