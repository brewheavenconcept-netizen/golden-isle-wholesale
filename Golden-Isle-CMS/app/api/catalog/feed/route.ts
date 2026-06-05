import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';

function escapeXml(str: string | null | undefined): string {
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

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching products for catalog feed:', error);
      return new NextResponse('Database Error', { status: 500 });
    }

    const items = (products || []).map((p) => {
      let imageLink = p.image_url || '';
      if (imageLink.startsWith('/')) {
        imageLink = `${appUrl}${imageLink}`;
      }
      if (!imageLink) {
        imageLink = `${appUrl}/images/placeholder-product.png`;
      }

      const description = p.description?.trim() 
        || `Premium ${p.category || 'beverage'} from Golden Isle Wholesale.`;

      const availability = p.stock_status === 'out_of_stock' ? 'out of stock' : 'in stock';

      return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(description.slice(0, 999))}</g:description>
      <g:link>${escapeXml(`${appUrl}/product/${p.id}`)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
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
    <link>${escapeXml(appUrl)}</link>
    <description>Premium Wholesale Beverages Catalog for Meta Commerce</description>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error('❌ Catalog Feed Handler Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
