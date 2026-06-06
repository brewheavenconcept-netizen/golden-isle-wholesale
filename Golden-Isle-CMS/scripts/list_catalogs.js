const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\n\r]+)"?`));
  return match ? match[1] : null;
};

const waToken = getEnvVar('WHATSAPP_TOKEN');
const wabaId = getEnvVar('WHATSAPP_WABA_ID');
const phoneId = getEnvVar('WHATSAPP_PHONE_NUMBER_ID');

async function debugCatalogs() {
  console.log('--- Debugging Meta Catalogs ---');
  console.log('WABA ID:', wabaId);
  console.log('Phone ID:', phoneId);

  // 1. Check catalogs for WABA
  try {
    const url = `https://graph.facebook.com/v20.0/${wabaId}/product_catalogs`;
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${waToken}` }
    });
    const data = await res.json();
    console.log('WABA Catalogs Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching WABA catalogs:', err);
  }

  // 2. Check catalog details directly
  try {
    const catalogId = '261041882330744';
    const url = `https://graph.facebook.com/v20.0/${catalogId}`;
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${waToken}` }
    });
    const data = await res.json();
    console.log('Catalog ID Details Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching catalog by ID:', err);
  }

  // 3. Check debug token permissions / info
  try {
    const url = `https://graph.facebook.com/debug_token?input_token=${waToken}`;
    console.log(`Fetching debug token info...`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${waToken}` } // requires app access token or user access token
    });
    const data = await res.json();
    console.log('Token Info Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching token info:', err);
  }
}

debugCatalogs();
