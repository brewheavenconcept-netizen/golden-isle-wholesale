const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\\n\\r]+)"?`));
  return match ? match[1] : null;
};

const waToken = getEnvVar('WHATSAPP_TOKEN');
const waPhoneId = getEnvVar('WHATSAPP_PHONE_NUMBER_ID');

async function checkWABA() {
  console.log('TokenSnippet:', waToken.substring(0, 15));
  console.log('PhoneId:', waPhoneId);
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/1358963436087358/subscribed_apps`, {
      headers: { Authorization: `Bearer ${waToken}` }
    });
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

checkWABA();
