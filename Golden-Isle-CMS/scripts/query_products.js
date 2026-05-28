const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\n]+)"?`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: stores, error: sErr } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
  if (sErr) {
    console.error('Error fetching stores:', sErr);
    return;
  }
  console.log('Stores:', stores.map(s => ({ id: s.id, name: s.name, slug: s.slug })));

  if (stores.length === 0) {
    console.log('No stores found');
    return;
  }

  const storeId = stores[0].id;
  const { data: products, error: pErr } = await supabase.from('products').select('*').eq('store_id', storeId);
  if (pErr) {
    console.error('Error fetching products:', pErr);
    return;
  }

  console.log('Products for store', stores[0].name, ':', products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    stock_status: p.stock_status,
    stock_quantity: p.stock_quantity,
    image_url: p.image_url,
    description: p.description
  })));
}

run();
