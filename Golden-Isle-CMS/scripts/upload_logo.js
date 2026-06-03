// scripts/upload_logo.js
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
  
  const fileLocation = "C:\\Users\\eddyr\\.gemini\\antigravity-ide\\brain\\b5cb8dd3-b6c8-4b2d-b604-c1bda5f923e0\\media__1780477471125.png";
  
  if (!fs.existsSync(fileLocation)) {
    console.error("Generated logo file does not exist at path:", fileLocation);
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(fileLocation);
  
  console.log("Uploading logo to Supabase storage...");
  
  fetch(`${supabaseUrl}/storage/v1/object/product-images/logo.png`, {
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
      console.log("✅ Logo uploaded successfully!");
      console.log("Public URL:", `${supabaseUrl}/storage/v1/object/public/product-images/logo.png`);
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
