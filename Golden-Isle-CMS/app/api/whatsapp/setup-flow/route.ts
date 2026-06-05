import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ── ONE-TIME SETUP: Create & Publish WhatsApp Flow ────────────────────────────
// Visit: GET /api/whatsapp/setup-flow?secret=golden_isle_secret_token
// This auto-fetches products from Supabase, builds the Flow UI JSON,
// registers it with Meta, publishes it, and returns the Flow ID.
// Store the returned flow_id as WHATSAPP_FLOW_ID in Vercel env vars.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Simple auth guard — reuse existing verify token
  if (secret !== (process.env.WHATSAPP_VERIFY_TOKEN || 'golden_isle_secret_token')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!waToken || !waPhoneId) {
    return NextResponse.json({ error: 'Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID' }, { status: 500 });
  }

  // ── Step 1: Auto-detect WABA ID from Phone Number ID ─────────────────────
  const phoneRes = await fetch(
    `https://graph.facebook.com/v20.0/${waPhoneId}?fields=whatsapp_business_account`,
    { headers: { Authorization: `Bearer ${waToken}` } }
  );
  const phoneData = await phoneRes.json();
  const wabaId = phoneData?.whatsapp_business_account?.id || process.env.WHATSAPP_WABA_ID;

  if (!wabaId) {
    return NextResponse.json({
      error: 'Could not detect WABA ID. Please set WHATSAPP_WABA_ID env var manually.',
      phone_response: phoneData,
    }, { status: 500 });
  }

  // ── Step 2: Fetch live products from Supabase ─────────────────────────────
  const { data: products, error: dbError } = await supabase
    .from('products')
    .select('id, name, price, category')
    .eq('stock_status', 'in_stock')
    .order('category')
    .limit(20);

  if (dbError || !products || products.length === 0) {
    return NextResponse.json({ error: 'No in-stock products found in Supabase.', details: dbError }, { status: 400 });
  }

  // ── Step 3: Build WhatsApp Flow JSON ─────────────────────────────────────
  // WA Dropdown label limit: 24 chars for id, 30 chars for title
  const productDataSource = products.map(p => ({
    id: `prod_${p.id}`.slice(0, 200),
    title: `${p.name} — RM ${Number(p.price).toFixed(2)}`.slice(0, 30),
  }));

  const flowJson = {
    version: '6.1',
    screens: [
      {
        id: 'ORDER_FORM',
        title: 'Buat Pesanan 🛒',
        terminal: true,
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'TextHeading',
              text: 'Golden Isle Wholesale',
            },
            {
              type: 'TextBody',
              text: 'Isi borang di bawah. Kami akan hubungi anda untuk sahkan pesanan dalam masa 24 jam.',
            },
            {
              type: 'Form',
              name: 'order_form',
              children: [
                {
                  type: 'Dropdown',
                  label: 'Pilih Produk',
                  name: 'product_id',
                  required: true,
                  'data-source': productDataSource,
                },
                {
                  type: 'TextInput',
                  label: 'Kuantiti (peti / botol)',
                  name: 'quantity',
                  'input-type': 'number',
                  required: true,
                  'helper-text': 'Masukkan jumlah yang mau dipesan',
                },
                {
                  type: 'TextInput',
                  label: 'Nama Penuh',
                  name: 'customer_name',
                  'input-type': 'text',
                  required: true,
                },
                {
                  type: 'TextInput',
                  label: 'Alamat Penghantaran',
                  name: 'delivery_address',
                  'input-type': 'text',
                  required: true,
                  'helper-text': 'Contoh: No 5, Jalan Pantai, Kota Kinabalu',
                },
                {
                  type: 'TextInput',
                  label: 'Catatan (Tidak wajib)',
                  name: 'notes',
                  'input-type': 'text',
                  required: false,
                  'helper-text': 'Contoh: Antar pagi, ring bell',
                },
                {
                  type: 'Footer',
                  label: 'Hantar Pesanan 🛒',
                  'on-click-action': {
                    name: 'complete',
                    payload: {},
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

  // ── Step 4: Create the flow (POST /{waba_id}/flows) ───────────────────────
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/flows`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Golden Isle Order Form',
      categories: ['UTILITY'],
    }),
  });

  const createData = await createRes.json();
  if (!createData.id) {
    return NextResponse.json({ error: 'Failed to create flow', meta_response: createData }, { status: 500 });
  }

  const flowId: string = createData.id;

  // ── Step 5: Upload Flow JSON as asset ─────────────────────────────────────
  const flowJsonBuffer = Buffer.from(JSON.stringify(flowJson), 'utf-8');
  const formData = new FormData();
  formData.append('file', new Blob([flowJsonBuffer], { type: 'application/json' }), 'flow.json');
  formData.append('name', 'flow.json');
  formData.append('asset_type', 'FLOW_JSON');

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${flowId}/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${waToken}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();

  if (!uploadData.success) {
    return NextResponse.json({
      error: 'Flow created but JSON upload failed. Flow is in DRAFT. Check flow JSON format.',
      flow_id: flowId,
      upload_response: uploadData,
      action_required: `Please set WHATSAPP_FLOW_ID=${flowId} in Vercel env vars and use draft mode for testing.`,
    }, { status: 207 });
  }

  // ── Step 6: Publish the flow ───────────────────────────────────────────────
  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${flowId}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
  });

  const publishData = await publishRes.json();

  return NextResponse.json({
    success: true,
    flow_id: flowId,
    published: publishData.success === true,
    waba_id: wabaId,
    products_included: products.length,
    next_step: `✅ DONE! Copy this and add to Vercel env vars:\n\nWHATSAPP_FLOW_ID=${flowId}\nWHATSAPP_WABA_ID=${wabaId}`,
    publish_response: publishData,
  });
}
