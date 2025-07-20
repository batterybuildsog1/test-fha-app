const { OpenAI } = require("openai");
require('dotenv').config({ path: './.env' });

async function debugKimi() {
  const stateName = 'Utah';
  console.log(`\n--- 🧪 Debugging Kimi Insurance Fetch for: ${stateName} ---\n`);

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: KIMI_API_KEY not found in .env file.');
    process.exit(1);
  }
  console.log('✅ KIMI_API_KEY found.');

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.moonshot.ai/v1",
  });

  const prompt = `Please analyze the content of the webpage at https://www.bankrate.com/insurance/homeowners-insurance/states/\n\nOn that page, locate the table showing average homeowners insurance rates by state for $300,000 in dwelling coverage.\n\nFind the row for "${stateName}".\n\nExtract the average annual premium value.\n\nReturn the data in this exact JSON format:\n{"premium": number, "coverage": 300000}\n\nIf the data cannot be found, return:\n{"error": "Data not found", "premium": null, "coverage": null}\n\nReturn JSON only.`;

  console.log('\n📝 Sending Prompt:\n---');
  console.log(prompt);
  console.log('---\n');

  try {
    const completion = await client.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that extracts structured data from web pages. Return only a single, valid JSON object." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    console.log('✅ Kimi API Response Received.');
    
    if (completion.usage) {
        console.log('\n📊 Token Usage:\n---');
        console.log(`  Prompt Tokens: ${completion.usage.prompt_tokens}`);
        console.log(`  Completion Tokens: ${completion.usage.completion_tokens}`);
        console.log(`  Total Tokens: ${completion.usage.total_tokens}`);
        console.log('---\n');
    }

    const raw = (completion.choices[0].message.content || "").trim();
    console.log('\n📦 Raw Response Body:\n---');
    console.log(raw);
    console.log('---\n');

    const jsonMatch = raw.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : raw;

    console.log('🔍 Attempting to parse JSON...');
    const parsed = JSON.parse(jsonString);
    console.log('✅ JSON Parsed Successfully:');
    console.log(parsed);

  } catch (error) {
    console.error('❌ Kimi API Call Failed:');
    console.error(error);
  }
}

debugKimi();