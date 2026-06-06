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
const flowId = getEnvVar('WHATSAPP_FLOW_ID');

console.log('Credentials loaded:');
console.log('Phone ID:', waPhoneId);
console.log('Flow ID:', flowId);
console.log('Token snippet:', waToken ? waToken.substring(0, 15) + '...' : 'null');

async function testSend() {
  const to = '601164073143'; // Let's try sending to the WhatsApp business number or a dummy
  const flowToken = `gi_order_test_${Date.now()}`;

  const url = `https://graph.facebook.com/v20.0/${waPhoneId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: { type: 'text', text: '🛒 Borang Pesanan' },
      body: {
        text: 'Pilih produk, isi kuantiti & alamat — terus dalam WhatsApp tanpa perlu buka browser! Pesanan anda akan disahkan dalam 24 jam. 🥃',
      },
      footer: { text: 'Golden Isle Wholesale' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_action: 'navigate',
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: 'Isi Borang Pesanan ▶',
          mode: 'draft',
          flow_action_payload: {
            screen: 'ORDER_FORM',
          },
        },
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testSend();
