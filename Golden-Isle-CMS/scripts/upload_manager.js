// scripts/upload_manager.js
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
  
  const brainDir = "C:\\Users\\eddyr\\.gemini\\antigravity-ide\\brain\\b5cb8dd3-b6c8-4b2d-b604-c1bda5f923e0";
  if (!fs.existsSync(brainDir)) {
    console.error("Brain directory does not exist:", brainDir);
    process.exit(1);
  }

  const files = fs.readdirSync(brainDir);
  const targetPrefixes = [
    'warehouse_manager'
  ];
  
  const filesToUpload = {};
  
  // Find the latest files for each prefix
  for (const prefix of targetPrefixes) {
    const matching = files
      .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
      .map(f => {
        const fullPath = path.join(brainDir, f);
        return {
          name: f,
          path: fullPath,
          stat: fs.statSync(fullPath)
        };
      })
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
      
    if (matching.length > 0) {
      filesToUpload[prefix] = matching[0].path;
    }
  }

  if (Object.keys(filesToUpload).length === 0) {
    console.error("No generated manager images found to upload.");
    process.exit(1);
  }

  console.log("Found files to upload:", filesToUpload);

  async function uploadFile(prefix, filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const destName = `${prefix}.png`;
    console.log(`Uploading ${prefix} from ${filePath} to Supabase storage as ${destName}...`);
    
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${destName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true'
        },
        body: fileBuffer
      });
      
      if (res.ok) {
        console.log(`✅ ${destName} uploaded successfully!`);
        console.log(`Public URL: ${supabaseUrl}/storage/v1/object/public/product-images/${destName}`);
      } else {
        console.error(`❌ ${destName} upload failed:`, await res.text());
      }
    } catch (err) {
      console.error(`Error uploading ${destName}:`, err);
    }
  }

  async function uploadAll() {
    for (const [prefix, filePath] of Object.entries(filesToUpload)) {
      await uploadFile(prefix, filePath);
    }
    console.log("All uploads finished!");
  }

  uploadAll();

} catch (e) {
  console.error("Error running upload script:", e);
}
