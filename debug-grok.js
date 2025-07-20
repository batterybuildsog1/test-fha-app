const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function debugGrok() {
  const stateName = 'Utah'; // The state that was failing
  console.log(`\n--- 🧪 Debugging Grok Insurance Fetch for: ${stateName} ---\n`);

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: XAI_API_KEY not found in .env file.');
    process.exit(1);
  }
  console.log('✅ XAI_API_KEY found.');

  const prompt = `FETCH https://www.bankrate.com/insurance/homeowners-insurance/states/

On this page, locate the table showing average homeowners insurance rates by state for $300,000 in dwelling coverage (it may be titled "Average homeowners insurance rates by state" or similar, with columns for State and Average annual premium).

Find the row for "${stateName}".

Extract the average annual premium value (a number like 4078).

Confirm the table uses $300,000 dwelling coverage (noted in the page text or table description).

Return the data in this exact JSON format:
{"premium": number, "coverage": 300000}

Example:
{"premium": 4078, "coverage": 300000}

If the table, state, or premium cannot be found, or if coverage isn't $300,000:
{"error": "Data not found or mismatched coverage", "premium": null, "coverage": null}

Return JSON only.`;

  console.log('\n📝 Sending Prompt:\n---');
  console.log(prompt);
  console.log('---\n');

  try {
    const res = await axios.post(
      "https://api.x.ai/v1/chat/completions",
      {
        model: "grok-3-beta",
        stream: false,
        messages: [{ role: "user", content: prompt }],
        search_parameters: { mode: "on" },
        max_tokens: 400,
        temperature: 0,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: 45000,
      }
    );

    console.log('✅ Grok API Response Status:', res.status);
    const raw = (res.data.choices[0].message.content || "").trim();
    console.log('\n📦 Raw Response Body:\n---');
    console.log(raw);
    console.log('---\n');

    console.log('🔍 Attempting to parse JSON...');
    const parsed = JSON.parse(raw);
    console.log('✅ JSON Parsed Successfully:');
    console.log(parsed);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Grok API Call Failed (Axios Error)');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('Body:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error Message:', error.message);
      }
    } else {
      console.error('❌ An unexpected error occurred:', error);
    }
  }
}

debugGrok();