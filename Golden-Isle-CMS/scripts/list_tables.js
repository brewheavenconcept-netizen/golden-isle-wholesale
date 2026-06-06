const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}="?([^"\n]+)"?`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const tables = ['stores', 'store_settings', 'products', 'orders', 'super_admins', 'inquiries', 'whatsapp_logs'];
  console.log('Checking tables status:');
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`- ${table}: Tidak Aktif/Tiada Akses (${error.message})`);
    } else {
      console.log(`- ${table}: Aktif (Jumlah Rekod: ${count})`);
    }
  }
}

run();
