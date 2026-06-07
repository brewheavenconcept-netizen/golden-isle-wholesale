import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePdf } from '../../../lib/pdfGenerator';
import { buildPhoneOrFilter, normalizeOrderItems } from '@/lib/orderCompat';

// Setup Supabase (gunakan Service Role Key untuk bypass RLS dalam API)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function uploadWAMedia(buffer: Buffer, mimeType: string, filename: string) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return null;

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}` },
      body: form,
    });
    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.error('Error uploading media to WA:', err);
    return null;
  }
}

async function sendWAMediaById(to: string, mediaId: string, type: 'document' | 'audio', caption?: string, filename?: string) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return;

  const mediaObj: any = { id: mediaId };
  if (caption && type === 'document') mediaObj.caption = caption;
  if (filename && type === 'document') mediaObj.filename = filename;

  await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type,
      [type]: mediaObj,
    }),
  });
}

async function generateVoiceNoteBuffer(text: string): Promise<Buffer | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'onyx',
        input: text,
        response_format: 'aac'
      })
    });
    if (!res.ok) throw new Error('TTS API Error');
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Error generating voice note:', err);
    return null;
  }
}

// Hantar mesej teks biasa ke WA
async function sendWAText(to: string, text: string) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return;

  await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}

// Hantar mesej CTA URL interaktif ke WA
async function sendWACtaUrl(to: string, bodyText: string, paymentLink: string): Promise<boolean> {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return false;

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          header: {
            type: 'text',
            text: '🎉 Pesanan Diterima!'
          },
          body: {
            text: bodyText
          },
          footer: {
            text: 'Pesanan akan diproses sebaik bayaran disahkan.'
          },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: '💳 Bayar Sekarang',
              url: paymentLink
            }
          }
        }
      }),
    });
    if (!res.ok) {
      console.error('❌ sendWACtaUrl error:', await res.json());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending CTA URL:', err);
    return false;
  }
}

// Hantar mesej gambar berserta caption ke WA
async function sendWAImage(to: string, imageUrl: string, caption: string) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return;

  // Handle Supabase relative paths if needed, but usually image_url should be absolute or we format it.
  // Assuming imageUrl is a full valid URL here.
  let finalImageUrl = imageUrl;
  if (imageUrl.startsWith('/')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
    finalImageUrl = `${appUrl}${imageUrl}`;
  }

  await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: finalImageUrl,
        caption: caption,
      },
    }),
  });
}

// Hantar WA Interactive List (Catalog) — fallback lama
async function sendWAInteractiveList(to: string, sections: any[]) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return;

  await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: '🛍️ Golden Isle Catalog' },
        body: { text: 'Berikut senarai produk terkini kami. Pilih untuk lihat harga & detail.' },
        footer: { text: 'Hubungi kami untuk order terus!' },
        action: {
          button: 'Lihat Senarai ▼',
          sections,
        },
      },
    }),
  });
}

// ✅ NATIVE META CATALOG — Hantar full catalog dengan butang Add to Cart
async function sendWACatalogMessage(to: string, bodyText: string, thumbnailProductId?: string): Promise<boolean> {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const catalogId = process.env.WHATSAPP_CATALOG_ID;
  if (!waToken || !waPhoneId || !catalogId) return false;

  const action: any = { name: 'catalog_message' };
  if (thumbnailProductId) {
    action.parameters = { thumbnail_product_retailer_id: thumbnailProductId };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'catalog_message',
          body: { text: bodyText },
          footer: { text: 'Golden Isle Wholesale 🍻' },
          action,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('❌ sendWACatalogMessage error:', JSON.stringify(data));
      return false;
    }
    console.log('✅ Native catalog message sent!');
    return true;
  } catch (err) {
    console.error('❌ sendWACatalogMessage fetch error:', err);
    return false;
  }
}

// ✅ NATIVE PRODUCT LIST — Hantar senarai produk pilihan dengan Add to Cart
async function sendWAProductList(
  to: string,
  sections: Array<{ title: string; productIds: string[] }>,
  bodyText?: string
): Promise<boolean> {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const catalogId = process.env.WHATSAPP_CATALOG_ID;
  if (!waToken || !waPhoneId || !catalogId) return false;

  const apiSections = sections.map(s => ({
    title: s.title.slice(0, 24),
    product_items: s.productIds.map(id => ({ product_retailer_id: id })),
  }));

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: { type: 'text', text: '🛍️ Golden Isle Catalog' },
          body: { text: bodyText || 'Berikut produk terbaik kami bosku! Tekan Add to Cart untuk order terus! 🛒🍻' },
          footer: { text: 'Golden Isle Wholesale' },
          action: {
            catalog_id: catalogId,
            sections: apiSections,
          },
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('❌ sendWAProductList error:', JSON.stringify(data));
      return false;
    }
    console.log('✅ Native product list sent!');
    return true;
  } catch (err) {
    console.error('❌ sendWAProductList fetch error:', err);
    return false;
  }
}

// Hantar mesej dengan 3 Quick Reply Buttons ke WA
async function sendWAButtons(to: string, bodyText: string, buttons: { id: string; title: string }[]) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return;

  // WA limit: max 3 buttons, title max 20 chars
  const waButtons = buttons.slice(0, 3).map(b => ({
    type: 'reply',
    reply: {
      id: b.id,
      title: b.title.slice(0, 20),
    },
  }));

  await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: waButtons },
      },
    }),
  });
}

// Hantar WA Flow (Interactive Order Form)
async function sendWAFlow(to: string, flowId: string, mode: 'published' | 'draft' = 'published') {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) {
    console.error('❌ WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing in environment variables.');
    return;
  }

  // Unique token per send so we can track which flow submission belongs to whom
  const flowToken = `gi_order_${to}_${Date.now()}`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: { type: 'text', text: '🛒 Borang Pesanan' },
      body: {
        text: 'Pilih produk, isi kuantiti & alamat — terus dalam WhatsApp tanpa perlu buka browser! Pesanan anda akan disahkan dalam 24 jam. 🥃',
      },
      footer: { text: 'Golden Isle Wholesale' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_action: 'navigate',
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: 'Isi Borang Pesanan ▶',
          mode,
          flow_action_payload: {
            screen: 'ORDER_FORM',
          },
        },
      },
    },
  };

  console.log(`\n📤 SENDING FLOW: To: ${to} | FlowId: ${flowId} | Mode: ${mode}`);

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resData = await res.json();
    console.log(`📡 Meta API Response Status: ${res.status}`);
    if (!res.ok) {
      console.error('❌ Meta API Response Error Details:', JSON.stringify(resData, null, 2));
    } else {
      console.log('✅ Meta API Response Success Details:', JSON.stringify(resData, null, 2));
    }
  } catch (err) {
    console.error('❌ Fetch error during sendWAFlow:', err);
  }
}

// Notify Telegram Admin
async function notifyTelegram(msg: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
    }),
  });
}

// ── Intent Detector ─────────────────────────────────────────────────────────
function detectIntent(text: string): 'greet' | 'order' | 'catalog' | 'receipt' | 'suggest' | 'ai' {
  const lower = text.toLowerCase().trim();

  const greetKeywords = ['hai', 'hi', 'hello', 'helo', 'hey', 'assalamualaikum', 'salam', 'start', 'mula', 'mulakan', 'apa khabar', 'selamat'];
  const orderKeywords = ['order', 'pesan', 'beli', 'buat pesanan', 'nak beli', 'mau beli', 'nak order', 'mau order', 'tempah'];
  const catalogKeywords = ['catalog', 'katalog', 'senarai', 'produk', 'product', 'list', 'stok', 'stock', 'barang', 'harga semua'];
  const receiptKeywords = ['resit', 'receipt', 'order saya', 'pesanan', 'invois', 'invoice', 'status order', 'order status'];
  const suggestKeywords = ['cadangan', 'suggest', 'suggestion', 'feedback', 'idea', 'saranan', 'komen', 'comment', 'review'];

  // Greet only if short message (≤4 words) to avoid false positives
  if (greetKeywords.some(k => lower.includes(k)) && lower.split(' ').length <= 4) return 'greet';
  if (orderKeywords.some(k => lower.includes(k))) return 'order';
  if (catalogKeywords.some(k => lower.includes(k))) return 'catalog';
  if (receiptKeywords.some(k => lower.includes(k))) return 'receipt';
  if (suggestKeywords.some(k => lower.includes(k))) return 'suggest';
  return 'ai';
}

// ── Handlers ─────────────────────────────────────────────────────────────────

// GREETING: Hantar welcome message dengan 3 Quick Reply Buttons
async function handleGreeting(from: string) {
  await sendWAButtons(
    from,
    `👋 *Hai bosku! Selamat datang ke Golden Isle Wholesale* 🥃\n\nKIRA sedia bantu bosku cari minuman premium borong terbaik di Sabah & Labuan.\n\n*Apa yang KIRA boleh bantu hari ni bosku?*`,
    [
      { id: 'btn_order',   title: '🛒 Buat Pesanan' },
      { id: 'btn_receipt', title: '🧾 Semak Resit' },
      { id: 'btn_suggest', title: '💡 Beri Cadangan' },
    ]
  );
}

// GREETING REPEAT: Hantar repeat order offer kalau returning customer
async function handleRepeatGreeting(from: string): Promise<boolean> {
  // 1. Check unpaid orders
  const { data: unpaidOrder } = await supabase.from('orders')
    .select('id, total, status')
    .eq('customer_phone', from)
    .in('status', ['pending_payment', 'pending', 'unpaid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (unpaidOrder) {
    await sendWAButtons(from, `Eh bosku! KIRA nampak ada pesanan yang belum settle lagi ni (RM ${Number(unpaidOrder.total).toFixed(2)}). Settle dulu bosku baru kita borak order baru okay? 😉`, [
      { id: 'btn_receipt', title: '🧾 Semak Resit' },
      { id: 'btn_order', title: '🛍️ Tengok Catalog' }
    ]);
    return true; // handled
  }

  // 2. Check last completed order
  const { data: lastOrder } = await supabase.from('orders')
    .select('*')
    .eq('customer_phone', from)
    .in('status', ['completed', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastOrder) {
    const { data: customer } = await supabase.from('customers').select('name').eq('phone', from).single();
    const name = customer?.name || lastOrder.customer_name || 'bosku';
    const firstItem = lastOrder.items && lastOrder.items.length > 0 ? lastOrder.items[0] : null;
    let itemsSummary = 'Pesanan lepas';
    if (firstItem) {
      itemsSummary = `${firstItem.name || 'Produk'} x ${firstItem.quantity || 1} kotak`;
      if (lastOrder.items.length > 1) itemsSummary += ` (+${lastOrder.items.length - 1} lagi)`;
    }
    const dateStr = new Date(lastOrder.created_at).toLocaleDateString('ms-MY');

    await sendWAButtons(
      from,
      `Eh bosku ${name}! 👋\n\nSaya nampak order terakhir bosku:\n📦 ${itemsSummary}\n📅 ${dateStr}\n💰 Total: RM ${Number(lastOrder.total).toFixed(2)}\n\nNak repeat order sama macam tu? Saya boleh siapkan invoice dalam 30 saat je! ⚡`,
      [
        { id: `btn_repeat_confirm_${lastOrder.id}`, title: '✅ Ya, Repeat!' },
        { id: `btn_repeat_edit_${lastOrder.id}`, title: '✏️ Nak Tukar Sikit' },
        { id: 'btn_new_order', title: '🛍️ Order Baru' }
      ]
    );
    return true;
  }

  return false;
}

// ORDER FLOW: Hantar Katalog terus (Bypass WA Flow sementara waktu)
async function handleOrder(from: string) {
  // Fallback: tunjuk catalog interaktif terus sebab WA Flow 'draft' tak support WA Web
  await sendWAText(
    from,
    `🛒 *Bosku nak buat pesanan? Tengok-tengok katalog dulu ya!*\n\n` +
    `Pilih produk kat bawah ni, klik untuk tengok harga. ` +
    `Lepas order, KIRA akan uruskan cepat-cepat untuk bosku! 👇`
  );
  await handleCatalog(from);
}

// CATALOG: Cuba native Meta catalog dulu, fallback ke interactive list
async function handleCatalog(from: string) {
  const catalogId = process.env.WHATSAPP_CATALOG_ID;

  // ── 1. Cuba Native Meta Catalog (Add to Cart butang) ──────────────────────
  if (catalogId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, category')
      .eq('stock_status', 'in_stock')
      .order('category')
      .limit(30);

    if (!error && products && products.length > 0) {
      // Kumpul by category untuk product_list sections
      const grouped: Record<string, string[]> = {};
      for (const p of products) {
        const cat = (p.category || 'Lain-lain').toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        if (grouped[cat].length < 30) grouped[cat].push(String(p.id));
      }

      const nativeSections = Object.entries(grouped)
        .slice(0, 10)
        .map(([title, productIds]) => ({ title, productIds }));

      // Cuba product_list (tunjuk produk mengikut kategori)
      const sentList = await sendWAProductList(from, nativeSections);
      if (sentList) {
        await new Promise(r => setTimeout(r, 1000));
        await sendWAButtons(from, "👆 Boleh tengok katalog di atas bosku. Ada apa-apa lagi KIRA boleh bantu?", [
          { id: 'SEMAK_STOK', title: '📦 Semak Stok' },
          { id: 'TANYA_KIRA', title: '💬 Tanya KIRA' },
          { id: 'LIHAT_CATALOG', title: '🛍️ Tengok Semua' }
        ]);
        return;
      }

      // Fallback: catalog_message (tunjuk semua catalog sekaligus)
      const thumbnailId = String(products[0].id);
      const sentCatalog = await sendWACatalogMessage(
        from,
        '🛍️ Tengok semua produk Golden Isle bosku! Tekan produk untuk Add to Cart terus! 🛒🍻',
        thumbnailId
      );
      if (sentCatalog) {
        await new Promise(r => setTimeout(r, 1000));
        await sendWAButtons(from, "👆 Boleh tengok katalog di atas bosku. Ada apa-apa lagi KIRA boleh bantu?", [
          { id: 'SEMAK_STOK', title: '📦 Semak Stok' },
          { id: 'TANYA_KIRA', title: '💬 Tanya KIRA' },
          { id: 'LIHAT_CATALOG', title: '🛍️ Tengok Semua' }
        ]);
        return;
      }
    }
  }

  // ── 2. Fallback: WA Interactive List (lama) ────────────────────────────────
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, category, description')
    .eq('stock_status', 'in_stock')
    .order('category')
    .limit(10);

  if (error || !products || products.length === 0) {
    await sendWAText(from, '⚠️ Maaf bosku, stok sedang dikemaskini. Sila hubungi admin untuk info terbaru.');
    return;
  }

  const grouped: Record<string, typeof products> = {};
  for (const p of products) {
    const cat = p.category || 'Umum';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  const sections = Object.entries(grouped).map(([category, items]) => ({
    title: category.toUpperCase(),
    rows: items.slice(0, 10).map(p => ({
      id: `product_${p.id}`,
      title: p.name.slice(0, 24),
      description: `RM ${Number(p.price).toFixed(2)}${p.description ? ' — ' + p.description.slice(0, 50) : ''}`,
    })),
  }));

  const totalRows = sections.reduce((acc, s) => acc + s.rows.length, 0);
  if (totalRows > 10 || sections.length === 0) {
    const textList = products.map(p => `• *${p.name}*\n  💰 RM ${Number(p.price).toFixed(2)}`).join('\n\n');
    await sendWAText(from, `🛍️ *Golden Isle — Catalog Produk*\n\n${textList}\n\n_Pilih produk yang mau, taip nama dia terus ya bosku!_`);
  } else {
    await sendWAInteractiveList(from, sections);
    await new Promise(r => setTimeout(r, 1500));
    await sendWAText(
      from,
      `💡 *Bosku nampak something menarik?*\n\n` +
      `Klik produk kat atas tu untuk tengok harga penuh. Kalau pening, KIRA boleh suggest yang best untuk bosku! 😉\n\n` +
      `Taip je kat sini bosku, KIRA sedia membantu!`
    );
  }
}

// RECEIPT: Cari order terakhir by phone & hantar resit ringkas
async function handleReceipt(from: string) {
  const phoneFilter = buildPhoneOrFilter(['customer_phone', 'phone'], from);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, subtotal, delivery_fee, total, created_at, items, customer_name, customer_phone, phone')
    .or(phoneFilter)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !orders || orders.length === 0) {
    await sendWAText(
      from,
      '🔍 Alamak bosku, KIRA tak jumpa rekod order untuk nombor ni.\n\n💡 Bosku pakai nombor lain ka masa order? Jangan risau, taip je kat sini biar KIRA tolong check! 😊'
    );
    return;
  }

  const order = orders[0];
  const orderId = order.id;
  const statusEmoji = order.payment_status === 'paid' ? '✅' : order.payment_status === 'pending' ? '⏳' : '❌';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
  const pdfLink = `${appUrl}/api/invoice/${orderId}`;

  const createdDate = new Date(order.created_at).toLocaleDateString('ms-MY', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const normalizedItems = normalizeOrderItems(order.items);
  const itemsList = normalizedItems.length > 0
    ? normalizedItems.map((item: any) => `• ${item.name} x${item.quantity}`).join('\n')
    : '';

  const receiptMsg = [
    `🧾 *RESIT GOLDEN ISLE*`,
    `━━━━━━━━━━━━━━━`,
    `📋 REF: #${String(orderId).slice(-6).toUpperCase()}`,
    `📅 Tarikh: ${createdDate}`,
    ``,
    itemsList ? `📦 *Item:*\n${itemsList}` : '',
    ``,
    `💰 Subtotal: RM ${Number(order.subtotal).toFixed(2)}`,
    `🚚 Penghantaran: ${Number(order.delivery_fee) === 0 ? 'PERCUMA' : `RM ${Number(order.delivery_fee).toFixed(2)}`}`,
    `💳 *JUMLAH: RM ${Number(order.total).toFixed(2)}*`,
    ``,
    `${statusEmoji} Status: ${order.payment_status?.toUpperCase() || 'PENDING'}`,
    ``,
    `📄 Atau muat turun dari Web:\n${pdfLink}`,
    `━━━━━━━━━━━━━━━`,
    `_Sama-sama bosku! Jangan segan order lagi tau 😊_`,
  ].filter(Boolean).join('\n');

  await sendWAText(from, receiptMsg);

  // --- 2. Generate & Send PDF Document ---
  try {
    const cartItems = normalizedItems.map((item: any) => ({
      name: item.name,
      category: item.category,
      price: String(item.priceNum),
      priceNum: item.priceNum,
      quantity: item.quantity,
      total: (item.priceNum * item.quantity).toFixed(2)
    }));

    const orderDataForPdf = {
      orderId: String(orderId).slice(-6).toUpperCase(),
      name: order.customer_name || 'Pelanggan VIP',
      phone: from,
      cart: cartItems,
      timestamp: order.created_at
    };

    const pdfBuffer = await generateInvoicePdf(orderDataForPdf);
    const pdfMediaId = await uploadWAMedia(pdfBuffer, 'application/pdf', `Resit_${orderDataForPdf.orderId}.pdf`);
    
    if (pdfMediaId) {
      await sendWAMediaById(from, pdfMediaId, 'document', `📄 Resit Rasmi #${orderDataForPdf.orderId}`, `Resit_${orderDataForPdf.orderId}.pdf`);
    }
  } catch (pdfErr) {
    console.error('Failed to generate/send PDF:', pdfErr);
  }

  // --- 3. Generate & Send Voice Note ---
  try {
    const totalMYR = Number(order.total).toFixed(2);
    // Generate dynamic text using OpenAI Chat to give it a Sabahan flavor based on the order
    const voicePrompt = `You are Golden AI, a friendly Sabahan wholesaler. The customer just checked their receipt for RM ${totalMYR}. Write a VERY SHORT, enthusiastic Voice Note script (max 2 sentences). Say thanks, mention the total roughly, and end with 'Bereh bosku' or 'Mantap bosku'. STRICTLY use Malaysian/Sabahan slang. No emojis in the spoken text.`;
    
    const textRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: voicePrompt }]
      })
    });
    
    const textData = await textRes.json();
    const voiceScript = textData.choices?.[0]?.message?.content || `Mantap bosku! Resit RM ${totalMYR} sudah saya hantar. Terima kasih banyak-banyak support Golden Isle, nanti lori gerak saya roger!`;
    
    const audioBuffer = await generateVoiceNoteBuffer(voiceScript);
    if (audioBuffer) {
      const audioMediaId = await uploadWAMedia(audioBuffer, 'audio/aac', 'voice_note.aac');
      if (audioMediaId) {
        await sendWAMediaById(from, audioMediaId, 'audio');
      }
    }
  } catch (voiceErr) {
    console.error('Failed to generate/send Voice Note:', voiceErr);
  }
}

// SUGGESTION BOX: Simpan feedback & notify admin
// State management ringkas pakai in-memory (untuk production pakai Redis/Supabase)
const awaitingSuggestion = new Set<string>();

async function handleSuggestion(from: string, msgText: string) {
  // Kalau user dalam mod "tunggu jawapan suggestion"
  if (awaitingSuggestion.has(from)) {
    awaitingSuggestion.delete(from);

    // Simpan ke Supabase (table inquiries)
    await supabase.from('inquiries').insert({
      message: msgText,
      channel: 'whatsapp',
      phone: from,
      status: 'new',
      created_at: new Date().toISOString(),
    });

    // Notify admin via Telegram
    await notifyTelegram(
      `💡 <b>CADANGAN BARU via WhatsApp</b>\n\n` +
      `📱 Dari: +${from}\n` +
      `💬 Cadangan: ${msgText}\n\n` +
      `<i>Sila semak di Dashboard Admin Golden Isle.</i>`
    );

    // Balas pelanggan
    await sendWAText(
      from,
      `✅ *Terima kasih kerana cadangan anda!*\n\n` +
      `Kami sangat menghargai maklum balas ini. Tim Golden Isle akan mengkaji cadangan anda dengan serius. 🙏\n\n` +
      `_Ada perkara lain yang boleh kami bantu?_`
    );
    return;
  }

  // Mulakan sesi suggestion — minta input dulu
  awaitingSuggestion.add(from);
  await sendWAText(
    from,
    `✍️ *Kami suka dengar pendapat anda!*\n\n` +
    `Sila tulis cadangan, maklum balas, atau idea anda sekarang.\n\n` +
    `_Contoh: "Boleh tambah produk wine Perancis", "Packaging lebih cantik", dll._\n\n` +
    `👇 *Sila taip & hantar cadangan anda di ruangan chat di bawah:*`
  );
}

// In-memory chat history for KIRA
const chatHistory = new Map<string, { role: string, content: string }[]>();

// AI CHAT: Guna OpenAI dengan konteks katalog
async function handleAIChat(from: string, msgText: string) {
  let catalogText = 'Tiada maklumat stok terkini.';
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, category, stock_status')
    .eq('stock_status', 'in_stock');

  if (products && products.length > 0) {
    catalogText = products.map(p => `- ID: ${p.id} | ${p.name} (RM ${p.price}) [Kategori: ${p.category || 'Lain-lain'}]`).join('\n');
  }

  const systemPrompt = `You are KIRA, a PRO sales assistant for Golden Isle Wholesale — a premium beverage wholesaler in Sabah & Labuan, Malaysia. Your job is to help customers find the right products AND gently encourage them to place an order.

1. HUMOR & WARMTH (CRITICAL):
- ALWAYS call the user "bosku".
- Use situational humor based on the context.
- Be warm, friendly, and helpful.

2. CONSISTENCY RULES (STRICT):
- NEVER break character.
- NEVER say "I am an AI", "Saya AI", or mention being an artificial intelligence.
- ALWAYS end with a helpful question or Call-To-Action (e.g. "Mau order sekarang bosku?", "KIRA sedia tolong!").
- If user says thank you, ALWAYS reply: "Sama-sama bosku! Jangan segan order lagi tau 😊"

3. SALES INTELLIGENCE:
- After a user views the catalog or asks about products, follow up with: "Bosku nampak something menarik? KIRA boleh suggest yang best untuk bosku!"
- After an order is placed or discussed, upsell: "Bosku, ramai customer ambil [related product] sekali dengan order macam ni. Mau KIRA tambahkan?"

4. LANGUAGE STYLE:
- Mix Malay + English (Manglish) with Sabah slang ("bah", "ngam", "kin", "la", "ba", "sudah", "pun").
- Casual, warm, never formal. NEVER use Indonesian slang ("kamu", "dong", "sih", "deh", "banget", "aja").
- Max 3 sentences per reply unless explaining an order.
- Use emojis sparingly, only when natural.

Current Stock & Prices:
${catalogText}

Business Rules:
- Recommend Products → STRICT INSTRUCTION: Whenever a user asks for a recommendation, best product, popular item, or ANY product suggestion - you MUST ALWAYS call the 'recommend_products' tool. NEVER reply with text only for recommendations.
- Full Catalog → Call the 'view_full_catalog' tool when the user asks to see all items.
- Ordering → encourage them to tap "🛒 Buat Pesanan".
- Payment → we accept bank transfer & FPX.`;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'tanya_harga',
        description: 'Call this ONLY when the user asks for the price of a specific product or asks about Minimum Order Quantity (MOQ).',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'The ID of the product' },
            product_name: { type: 'string', description: 'The name of the product' }
          },
          required: ['product_id', 'product_name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'recommend_products',
        description: 'Call this when the user asks for product recommendations, searches for specific beverages, or wants to buy specific items. This will display them as a native interactive Multi-Product List in WhatsApp.',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Body message explaining the recommendation in user language / Sabahan slang (max 3 sentences). No markdown or bullet points.'
            },
            sections: {
              type: 'array',
              description: 'Sections of products to display, grouped by category. Max 2 sections for best layout.',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Section title (max 24 characters).' },
                  product_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Exact product ID strings from the catalog.'
                  }
                },
                required: ['title', 'product_ids']
              }
            }
          },
          required: ['text', 'sections']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'view_full_catalog',
        description: 'Call this when the user wants to browse the entire store catalog generally, or asks to see all products.',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Body message inviting them to view the catalog (max 3 sentences).'
            }
          },
          required: ['text']
        }
      }
    }
  ];

  if (!chatHistory.has(from)) chatHistory.set(from, []);
  const history = chatHistory.get(from)!;
  
  history.push({ role: 'user', content: msgText });
  if (history.length > 10) history.splice(0, history.length - 10); // Keep only last 10 messages

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history
        ],
        tools,
        tool_choice: 'auto'
      }),
    });

    const openaiData = await openaiRes.json();
    const choiceMessage = openaiData.choices?.[0]?.message;
    const toolCalls = choiceMessage?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const functionName = toolCall.function.name;
      let args: any = {};
      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }

      if (functionName === 'recommend_products') {
        const { text, sections } = args;
        const formattedSections = (sections || []).map((s: any) => ({
          title: s.title || 'Cadangan',
          productIds: s.product_ids || [],
        }));

        console.log(`🤖 AI recommending products via tool:`, JSON.stringify(formattedSections));
        const success = await sendWAProductList(from, formattedSections, text);
        if (!success) {
          await sendWAText(from, text);
        }
        history.push({ role: 'assistant', content: `[System Note: Successfully recommended products to user using WhatsApp Product List UI. The text intro was: ${text}]` });
        return;
      }

      if (functionName === 'view_full_catalog') {
        const { text } = args;
        const thumbnailId = products && products.length > 0 ? String(products[0].id) : undefined;
        console.log(`🤖 AI showing full catalog via tool`);
        const success = await sendWACatalogMessage(from, text, thumbnailId);
        if (!success) {
          await sendWAText(from, text);
        }
        history.push({ role: 'assistant', content: `[System Note: Successfully sent the full product catalog to user using WhatsApp Catalog UI. The text intro was: ${text}]` });
        return;
      }

      if (functionName === 'tanya_harga') {
        const { product_id, product_name } = args;
        console.log(`🤖 AI handling tanya_harga for product: ${product_name} (${product_id})`);

        let resolvedProduct = null;
        
        // Validate against Supabase
        const { data: byId } = await supabase.from('products').select('id, name').eq('id', product_id).maybeSingle();
        if (byId) {
          resolvedProduct = byId;
        } else {
          const searchTerm = product_name || product_id;
          const { data: byName } = await supabase.from('products').select('id, name').ilike('name', `%${searchTerm}%`).limit(1).maybeSingle();
          if (byName) resolvedProduct = byName;
        }

        if (resolvedProduct) {
          await sendWAButtons(from, `Bosku order *${resolvedProduct.name}* ni untuk apa ni?`, [
            { id: `tanya_qty_event_${resolvedProduct.id}`, title: '🎉 Event/Party' },
            { id: `tanya_qty_stok_${resolvedProduct.id}`, title: '🏪 Stok Kedai' },
            { id: `tanya_qty_cuba_${resolvedProduct.id}`, title: '🍺 Cuba Dulu' }
          ]);
          history.push({ role: 'assistant', content: `[System Note: Successfully sent the Tiered Pricing Step 1 options to user for product: ${resolvedProduct.name}]` });
        } else {
          await sendWAButtons(from, 'Maaf bosku, KIRA belum dapat match produk tu dengan catalog. Mau KIRA buka catalog untuk bosku pilih terus?', [
            { id: 'LIHAT_CATALOG', title: '🛍️ Tengok Catalog' },
            { id: 'TANYA_KIRA', title: '💬 Tanya KIRA' }
          ]);
          history.push({ role: 'assistant', content: `[System Note: Product not found, fallback to catalog prompt.]` });
        }
        return;
      }
    }

    const reply = choiceMessage?.content || 'Maaf bosku, otak saya sangkut sikit kejap. Cuba lagi ya!';
    history.push({ role: 'assistant', content: reply });
    await sendWAText(from, reply);
  } catch (err) {
    console.error('Error in handleAIChat:', err);
    await sendWAText(from, 'Maaf bosku, ada ralat sikit dalam sistem AI. Cuba lagi ya.');
  }
}

// ── VERIFIKASI WEBHOOK (GET) ─────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const MY_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'golden_isle_secret_token';

  if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
    console.log('🔥 WEBHOOK BERJAYA DISAHKAN OLEH META!');
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ── SPAM TRACKER ─────────────────────────────────────────────────────────────
const spamTracker = new Map<string, {count: number, resetAt: number}>();

// ── TANGKAP MESEJ MASUK (POST) ───────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'whatsapp_business_account' || body.field === 'messages') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // === FEATURE 1: Spam Detector ===
      if (message && message.from) {
        const from = message.from;
        const now = Date.now();
        const record = spamTracker.get(from);

        if (record) {
          if (now < record.resetAt) {
            record.count += 1;
          } else {
            record.count = 1;
            record.resetAt = now + 30000;
          }
        } else {
          spamTracker.set(from, { count: 1, resetAt: now + 30000 });
        }

        const updatedRecord = spamTracker.get(from)!;
        if (updatedRecord.count >= 5) {
          // If exactly 5, send the warning. If > 5, just ignore and return early to avoid spamming the warning itself.
          if (updatedRecord.count === 5) {
            await sendWAText(from, "Eh bosku, KIRA pun ada had laju tau 😅 Sekejap ya! Cuba lagi dalam 30 saat.");
          }
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }
      }


      // Handle Quick Reply Button tap (user tekan butang)
      let buttonPayload = '';
      if (message && message.type === 'button') {
        buttonPayload = message.button?.payload?.trim() || '';
      } else if (message && message.type === 'interactive' && message.interactive?.type === 'button_reply') {
        buttonPayload = message.interactive?.button_reply?.id?.trim() || '';
      }

      if (buttonPayload) {
        const from = message.from;
        console.log(`\n🔘 BUTTON REPLY: [${from}] "${buttonPayload}"`);

        // Map button payload to intent handlers
        if (buttonPayload === 'btn_order' || buttonPayload === '🛒 Buat Pesanan' || buttonPayload === 'BUAT_PESANAN') {
          await handleOrder(from);
        } else if (buttonPayload === 'btn_catalog' || buttonPayload === '🛍️ Lihat Katalog' || buttonPayload === 'LIHAT_CATALOG') {
          await handleCatalog(from);
        } else if (buttonPayload === 'btn_receipt' || buttonPayload === '🧾 Semak Resit') {
          await handleReceipt(from);
        } else if (buttonPayload === 'btn_suggest' || buttonPayload === '💡 Beri Cadangan') {
          await handleSuggestion(from, buttonPayload);
        } else if (buttonPayload === 'SEMAK_STOK') {
          await sendWAText(from, "📦 KIRA semak stok terkini untuk bosku.");
          await handleCatalog(from);
        } else if (buttonPayload === 'TANYA_KIRA') {
          await sendWAButtons(
            from,
            "👋 *Hai bosku! KIRA di sini* 😊\n\nApa yang bos cari hari ni?\n\n💰 Tanya harga produk\n📦 Borong untuk kedai\n🍺 Cadangan minuman\n\nAtau taip terus soalan bos.\n\nContoh:\n• Beer paling murah\n• Whisky untuk hadiah\n• Stout yang laku di kedai\n\nKIRA standby 24/7 untuk bantu bosku 🍻",
            [
              { id: 'AI_TANYA_HARGA', title: '💰 Tanya Harga' },
              { id: 'AI_BORONG_KEDAI', title: '📦 Borong Kedai' },
              { id: 'AI_CADANGAN', title: '🍺 Cadangan Produk' }
            ]
          );
        } else if (buttonPayload === 'AI_TANYA_HARGA') {
          await sendWAText(from, "💰 Nak check harga produk apa bosku?\n\nContoh:\n• Beer paling murah\n• Harga Heineken\n• Whisky bawah RM200\n\nTaip nama produk atau bajet bos, KIRA carikan yang ngam 😊");
        } else if (buttonPayload === 'AI_BORONG_KEDAI') {
          await sendWAText(from, "📦 Bos cari stok untuk kedai, restoran atau event?\n\nKIRA boleh bantu cadangkan ikut bajet, kategori dan kuantiti.\n\nTaip contoh:\n• Kedai runcit\n• Bar / Bistro\n• Event 100 pax\n• Bajet RM500");
        } else if (buttonPayload === 'AI_CADANGAN') {
          await sendWAButtons(from, "🍺 KIRA boleh cadangkan minuman ikut keperluan bos.\n\nMau cadangan jenis apa?", [
            { id: 'AI_POPULAR', title: '🔥 Paling Laku' },
            { id: 'AI_BUDGET', title: '💰 Bajet Jimat' },
            { id: 'AI_EVENT', title: '🎉 Untuk Event' }
          ]);
        } else if (buttonPayload === 'AI_POPULAR') {
          await handleAIChat(from, "Cadangkan produk paling laku sekarang. Paparkan sebagai product list jika sesuai.");
        } else if (buttonPayload === 'AI_BUDGET') {
          await handleAIChat(from, "Cadangkan produk bajet jimat yang sesuai untuk customer baru. Paparkan sebagai product list jika sesuai.");
        } else if (buttonPayload === 'AI_EVENT') {
          await handleAIChat(from, "Cadangkan produk untuk event atau party. Tanya bajet jika perlu, atau paparkan product list jika sesuai.");
        } else if (buttonPayload === 'btn_new_order') {
          await handleGreeting(from);
        } else if (buttonPayload.startsWith('btn_repeat_confirm_')) {
          const oldOrderId = buttonPayload.replace('btn_repeat_confirm_', '');
          const { data: oldOrder } = await supabase.from('orders').select('*').eq('id', oldOrderId).single();
          if (oldOrder) {
            const { data: newOrder, error } = await supabase.from('orders').insert({
              customer_phone: from,
              customer_name: oldOrder.customer_name,
              status: 'pending',
              payment_status: 'unpaid',
              subtotal: oldOrder.subtotal,
              total: oldOrder.total,
              items: oldOrder.items
            }).select().single();

            if (!error && newOrder) {
              const orderId = newOrder.id;
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
              const paymentLink = `${appUrl}/order-confirmation?orderId=${orderId}`;

              const firstItem = newOrder.items && newOrder.items.length > 0 ? newOrder.items[0] : null;
              let itemsSummary = 'Pesanan borong';
              if (firstItem) {
                itemsSummary = `${firstItem.name || 'Produk'} x ${firstItem.quantity || 1}`;
                if (newOrder.items.length > 1) itemsSummary += ` (+${newOrder.items.length - 1} lagi)`;
              }

              const bodyText = `Perfect bosku! 🎉 Invoice dah siap!\n\n📋 Order #${orderId.split('-')[0]}\n📦 ${itemsSummary}\n💰 Total: RM ${Number(newOrder.total).toFixed(2)}\n\nSila settle payment untuk proses order bosku ya!`;
              
              const ctaSuccess = await sendWACtaUrl(from, bodyText, paymentLink);
              if (!ctaSuccess) {
                await sendWAText(from, `${bodyText}\n\n👉 ${paymentLink}`);
              }
            }
          }
        } else if (buttonPayload.startsWith('btn_repeat_edit_')) {
          const oldOrderId = buttonPayload.replace('btn_repeat_edit_', '');
          const { data: oldOrder } = await supabase.from('orders').select('*').eq('id', oldOrderId).single();
          if (oldOrder) {
            let itemsList = '';
            (oldOrder.items || []).forEach((item: any, idx: number) => {
              itemsList += `${idx+1}. ${item.name || 'Produk'} x ${item.quantity || 1} — RM ${(item.price * (item.quantity || 1) || 0).toFixed(2)}\n`;
            });
            const msg = `Okay bosku! Last order bosku:\n\n${itemsList}\nNak tambah, kurang, atau tukar produk mana satu?`;
            
            const systemNote = `[SYSTEM PROMPT FOR KIRA: Customer nak edit repeat order. Previous order ID: ${oldOrderId}. Items: ${JSON.stringify(oldOrder.items)}. Tugas kau: 1. Tanya customer nak tukar apa. 2. Update cart accordingly. 3. Bila customer confirm, generate invoice baru. 4. Send payment link. Jangan tanya soalan lain. Focus on editing order je.]`;
            
            if (!chatHistory.has(from)) chatHistory.set(from, []);
            chatHistory.get(from)!.push({ role: 'system', content: systemNote });
            
            await sendWAText(from, msg);
          }
        } else if (buttonPayload.startsWith('btn_pay_')) {
          const orderId = buttonPayload.replace('btn_pay_', '');
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
          const paymentLink = `${appUrl}/order-confirmation?orderId=${orderId}`;
          const bodyText = `Sila klik butang di bawah untuk buat bayaran bagi order #${orderId.split('-')[0]} bosku ya! 💳`;
          const ctaSuccess = await sendWACtaUrl(from, bodyText, paymentLink);
          if (!ctaSuccess) await sendWAText(from, `${bodyText}\n\n👉 ${paymentLink}`);
        } else if (buttonPayload.startsWith('btn_invoice_')) {
          // Temporarily use handleReceipt logic by generating a PDF or just showing receipt text
          const orderId = buttonPayload.replace('btn_invoice_', '');
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
          await sendWAText(from, `Ini link untuk tengok resit penuh bosku:\n${appUrl}/order-confirmation?orderId=${orderId}`);
        } else if (buttonPayload.startsWith('btn_snooze_')) {
          const orderId = buttonPayload.replace('btn_snooze_', '');
          const newTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
          await supabase.from('orders').update({ last_chaser_sent: newTime }).eq('id', orderId);
          await sendWAText(from, "Okay bosku! Saya ingatkan lagi kejap lagi ya 😊");
        } else if (buttonPayload.startsWith('btn_cancel_')) {
          const orderId = buttonPayload.replace('btn_cancel_', '');
          const { data: order } = await supabase.from('orders').select('customer_name, customer_phone, total').eq('id', orderId).single();
          await supabase.from('orders').update({ status: 'cancelled', chaser_opted_out: true }).eq('id', orderId);
          await sendWAText(from, "Order dibatalkan bosku. Takpa, nanti nak order lagi boleh WhatsApp saya ya! 🙏");
          if (order) {
            await notifyTelegram(`⚠️ <b>ORDER DIBATALKAN</b>\nCustomer: ${order.customer_name || 'bosku'} (+${order.customer_phone})\nOrder ID: #${orderId.split('-')[0]}\nAmount: RM ${Number(order.total).toFixed(2)}\n<i>Dibatalkan melalui WA Reminder.</i>`);
          }
        } else if (buttonPayload === 'btn_talk_sales') {
          await supabase.from('orders').update({ chaser_opted_out: true }).eq('customer_phone', from).in('payment_status', ['unpaid', 'pending_payment', 'pending']);
          await sendWAText(from, "Okay bosku! Team kami akan hubungi bosku segera ya! 🤝");
          await notifyTelegram(`📞 <b>SALES ASSIST REQUEST</b>\nPhone: +${from}\n<i>Customer tekan butang Hubungi Sales dari WA Reminder. Sila follow up segera!</i>`);
        } else if (buttonPayload.startsWith('tanya_qty_')) {
          // Step 2: Tanya Kuantiti
          const parts = buttonPayload.split('_');
          const productId = parts.slice(3).join('_');
          await sendWAButtons(from, "Selalu ambil berapa kotak sebulan bosku?", [
            { id: `tanya_tier_1_${productId}`, title: '📦 1-3 Kotak' },
            { id: `tanya_tier_2_${productId}`, title: '📦 4-10 Kotak' },
            { id: `tanya_tier_3_${productId}`, title: '📦 10+ Kotak' }
          ]);
        } else if (buttonPayload.startsWith('tanya_tier_')) {
          // Step 3: Harga Tier & Social Proof
          const parts = buttonPayload.split('_');
          const tierLevel = parts[2]; // 1, 2, or 3
          const productId = parts.slice(3).join('_');

          const { data: product } = await supabase.from('products').select('name, price, price_tiers').eq('id', productId).single();
          
          if (product) {
            // Default pricing fallback
            let price1 = Number(product.price);
            let price2 = price1 * 0.95; // 5% off
            let price3 = price1 * 0.90; // 10% off

            if (product.price_tiers) {
              price1 = Number(product.price_tiers['1-3']) || price1;
              price2 = Number(product.price_tiers['4-10']) || price2;
              price3 = Number(product.price_tiers['10+']) || price3;
            }

            const p1Str = price1.toFixed(2);
            const p2Str = price2.toFixed(2);
            const p3Str = price3.toFixed(2);

            const reply = `Untuk pesanan bosku, ini harga borong *${product.name}*:\n\n` +
              `• 1-3 Kotak: RM ${p1Str}/ktk\n` +
              `• *4-10 Kotak: RM ${p2Str}/ktk (Paling Popular 🔥)*\n` +
              `• 10+ Kotak: RM ${p3Str}/ktk\n\n` +
              `_(Ramai kedai KK ambil tier ni bosku!)_`;

            await sendWAButtons(from, reply, [
              { id: 'btn_catalog', title: '✅ Confirm Kuantiti' },
              { id: `tanya_qty_stok_${productId}`, title: '🔄 Tukar Kuantiti' },
              { id: 'btn_catalog', title: '🛍️ Tengok Lain' }
            ]);
          } else {
            await sendWAText(from, "Maaf bosku, maklumat produk tidak dijumpai.");
          }
        } else {
          await handleAIChat(from, buttonPayload);
        }
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      // Handle interactive reply — catalog list_reply OR flow nfm_reply
      if (message && message.type === 'interactive') {
        const from = message.from;
        const interactiveType = message.interactive?.type || '';

        // ── WA Flow Submission (nfm_reply) ────────────────────────────────
        if (interactiveType === 'nfm_reply') {
          console.log('\n📋 FLOW SUBMISSION received from:', from);
          try {
            const responseJson = JSON.parse(message.interactive?.nfm_reply?.response_json || '{}');
            const { product_id, quantity, customer_name, delivery_address, notes } = responseJson;

            // Lookup product name from id
            const productKey = String(product_id || '').replace('prod_', '');
            const { data: productRow } = await supabase
              .from('products')
              .select('name, price')
              .eq('id', productKey)
              .single();

            const productName = productRow?.name || product_id || 'Produk tidak dikenal';
            const productPrice = productRow ? `RM ${Number(productRow.price).toFixed(2)}` : '-';

            // Save inquiry to Supabase
            await supabase.from('inquiries').insert({
              message: `ORDER VIA WA FLOW — Produk: ${productName} | Qty: ${quantity} | Nama: ${customer_name} | Alamat: ${delivery_address} | Catatan: ${notes || '-'}`,
              channel: 'whatsapp_flow',
              phone: from,
              status: 'new',
              created_at: new Date().toISOString(),
            });

            // Notify admin via Telegram
            await notifyTelegram(
              `🛒 <b>PESANAN BARU via WA Flow!</b>\n\n` +
              `📱 No. Tel: +${from}\n` +
              `📦 Produk: ${productName}\n` +
              `💰 Harga: ${productPrice}\n` +
              `🔢 Kuantiti: ${quantity}\n` +
              `👤 Nama: ${customer_name}\n` +
              `📍 Alamat: ${delivery_address}\n` +
              `📝 Catatan: ${notes || '-'}\n\n` +
              `<i>Sila hubungi pelanggan untuk sahkan & proses pembayaran.</i>`
            );

            // Confirm to customer
            await sendWAText(
              from,
              `✅ *Pesanan Diterima, ${customer_name}!* 🎉\n\n` +
              `━━━━━━━━━━━━━━━\n` +
              `📦 *${productName}*\n` +
              `🔢 Kuantiti: ${quantity}\n` +
              `📍 Alamat: ${delivery_address}\n` +
              `━━━━━━━━━━━━━━━\n\n` +
              `Tim Golden Isle akan hubungi anda dalam masa *24 jam* untuk sahkan pesanan dan proses pembayaran. 🙏\n\n` +
              `_Ada soalan? WhatsApp kami terus ya bosku!_`
            );
          } catch (flowErr) {
            console.error('Error parsing flow response:', flowErr);
            await sendWAText(from, '⚠️ Maaf, ada masalah terima pesanan. Sila cuba lagi atau hubungi admin.');
          }
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // ── Catalog List Reply ─────────────────────────────────────────────
        const selectedId = message.interactive?.list_reply?.id || '';
        const selectedTitle = message.interactive?.list_reply?.title || '';

        if (selectedId.startsWith('product_')) {
          const productId = selectedId.replace('product_', '');
          const { data: product } = await supabase
            .from('products')
            .select('name, price, description, category, image_url')
            .eq('id', productId)
            .single();

          if (product) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
            const caption = `📦 *${product.name}*\n` +
              `━━━━━━━━━━━━━━━\n` +
              `💰 Harga: RM ${Number(product.price).toFixed(2)}\n` +
              `📁 Kategori: ${product.category || '-'}\n` +
              `📝 ${product.description || 'Premium quality product.'}\n\n` +
              `🛒 Mau order? Klik link:\n${appUrl}\n\n` +
              `_Atau WhatsApp terus untuk order borong!_`;

            if (product.image_url) {
              await sendWAImage(from, product.image_url, caption);
            } else {
              await sendWAText(from, caption);
            }
          } else {
            await sendWAText(from, `Maaf, maklumat produk "${selectedTitle}" tidak dijumpai. Taip "catalog" untuk lihat semula.`);
          }
        }
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      // Handle Native Catalog Cart Order
      if (message && message.type === 'order') {
        const from = message.from;
        const productItems = message.order?.product_items || [];
        
        console.log(`\n🛒 NATIVE CATALOG ORDER dari [${from}]:`, productItems);
        
        try {
          // Parse items and calculate total
          let subtotal = 0;
          const parsedItems = [];
          
          for (const item of productItems) {
            const qty = parseInt(item.quantity) || 1;
            const price = parseFloat(item.item_price) || 0;
            subtotal += (qty * price);
            
            // Fetch product details
            const { data: pData } = await supabase.from('products').select('name').eq('id', item.product_retailer_id).single();
            const name = pData?.name || `Produk ${item.product_retailer_id}`;
            
            parsedItems.push({
              product_id: item.product_retailer_id,
              name: name,
              quantity: qty,
              price: price
            });
          }
          
          const delivery_fee = 0;
          const total = subtotal + delivery_fee;
          
          // Insert into orders table
          const { data: newOrder, error: orderErr } = await supabase.from('orders').insert({
            customer_phone: from,
            status: 'pending',
            payment_status: 'unpaid',
            subtotal: subtotal,
            delivery_fee: delivery_fee,
            total: total,
            items: parsedItems
          }).select().single();
          
          if (orderErr) throw orderErr;
          
          const orderId = newOrder.id;
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
          const paymentLink = `${appUrl}/order-confirmation?orderId=${orderId}`;

          const hour = (new Date().getUTCHours() + 8) % 24; // Malaysia time
          let introMsg = "Terima kasih bosku! KIRA dah terima senarai cart bosku.";
          if (hour >= 22 || hour <= 3) introMsg = "Bosku malam-malam order, party mode ka ni? 🌙🍻 KIRA dah save order bosku.";
          else if (hour >= 6 && hour <= 10) introMsg = "Bosku pagi-pagi dah semangat! KIRA pun baru bangun ni ☕ KIRA dah terima order bosku.";
          else if (total < 200) introMsg = "Bosku test air dulu ka? Ngam tu! KIRA dah save order bosku.";
          else if (total > 1000) introMsg = "Wah bosku! Stock mau habis ni, KIRA mau update catalog dulu 😅 Order bosku selamat diterima!";
          
          const bodyText = `${introMsg}\n\n🛒 Jumlah Keseluruhan: RM ${total.toFixed(2)}\n\nSila klik butang di bawah untuk buat bayaran supaya KIRA boleh cepat-cepat proses pesanan bosku.`;
          
          // Reply to user using Interactive CTA URL
          const ctaSuccess = await sendWACtaUrl(from, bodyText, paymentLink);
          if (!ctaSuccess) {
            // Fallback if CTA URL fails
            await sendWAText(from, 
              `🎉 *Pesanan Diterima!*\n\n` +
              `${bodyText}\n\n` +
              `👉 ${paymentLink}\n\n` +
              `_Pesanan akan diproses sebaik sahaja bayaran disahkan._`
            );
          }
          
          // Notify Telegram
          await notifyTelegram(
            `🛒 <b>PESANAN BARU (Native Catalog)!</b>\n\n` +
            `📱 No. Tel: +${from}\n` +
            `💰 Total: RM ${total.toFixed(2)}\n` +
            `🔗 Status: Menunggu Pembayaran\n` +
            `<i>ID Pesanan: ${orderId}</i>`
          );
        } catch (err) {
          console.error("Error processing catalog order:", err);
          await sendWAText(from, "⚠️ Maaf bosku, ada sedikit ralat masa memproses order. Sila hubungi admin.");
        }
        
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      // Handle text messages

      if (message && message.type === 'text') {
        const from = message.from;
        const msgText = message.text?.body?.trim() || '';

        console.log(`\n📩 MESEJ WA: [${from}] "${msgText}"`);

        // Auto-Stop Chaser on FREE TEXT reply
        try {
          await supabase.from('orders')
            .update({ chaser_opted_out: true })
            .eq('customer_phone', from)
            .in('payment_status', ['pending_payment', 'unpaid', 'pending'])
            .eq('chaser_opted_out', false);
        } catch (err) {
          console.error('Error auto-stopping chaser:', err);
        }

        // 1. Session tracking in DB
        let isNewSession = false;
        try {
          const { data: customer } = await supabase.from('customers').select('last_session_at').eq('phone', from).single();
          const now = Date.now();
          if (customer && customer.last_session_at) {
            const lastTime = new Date(customer.last_session_at).getTime();
            if (now - lastTime > 8 * 60 * 60 * 1000) isNewSession = true;
          } else {
            isNewSession = true;
          }
          await supabase.from('customers').upsert({
            phone: from,
            last_session_at: new Date().toISOString()
          }, { onConflict: 'phone' });
        } catch (err) {
          console.error('Error tracking session:', err);
        }

        // 2. If new session, check repeat order
        if (isNewSession) {
           const handled = await handleRepeatGreeting(from);
           if (handled) return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // Cek dulu kalau user sedang dalam mod suggestion
        if (awaitingSuggestion.has(from)) {
          await handleSuggestion(from, msgText);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // Detect intent & route
        const intent = detectIntent(msgText);
        console.log(`🧠 Intent detected: ${intent}`);

        switch (intent) {
          case 'greet':
            await handleGreeting(from);
            break;
          case 'order':
            await handleOrder(from);
            break;
          case 'catalog':
            await handleCatalog(from);
            break;
          case 'receipt':
            await handleReceipt(from);
            break;
          case 'suggest':
            await handleSuggestion(from, msgText);
            break;
          case 'ai':
          default:
            await handleAIChat(from, msgText);
            break;
        }
      }

      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not a WhatsApp event', { status: 404 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
