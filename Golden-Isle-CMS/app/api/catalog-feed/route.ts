import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to escape CSV fields correctly
const escapeCSV = (field: unknown) => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If the field contains quotes, commas, or newlines, enclose in quotes and escape quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

function getPublicAppUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    return configuredUrl.replace(/\/$/, '');
  }

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return new NextResponse('Supabase configuration is missing', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch products. We ignore drafts and archived.
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      // .eq('status', 'active'); // Using stock_status check to be safe if status is missing

    if (error) {
      console.error('Error fetching products for Meta feed:', error);
      return new NextResponse('Failed to fetch products', { status: 500 });
    }

    // Required CSV Headers for Meta Commerce Manager
    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
      'inventory'
    ];

    let csvContent = headers.join(',') + '\n';
    
    const appUrl = getPublicAppUrl(request);

    products?.forEach((product) => {
      // Mapping Supabase to Meta Commerce schema
      const id = product.id;
      const title = product.name || 'Golden Isle Product';
      const description = product.description || title;
      
      // Stock status mapping
      const stockQuantity = Number(product.stock_quantity ?? product.stock ?? 0);
      const availability = product.stock_status === 'in_stock' && stockQuantity > 0 ? 'in stock' : 'out of stock';
      const condition = 'new';
      
      // Meta requires price with ISO 4217 currency code e.g. "9.99 MYR"
      const price = `${Number(product.price || 0).toFixed(2)} MYR`;
      
      // Provide a direct product link
      const link = `${appUrl}/product/${product.id}`; 
      
      // Image Link parsing
      let image_link = `${appUrl}/images/placeholder-product.png`;
      if (product.image_url) {
        image_link = product.image_url.startsWith('/') ? `${appUrl}${product.image_url}` : product.image_url;
      } else if (product.images && product.images.length > 0) {
        image_link = product.images[0].startsWith('/') ? `${appUrl}${product.images[0]}` : product.images[0];
      }

      const brand = 'Golden Isle Wholesale';
      const inventory = Math.max(0, stockQuantity);

      const row = [
        id,
        title,
        description,
        availability,
        condition,
        price,
        link,
        image_link,
        brand,
        inventory
      ].map(escapeCSV);

      csvContent += row.join(',') + '\n';
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="golden_isle_meta_catalog.csv"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Meta catalog feed generation error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
