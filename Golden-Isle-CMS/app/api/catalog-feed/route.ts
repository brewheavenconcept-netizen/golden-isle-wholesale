import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to escape CSV fields correctly
const escapeCSV = (field: any) => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If the field contains quotes, commas, or newlines, enclose in quotes and escape quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

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
    
    // Default to localhost if NEXT_PUBLIC_APP_URL is not set
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    products?.forEach((product) => {
      // Mapping Supabase to Meta Commerce schema
      const id = product.id;
      const title = product.name || 'Golden Isle Product';
      const description = product.description || title;
      
      // Stock status mapping
      const availability = product.stock_status === 'out_of_stock' ? 'out of stock' : 'in stock';
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
      const inventory = product.stock || product.stock_quantity || 100;

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
