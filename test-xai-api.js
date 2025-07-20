const axios = require('axios');
require('dotenv').config();

async function testXAIGrokAPI() {
  console.log('🧪 Testing xAI Grok API for FHA Mortgage Rates...\n');
  
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: XAI_API_KEY environment variable not set');
    console.log('Please set your xAI API key in .env file or environment variables');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log(`🔑 Key preview: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // Test 1: Basic API connectivity
  console.log('📡 Test 1: Testing basic API connectivity...');
  
  try {
    const testResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3-mini-fast-beta',
      messages: [{
        role: 'user',
        content: 'Hello, can you respond with just "API_TEST_SUCCESS"?'
      }],
      stream: false,
      max_tokens: 200,
      temperature: 0
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Basic API connectivity successful');
    const message = testResponse.data.choices[0].message;
    const response = message.content || message.reasoning_content || 'No content found';
    console.log(`📝 Response: ${response}\n`);
  } catch (error) {
    console.error('❌ Basic API test failed:', error.response?.data || error.message);
    return;
  }

  // Test 2: Live Search functionality test
  console.log('🔍 Test 2: Testing Live Search functionality...');
  
  try {
    const searchTestResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3-mini-fast-beta',
      messages: [{
        role: 'user',
        content: 'Search for current information about FHA mortgage rates. Just respond with "SEARCH_TEST_SUCCESS" if you can access web search.'
      }],
      stream: false,
      search_parameters: {
        mode: 'on',
        return_citations: true,
        max_search_results: 3
      },
      max_tokens: 100,
      temperature: 0
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    console.log('✅ Live Search test successful');
    const searchMessage = searchTestResponse.data.choices[0].message;
    const searchResponse = searchMessage.content || searchMessage.reasoning_content || 'No content found';
    console.log(`📝 Search Response: ${searchResponse}\n`);
  } catch (error) {
    console.error('❌ Live Search test failed:', error.response?.data || error.message);
    console.log('⚠️  Continuing with direct rate query...\n');
  }

  // Test 3: Mortgage rate data retrieval
  console.log('🏠 Test 3: Testing FHA mortgage rate data retrieval from mortgagenewsdaily.com...');
  
  try {
    const rateResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3-mini-fast-beta',
      reasoning_effort: 'low',
      messages: [{
        role: 'user',
        content: `Go to this exact webpage: https://www.mortgagenewsdaily.com/mortgage-rates/30-year-fha 

        Extract the current 30-year FHA mortgage rate from that page ONLY. Do not use any other sources.

        Return ONLY this JSON format with no explanation, reasoning, or additional text:
        {"rate": 6.85}
        
        Where rate is the current 30-year FHA rate as a number (no % symbol).
        
        If the exact page is not accessible, return:
        {"error": "Page not accessible", "rate": null}
        
        RESPOND WITH JSON ONLY - NO OTHER TEXT.`
      }],
      stream: false,
      search_parameters: {
        mode: 'on',
        return_citations: true,
        max_search_results: 5
      },
      max_tokens: 4000,
      temperature: 0
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const rateMessage = rateResponse.data.choices[0].message;
    console.log('🔍 Full rate response data:', JSON.stringify(rateResponse.data, null, 2));
    
    // For JSON responses, check both content and reasoning_content
    const content = (rateMessage.content || rateMessage.reasoning_content || '').trim();
    console.log('📥 Raw API Response:', content);

    // Test 4: JSON parsing
    console.log('\n📋 Test 4: Testing JSON response parsing...');
    
    try {
      const parsedResponse = JSON.parse(content);
      console.log('✅ JSON parsing successful');
      console.log('📊 Parsed data:', parsedResponse);

      if (parsedResponse.rate && typeof parsedResponse.rate === 'number') {
        console.log(`\n🎯 SUCCESS: Found FHA rate: ${parsedResponse.rate}%`);
        console.log('✅ Rate validation passed - is a valid number');
        
        // Validate reasonable rate range
        if (parsedResponse.rate >= 3.0 && parsedResponse.rate <= 12.0) {
          console.log('✅ Rate is in reasonable range (3-12%)');
        } else {
          console.log('⚠️  Warning: Rate seems outside normal range');
        }
      } else if (parsedResponse.error) {
        console.log(`⚠️  API returned error: ${parsedResponse.error}`);
      } else {
        console.log('❌ Invalid response format - no valid rate found');
      }

    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.log('📝 Raw content that failed to parse:', content);
    }

  } catch (error) {
    console.error('❌ Mortgage rate retrieval failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Check your API key permissions');
    } else if (error.response?.status === 429) {
      console.log('⏱️  Rate limit exceeded - try again later');
    } else if (error.code === 'ECONNABORTED') {
      console.log('⏱️  Request timeout - API took too long to respond');
    }
  }

  console.log('\n🏁 xAI API testing completed');
}

// Run the test
if (require.main === module) {
  testXAIGrokAPI().catch(console.error);
}

module.exports = { testXAIGrokAPI };