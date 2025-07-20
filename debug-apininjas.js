const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function debugApiNinjas() {
  const zip = '84737'; // The ZIP code that was failing
  console.log(`\n--- 🧪 Debugging API Ninjas Property Tax Fetch for ZIP: ${zip} ---\n`);

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: API_NINJAS_KEY not found in .env file.');
    process.exit(1);
  }
  console.log('✅ API_NINJAS_KEY found.');

  const url = `https://api.api-ninjas.com/v1/propertytax?zip=${zip}`;
  console.log(`\n📡 Requesting URL: ${url}\n`);

  try {
    const res = await axios.get(url, {
      headers: { "X-Api-Key": apiKey },
      timeout: 15000,
    });

    console.log('✅ API Ninjas Response Status:', res.status);
    console.log('\n📦 Raw Response Body:\n---');
    console.log(JSON.stringify(res.data, null, 2));
    console.log('---\n');

    if (Array.isArray(res.data) && res.data.length > 0) {
        const rawRate = res.data[0].property_tax_rate_50th_percentile;
        console.log(`🔍 Extracted 'property_tax_rate_50th_percentile': ${rawRate}`);
        if (typeof rawRate === 'number' && Number.isFinite(rawRate)) {
            console.log('✅ Rate is a valid number.');
        } else {
            console.error('❌ Extracted rate is NOT a valid number.');
        }
    } else {
        console.error('❌ Response is not an array or is empty.');
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API Ninjas Call Failed (Axios Error)');
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

debugApiNinjas();
