// scripts/upload_crest.js
const fs = require('fs');
const path = require('path');

try {
  // Load .env.local
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/);
  const serviceRoleMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)/);
  
  if (!supabaseUrlMatch || !serviceRoleMatch) {
    console.error("Could not find Supabase URL or Service Role Key in .env.local");
    process.exit(1);
  }
  
  const supabaseUrl = supabaseUrlMatch[1].trim();
  const serviceRole = serviceRoleMatch[1].trim();
  
  const filePath = path.join(__dirname, '../public/logo_crest.png');
  if (!fs.existsSync(filePath)) {
    console.error("logo_crest.png file does not exist at path:", filePath);
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log("Uploading logo_crest to Supabase storage...");
  
  fetch(`${supabaseUrl}/storage/v1/object/product-images/logo_crest.png`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true'
    },
    body: fileBuffer
  })
  .then(async (res) => {
    if (res.ok) {
      console.log("✅ logo_crest uploaded successfully!");
      console.log("Public URL:", `${supabaseUrl}/storage/v1/object/public/product-images/logo_crest.png`);
    } else {
      console.error("❌ Upload failed:", await res.text());
    }
  })
  .catch((err) => {
    console.error("Error during fetch:", err);
  });
} catch (e) {
  console.error("Error running upload script:", e);
}
