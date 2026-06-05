import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncProductToMeta, syncAllProductsToMeta, deleteProductFromMeta } from '@/lib/metaCatalog';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { productId, action } = await request.json().catch(() => ({}));

    // If an action to sync all products is requested
    if (action === 'sync_all') {
      const { data: products, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('❌ Error fetching products for manual sync:', error);
        return NextResponse.json({ success: false, error: 'Database fetch failed' }, { status: 500 });
      }

      if (!products || products.length === 0) {
        return NextResponse.json({ success: true, message: 'No products to sync' }, { status: 200 });
      }

      const result = await syncAllProductsToMeta(products);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // Handle delete action
    if (action === 'delete') {
      if (!productId) {
        return NextResponse.json({ success: false, error: 'productId is required for delete' }, { status: 400 });
      }
      const result = await deleteProductFromMeta(productId);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // Otherwise, sync a specific product by ID
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId or action required' }, { status: 400 });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      console.error(`❌ Product not found for sync (ID: ${productId}):`, error);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const result = await syncProductToMeta(product);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    console.error('❌ On-Demand Sync Handler Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
