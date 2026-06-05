import { Product } from '@/types';

const waToken = process.env.WHATSAPP_TOKEN;
const catalogId = process.env.META_CATALOG_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';

interface MetaProductData {
  title: string;
  description: string;
  image_link: string;
  link: string;
  brand: string;
  price: number;
  currency: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new';
  google_product_category?: string;
}

interface MetaBatchRequest {
  method: 'CREATE' | 'UPDATE' | 'DELETE';
  retailer_id: string;
  data?: MetaProductData;
}

/**
 * Sends a batch of product updates/creates/deletes to Meta Commerce Catalog API.
 */
export async function sendMetaCatalogBatch(requests: MetaBatchRequest[]): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!waToken) {
    console.warn('⚠️ Meta Catalog Sync skipped: WHATSAPP_TOKEN is not configured.');
    return { success: false, error: 'WHATSAPP_TOKEN not configured' };
  }
  if (!catalogId) {
    console.warn('⚠️ Meta Catalog Sync skipped: META_CATALOG_ID is not configured.');
    return { success: false, error: 'META_CATALOG_ID not configured' };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${catalogId}/batch`;
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
      return { success: false, error: resData.error?.message || 'Failed to sync with Meta Catalog' };
    }

    console.log('✅ Meta Catalog Batch Sync Success:', JSON.stringify(resData, null, 2));
    return { success: true, data: resData };
  } catch (err: any) {
    console.error('❌ Meta Catalog Batch API Connection Error:', err);
    return { success: false, error: err.message || 'Connection error' };
  }
}

/**
 * Helper to map a Supabase Product object to Meta Catalog product data schema.
 */
function mapProductToMeta(product: Product): MetaProductData {
  let imageLink = (product.images && product.images.length > 0) ? product.images[0] : '';
  if (imageLink.startsWith('/')) {
    imageLink = `${appUrl}${imageLink}`;
  }
  // Fallback image if none provided (Meta Catalog requires a valid image URL)
  if (!imageLink) {
    imageLink = `${appUrl}/images/placeholder-product.png`;
  }

  // Meta Catalog requires a description. Fallback if empty.
  const description = product.description?.trim() 
    || `Premium ${product.category || 'beverage'} from Golden Isle Wholesale.`;

  return {
    title: product.name,
    description: description.slice(0, 999), // Meta limit is 9999 characters but let's keep it safe
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

/**
 * Instantly syncs/updates a single product to Meta Catalog.
 */
export async function syncProductToMeta(product: Product) {
  const data = mapProductToMeta(product);
  const requests: MetaBatchRequest[] = [
    {
      method: 'UPDATE', // UPDATE will create the item if it doesn't exist
      retailer_id: product.id,
      data,
    },
  ];
  return sendMetaCatalogBatch(requests);
}

/**
 * Instantly deletes a product from Meta Catalog.
 */
export async function deleteProductFromMeta(productId: string) {
  const requests: MetaBatchRequest[] = [
    {
      method: 'DELETE',
      retailer_id: productId,
    },
  ];
  return sendMetaCatalogBatch(requests);
}

/**
 * Syncs all products to Meta Catalog as a batch.
 */
export async function syncAllProductsToMeta(products: Product[]) {
  const requests: MetaBatchRequest[] = products.map(product => ({
    method: 'UPDATE',
    retailer_id: product.id,
    data: mapProductToMeta(product),
  }));
  return sendMetaCatalogBatch(requests);
}
