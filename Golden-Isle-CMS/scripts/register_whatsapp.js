const waToken = 'EAAbWYxG7kpABRstjKQlSwTi6q8cRCcbYZBVXztsJVnFSTAB5VbGUji64cgrUfuGZBecuMR7ieTVraT8MaysD5fFT2s4bdMnSjpCOfi8n8AjH5xakdr2rYvNIj8lIE4SK2s7fiopUFDsZBq6cEF4RtxGTYKMIZA7moXOgu0mVU8OXCbZBuoYzrniam9tR6SQZDZD';
const phoneId = '1142253698973429';

async function registerNumber() {
  console.log('Sending registration request...');
  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: '112233',
      }),
    });

    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response data:', data);
  } catch (err) {
    console.error('Error during fetch:', err);
  }
}

registerNumber();
