const axios = require('axios');
require('dotenv').config();

async function testRealWorldValidation() {
  console.log('🧪 Testing Real-World Insurance Rates Validation...\n');
  
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: XAI_API_KEY not found');
    process.exit(1);
  }

  // Test cases with specific ZIP codes and home values
  const testCases = [
    { zip: '84737', city: 'Parowan', state: 'UT', homeValues: [300000, 500000, 800000] },
    { zip: '78701', city: 'Austin', state: 'TX', homeValues: [300000, 500000, 800000] },
    { zip: '90210', city: 'Beverly Hills', state: 'CA', homeValues: [300000, 500000, 800000] },
    { zip: '33101', city: 'Miami', state: 'FL', homeValues: [300000, 500000, 800000] }
  ];

  // Our current per-$1000 rates from testing
  const ourRates = {
    'UT': 5.98,
    'TX': 12.84,
    'CA': 5.17,
    'FL': 14.73
  };

  console.log('📊 Our Current Per-$1000 Rates:');
  Object.entries(ourRates).forEach(([state, rate]) => {
    console.log(`  ${state}: $${rate} per $1,000`);
  });
  console.log('');

  for (const testCase of testCases) {
    console.log(`🏠 Testing ${testCase.city}, ${testCase.state} (${testCase.zip}):`);
    
    // Search for real-world rates for this specific location
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `Search for homeowners insurance rates in ${testCase.city}, ${testCase.state} ${testCase.zip} for these home values: $300,000, $500,000, and $800,000.

Look for:
1. Actual insurance quotes or estimates
2. Local insurance company rates
3. Real estate websites with insurance costs
4. State insurance department data

Return this format:
{
  "location": "${testCase.city}, ${testCase.state}",
  "zip": "${testCase.zip}",
  "rates": [
    {"home_value": 300000, "annual_premium": number, "source": "where_found"},
    {"home_value": 500000, "annual_premium": number, "source": "where_found"},
    {"home_value": 800000, "annual_premium": number, "source": "where_found"}
  ],
  "notes": "any important context"
}

If no specific data found, return:
{"error": "no specific data found", "zip": "${testCase.zip}"}

Return JSON only.`
        }],
        search_parameters: { mode: 'on' },
        max_tokens: 600,
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
        
        if (parsed.rates && Array.isArray(parsed.rates)) {
          console.log(`  ✅ Found real-world data for ${testCase.city}:`);
          
          // Compare with our calculations
          testCase.homeValues.forEach(homeValue => {
            const ourCalculation = (homeValue / 1000) * ourRates[testCase.state];
            const realData = parsed.rates.find(r => r.home_value === homeValue);
            
            console.log(`\n    $${homeValue.toLocaleString()} home:`);
            console.log(`      Our calculation: $${ourCalculation.toFixed(0)}/year ($${(ourCalculation/12).toFixed(0)}/month)`);
            
            if (realData && realData.annual_premium) {
              const difference = Math.abs(ourCalculation - realData.annual_premium);
              const percentDiff = (difference / realData.annual_premium) * 100;
              
              console.log(`      Real-world data: $${realData.annual_premium.toLocaleString()}/year (${realData.source})`);
              console.log(`      Difference: $${difference.toFixed(0)} (${percentDiff.toFixed(1)}%)`);
              
              if (percentDiff < 10) {
                console.log(`      ✅ EXCELLENT accuracy (<10% difference)`);
              } else if (percentDiff < 25) {
                console.log(`      ⚠️  ACCEPTABLE accuracy (10-25% difference)`);
              } else {
                console.log(`      ❌ POOR accuracy (>${percentDiff.toFixed(1)}% difference)`);
              }
            } else {
              console.log(`      ⚠️  No real-world data found for this value`);
            }
          });
          
          console.log(`\n  📝 Notes: ${parsed.notes || 'None'}\n`);
        } else {
          console.log(`  ⚠️  ${parsed.error || 'No specific data found'}\n`);
        }
      } catch (parseError) {
        console.log(`  ❌ JSON parse failed: ${parseError.message}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  // Test 2: Compare against major insurance websites
  console.log('🔍 Testing Against Major Insurance Providers...\n');
  
  const insuranceProviders = [
    'State Farm homeowners insurance calculator',
    'Allstate home insurance rates',
    'GEICO homeowners insurance quotes',
    'Progressive home insurance calculator'
  ];

  for (const provider of insuranceProviders) {
    console.log(`Testing ${provider}:`);
    
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `Search for "${provider}" and find example rates or calculators for homeowners insurance.

Look for sample rates for:
- $300k, $500k, $800k homes
- Different states (Texas, Utah, California, Florida)
- Any rate factors or multipliers mentioned

Return format:
{
  "provider": "${provider}",
  "sample_rates": [
    {"state": "state", "home_value": number, "annual_premium": number}
  ],
  "rate_factors": "any factors mentioned",
  "calculator_found": true/false
}

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
        timeout: 45000
      });

      const raw = res.data.choices[0].message.content.trim();
      console.log(`  Raw response: ${raw}\n`);
      
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  // Generate comprehensive state fallback rates
  console.log('📋 Generating All-State Fallback Rates...\n');
  
  try {
    const res = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3-beta',
      stream: false,
      messages: [{
        role: 'user',
        content: `Find homeowners insurance rates per $1,000 of coverage for ALL 50 US states. 

Look for official insurance department data, NAIC reports, or authoritative sources.

Calculate per-$1000 rate from available data:
- If annual premium given: rate = premium ÷ (coverage ÷ 1000)
- Example: $2,400/year for $300k coverage = $2,400 ÷ 300 = $8.00 per $1,000

Return this exact format:
{
  "source": "data source used",
  "year": "2024 or 2025",
  "rates": {
    "AL": rate_number,
    "AK": rate_number,
    "AZ": rate_number,
    ... (all 50 states + DC)
  }
}

Return JSON only.`
      }],
      search_parameters: { mode: 'on' },
      max_tokens: 1000,
      temperature: 0,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const raw = res.data.choices[0].message.content.trim();
    console.log('All-State Rates Response:');
    console.log(raw);
    
    try {
      const parsed = JSON.parse(raw);
      if (parsed.rates) {
        console.log('\n✅ Successfully generated all-state fallback rates!');
        console.log(`📊 Source: ${parsed.source}`);
        console.log(`📅 Year: ${parsed.year}`);
        
        // Show sample of rates
        const sampleStates = ['CA', 'TX', 'NY', 'FL', 'UT', 'AL', 'WY'];
        console.log('\n📋 Sample rates:');
        sampleStates.forEach(state => {
          if (parsed.rates[state]) {
            console.log(`  ${state}: $${parsed.rates[state]} per $1,000`);
          }
        });
        
        // Save for implementation
        console.log('\n💾 Full fallback object for implementation:');
        console.log(JSON.stringify(parsed.rates, null, 2));
      }
    } catch (parseError) {
      console.log(`❌ JSON parse failed: ${parseError.message}`);
    }
    
  } catch (error) {
    console.log(`❌ All-state request failed: ${error.message}`);
  }

  console.log('\n🏁 Real-world validation completed!');
  console.log('\n📊 Summary & Recommendations:');
  console.log('1. Check accuracy percentages above');
  console.log('2. Update rates where >25% difference found');
  console.log('3. Implement all-state fallback rates');
  console.log('4. Consider regional adjustments for rural vs urban');
  console.log('5. Add construction type multipliers if needed');
}

// Run the test
if (require.main === module) {
  testRealWorldValidation().catch(console.error);
}

module.exports = { testRealWorldValidation };