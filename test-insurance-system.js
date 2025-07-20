const axios = require('axios');
require('dotenv').config();

async function testInsuranceSystem() {
  console.log('🧪 Testing Multi-Source Insurance System...\n');
  
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: XAI_API_KEY not found');
    process.exit(1);
  }
  
  console.log('✅ API Key found\n');

  // Test ZIP codes for different regions
  const testZips = [
    { zip: '78701', description: 'Austin, TX (Urban)' },
    { zip: '84101', description: 'Salt Lake City, UT (Urban)' },
    { zip: '84701', description: 'Richfield, UT (Rural)' },
    { zip: '77845', description: 'College Station, TX (Small City)' },
    { zip: '10001', description: 'New York, NY (High Cost)' }
  ];

  // Test 1: ZIP Code Resolution
  console.log('📍 Test 1: ZIP Code to Location Resolution...\n');
  
  for (const testCase of testZips) {
    console.log(`Testing ZIP ${testCase.zip} (${testCase.description}):`);
    
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `Look up ZIP code ${testCase.zip} and return the location data in this exact JSON format:
{"state": "TX", "stateCode": "TX", "city": "Austin", "county": "Travis County"}

Return JSON only.`
        }],
        search_parameters: { mode: 'on' },
        max_tokens: 200,
        temperature: 0,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const raw = res.data.choices[0].message.content.trim();
      console.log(`  Raw response: ${raw}`);
      
      try {
        const parsed = JSON.parse(raw);
        console.log(`  ✅ Parsed: ${parsed.city}, ${parsed.state}`);
        console.log(`  📍 County: ${parsed.county || 'N/A'}\n`);
      } catch (parseError) {
        console.log(`  ❌ JSON parse failed: ${parseError.message}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  // Test 2: Multi-Source Insurance Rate Fetching
  console.log('🏠 Test 2: Multi-Source Insurance Rate Fetching...\n');
  
  const sources = [
    {
      name: 'Bankrate',
      url: 'https://www.bankrate.com/insurance/homeowners-insurance/states/',
      prompt: 'Find the row for "Texas" state. Extract the average annual premium. Return {"premium": number, "confidence": "high"}'
    },
    {
      name: 'NerdWallet',
      url: 'https://www.nerdwallet.com/insurance/homeowners/texas-home-insurance',
      prompt: 'Find average homeowners insurance cost for Texas. Return {"premium": number, "confidence": "medium"}'
    },
    {
      name: 'MoneyGeek',
      url: 'https://www.moneygeek.com/insurance/homeowners/rates-by-state/',
      prompt: 'Locate Texas in the state rates table. Extract annual premium. Return {"premium": number, "confidence": "high"}'
    }
  ];

  for (const source of sources) {
    console.log(`Testing ${source.name}:`);
    
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `FETCH ${source.url}

${source.prompt}

If data not found, return:
{"error": "not found", "premium": null}

Return JSON only.`
        }],
        search_parameters: { mode: 'off' },
        max_tokens: 300,
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
        if (parsed.premium) {
          console.log(`  ✅ Premium: $${parsed.premium.toLocaleString()}/year ($${(parsed.premium/12).toFixed(0)}/month)`);
          console.log(`  🎯 Confidence: ${parsed.confidence || 'unknown'}\n`);
        } else {
          console.log(`  ⚠️  No premium found: ${parsed.error || 'unknown error'}\n`);
        }
      } catch (parseError) {
        console.log(`  ❌ JSON parse failed: ${parseError.message}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  // Test 3: Independent Validation
  console.log('🔍 Test 3: Independent Validation Sources...\n');
  
  const validationSources = [
    'https://www.iii.org/fact-statistic/facts-statistics-homeowners-and-renters-insurance',
    'https://www.valuepenguin.com/average-cost-of-homeowners-insurance',
    'https://www.forbes.com/advisor/homeowners-insurance/average-cost-homeowners-insurance/'
  ];

  for (const url of validationSources) {
    console.log(`Checking validation source: ${url.split('/')[2]}...`);
    
    try {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-beta',
        stream: false,
        messages: [{
          role: 'user',
          content: `FETCH ${url}

Find the average annual homeowners insurance premium for the United States or Texas specifically.
Look for dollar amounts, annual costs, or monthly costs that can be converted to annual.

Return in this format:
{"source": "site_name", "national_average": number_or_null, "texas_average": number_or_null, "year": "2024_or_2025"}

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
        console.log(`  ✅ Source: ${parsed.source || 'unknown'}`);
        if (parsed.national_average) {
          console.log(`  🇺🇸 National: $${parsed.national_average.toLocaleString()}/year`);
        }
        if (parsed.texas_average) {
          console.log(`  🤠 Texas: $${parsed.texas_average.toLocaleString()}/year`);
        }
        console.log(`  📅 Year: ${parsed.year || 'unknown'}\n`);
      } catch (parseError) {
        console.log(`  ❌ JSON parse failed: ${parseError.message}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }

  // Test 4: Rate Reasonableness Check
  console.log('🎯 Test 4: Rate Reasonableness Analysis...\n');
  
  const reasonableRanges = {
    national: { min: 1200, max: 6000, description: 'National average range' },
    texas: { min: 1800, max: 4500, description: 'Texas typical range' },
    utah: { min: 600, max: 2000, description: 'Utah typical range (lower risk)' },
    newyork: { min: 800, max: 3500, description: 'New York range' },
    florida: { min: 2500, max: 8000, description: 'Florida range (hurricane risk)' }
  };

  console.log('Expected reasonable ranges for annual homeowners insurance:');
  Object.entries(reasonableRanges).forEach(([region, range]) => {
    console.log(`  ${region.toUpperCase()}: $${range.min.toLocaleString()} - $${range.max.toLocaleString()} (${range.description})`);
  });
  
  console.log('\n📊 Rate validation guidelines:');
  console.log('  • Rates below $500/year: Likely too low, possible data error');
  console.log('  • Rates $500-$1200: Low risk states (Utah, Idaho, etc.)');
  console.log('  • Rates $1200-$2500: National average range');
  console.log('  • Rates $2500-$4000: High-value or moderate risk areas');
  console.log('  • Rates $4000+: High-risk areas (hurricanes, earthquakes, wildfires)');
  console.log('  • Rates $8000+: Likely outliers or luxury properties\n');

  console.log('🏁 Insurance system testing completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Run the app and test with real ZIP codes');
  console.log('2. Compare fetched rates against the ranges above');
  console.log('3. Verify UI shows multiple options correctly');
  console.log('4. Test calculation with selected insurance option');
  console.log('5. Test fallback behavior when sources fail');
}

// Run the test
if (require.main === module) {
  testInsuranceSystem().catch(console.error);
}

module.exports = { testInsuranceSystem };