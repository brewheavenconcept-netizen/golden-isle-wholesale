const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\n]+)"?`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
const waToken = getEnvVar('WHATSAPP_TOKEN');
const catalogId = getEnvVar('META_CATALOG_ID');
const appUrl = 'https://goldenisle-wholesale.vercel.app'; // Use production URL for public catalog access

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials missing from .env.local');
  process.exit(1);
}

if (!waToken || !catalogId) {
  console.error('❌ WHATSAPP_TOKEN or META_CATALOG_ID missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function mapProductToMeta(product) {
  let imageLink = product.image_url || '';
  if (imageLink.startsWith('/')) {
    imageLink = `${appUrl}${imageLink}`;
  }
  if (!imageLink) {
    imageLink = `${appUrl}/images/placeholder-product.png`;
  }

  const description = product.description?.trim() 
    || `Premium wholesale beverage from Golden Isle Wholesale.`;

  return {
    title: product.name,
    description: description.slice(0, 999),
    image_link: imageLink,
    link: `${appUrl}/product/${product.id}`,
    brand: 'Golden Isle',
    price: Math.round(Number(product.price || 0) * 100), // in cents (e.g. RM 240.00 -> 24000)
    currency: 'MYR',
    availability: product.stock_status === 'out_of_stock' ? 'out of stock' : 'in stock',
    condition: 'new',
    google_product_category: 'Food, Beverages & Tobacco > Beverages > Alcoholic Beverages',
  };
}

async function run() {
  console.log('📡 Connecting to Supabase...');
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('❌ Error fetching products from Supabase:', error);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('⚠️ No products found in Supabase.');
    process.exit(0);
  }

  console.log(`📦 Fetched ${products.length} products from Supabase.`);

  const requests = products.map(product => {
    console.log(`   🔗 Mapping: ${product.name} | Price: RM ${product.price} | Status: ${product.stock_status}`);
    return {
      method: 'UPDATE',
      retailer_id: product.id,
      data: mapProductToMeta(product)
    };
  });

  console.log(`🚀 Sending batch payload for ${requests.length} items to Meta Commerce Graph API...`);
  const url = `https://graph.facebook.com/v20.0/${catalogId}/batch`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error('❌ Meta Catalog Batch API Error:', JSON.stringify(resData, null, 2));
      process.exit(1);
    }

    console.log('🎉 Meta Catalog Sync Completed Successfully!');
    console.log('📄 Response Body:', JSON.stringify(resData, null, 2));
  } catch (err) {
    console.error('❌ Meta Catalog Connection Error:', err);
    process.exit(1);
  }
}

run();
