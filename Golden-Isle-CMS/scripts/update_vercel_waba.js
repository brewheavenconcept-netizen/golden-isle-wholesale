const { execSync } = require('child_process');
try {
  console.log('Updating WHATSAPP_WABA_ID to exactly 1358963436087358 in Vercel...');
  execSync('npx vercel env add WHATSAPP_WABA_ID production --force -y', {
    input: '1358963436087358',
    stdio: ['pipe', 'inherit', 'inherit']
  });
  console.log('Success!');
} catch (err) {
  console.error('Error updating env var:', err);
}
