const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\\n\\r]+)"?`));
  return match ? match[1] : null;
};

const waToken = getEnvVar('WHATSAPP_TOKEN');
const flowId = getEnvVar('WHATSAPP_FLOW_ID');

async function checkFlow() {
  const url = `https://graph.facebook.com/v20.0/${flowId}?fields=id,name,status,validation_errors,categories,preview`;
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${waToken}`
      }
    });
    const data = await res.json();
    console.log('Flow Status Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

checkFlow();
