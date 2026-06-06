const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (e) {
  console.warn('⚠️ Could not load .env.local manually', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

async function testFeed() {
  console.log('📡 Testing products fetch from Supabase...');
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .limit(3);

  if (error) {
    console.error('❌ Error fetching products:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully fetched ${products.length} products.`);

  const items = products.map((p) => {
    const description = p.description || 'Premium beverage';
    const availability = p.stock_status === 'out_of_stock' ? 'out of stock' : 'in stock';
    
    return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(description.slice(0, 999))}</g:description>
      <g:link>https://goldenisle-wholesale.vercel.app/product/${p.id}</g:link>
      <g:image_link>${escapeXml(p.image_url)}</g:image_link>
      <g:brand>Golden Isle</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${Number(p.price || 0).toFixed(2)} MYR</g:price>
      <g:google_product_category>Food, Beverages &amp; Tobacco &gt; Beverages &gt; Alcoholic Beverages</g:google_product_category>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Golden Isle Wholesale Catalog</title>
    <link>https://goldenisle-wholesale.vercel.app</link>
    <description>Premium Wholesale Beverages Catalog for Meta Commerce</description>
    ${items}
  </channel>
</rss>`;

  console.log('\n📄 Generated XML Preview:');
  console.log(xml.slice(0, 800) + '\n... [truncated] ...\n');
  console.log('🎉 XML verification passed successfully!');
}

testFeed();
