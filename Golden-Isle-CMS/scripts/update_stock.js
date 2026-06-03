const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\n]+)"?`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Updating out-of-stock products to in-stock...');
  
  const { data, error } = await supabase
    .from('products')
    .update({ stock_status: 'in_stock', stock_quantity: 10 })
    .in('name', ['Duvel Belgian Golden Ale', 'Yamazaki 12 Year Single Malt'])
    .select();

  if (error) {
    console.error('Error updating stock:', error);
  } else {
    console.log('Successfully updated products:', data ? data.map(p => ({ name: p.name, stock_status: p.stock_status, stock_quantity: p.stock_quantity })) : 'No data returned');
  }
}

run();
