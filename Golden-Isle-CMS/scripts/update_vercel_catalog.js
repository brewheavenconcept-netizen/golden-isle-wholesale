const { execSync } = require('child_process');
try {
  console.log('Updating WHATSAPP_CATALOG_ID to 261041882330744 in Vercel...');
  execSync('npx vercel env add WHATSAPP_CATALOG_ID production --force -y', {
    input: '261041882330744',
    stdio: ['pipe', 'inherit', 'inherit']
  });

  console.log('Updating META_CATALOG_ID to 261041882330744 in Vercel...');
  execSync('npx vercel env add META_CATALOG_ID production --force -y', {
    input: '261041882330744',
    stdio: ['pipe', 'inherit', 'inherit']
  });

  console.log('Triggering Vercel deployment to apply new environment variables...');
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });

  console.log('🎉 Vercel Catalog Config Sync Completed successfully!');
} catch (err) {
  console.error('❌ Error during Vercel config sync:', err.message);
}
