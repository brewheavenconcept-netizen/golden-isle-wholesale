// scripts/upload_logo_components.js
const fs = require('fs');
const path = require('path');

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/);
  const serviceRoleMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)/);
  
  if (!supabaseUrlMatch || !serviceRoleMatch) {
    console.error("Could not find Supabase URL or Service Role Key in .env.local");
    process.exit(1);
  }
  
  const supabaseUrl = supabaseUrlMatch[1].trim();
  const serviceRole = serviceRoleMatch[1].trim();
  
  const files = ['logo_crest.png', 'logo_brand_text.png', 'logo_wholesale_text.png'];
  
  async function uploadFile(fileName) {
    const filePath = path.join(__dirname, '../public', fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`${fileName} does not exist at path: ${filePath}`);
      return;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`Uploading ${fileName} to Supabase storage...`);
    
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true'
        },
        body: fileBuffer
      });
      
      if (res.ok) {
        console.log(`✅ ${fileName} uploaded successfully!`);
        console.log(`Public URL: ${supabaseUrl}/storage/v1/object/public/product-images/${fileName}`);
      } else {
        console.error(`❌ ${fileName} upload failed:`, await res.text());
      }
    } catch (err) {
      console.error(`Error uploading ${fileName}:`, err);
    }
  }

  async function uploadAll() {
    for (const file of files) {
      await uploadFile(file);
    }
    console.log("All components uploaded!");
  }

  uploadAll();
} catch (e) {
  console.error("Error running upload script:", e);
}
