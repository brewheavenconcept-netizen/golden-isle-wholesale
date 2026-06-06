const { execSync } = require('child_process');
try {
  console.log('Updating WHATSAPP_FLOW_ID to exactly 953095320822501 in Vercel...');
  execSync('npx vercel env add WHATSAPP_FLOW_ID production --force -y', {
    input: '953095320822501',
    stdio: ['pipe', 'inherit', 'inherit']
  });
  console.log('Success!');
} catch (err) {
  console.error('Error updating env var:', err);
}
