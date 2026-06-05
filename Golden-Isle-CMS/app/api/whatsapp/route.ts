import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase (gunakan Service Role Key untuk bypass RLS dalam API)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Hantar WA Interactive List (Catalog)
async function sendWAInteractiveList(to: string, sections: any[]) {
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
  if (!waToken || !waPhoneId) return;

  // Unique token per send so we can track which flow submission belongs to whom
  const flowToken = `gi_order_${to}_${Date.now()}`;

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
    }),
  });
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
    `👋 *Hai bosku! Selamat datang ke Golden Isle Wholesale* 🥃\n\nKami menyediakan minuman premium borong terbaik di Sabah & Labuan.\n\n*Apa yang boleh kami bantu hari ni?*`,
    [
      { id: 'btn_order',   title: '🛒 Buat Pesanan' },
      { id: 'btn_receipt', title: '🧾 Semak Resit' },
      { id: 'btn_suggest', title: '💡 Beri Cadangan' },
    ]
  );
}

// ORDER FLOW: Hantar WA Flow borang pesanan interaktif
async function handleOrder(from: string) {
  const flowId = process.env.WHATSAPP_FLOW_ID;

  if (!flowId) {
    // Fallback jika Flow belum di-setup: hantar ke catalog list biasa
    await sendWAText(
      from,
      `🛒 *Mau buat pesanan?*\n\n` +
      `Taip \'catalog\' untuk lihat senarai produk, kemudian hubungi kami terus untuk order!\n\n` +
      `📞 WhatsApp: wa.me/${process.env.WHATSAPP_PHONE_NUMBER_ID}\n` +
      `🌐 Website: https://goldenisle-wholesale.vercel.app`
    );
    return;
  }

  // Hantar WA Flow — borang cantik terus dalam chat!
  await sendWAFlow(from, flowId, 'published');
}

// CATALOG: Fetch produk dari Supabase & format sebagai WA Interactive List
async function handleCatalog(from: string) {
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

  // Kumpulkan produk by category untuk WA sections
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
      title: p.name.slice(0, 24), // WA limit 24 chars
      description: `RM ${Number(p.price).toFixed(2)}${p.description ? ' — ' + p.description.slice(0, 50) : ''}`,
    })),
  }));

  // WA Interactive List max 10 rows total — kalau lebih, fallback ke teks
  const totalRows = sections.reduce((acc, s) => acc + s.rows.length, 0);
  if (totalRows > 10 || sections.length === 0) {
    const textList = products.map(p => `• *${p.name}*\n  💰 RM ${Number(p.price).toFixed(2)}`).join('\n\n');
    await sendWAText(from, `🛍️ *Golden Isle — Catalog Produk*\n\n${textList}\n\n_Taip nama produk untuk info lanjut atau terus WhatsApp kami untuk order!_`);
  } else {
    await sendWAInteractiveList(from, sections);
  }
}

// RECEIPT: Cari order terakhir by phone & hantar resit ringkas
async function handleReceipt(from: string) {
  // Format phone: WA hantar "601X..." tapi DB mungkin simpan "+601X..."
  const phoneVariants = [from, `+${from}`, from.replace(/^60/, '0')];

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, subtotal, delivery_fee, total, created_at, items')
    .or(phoneVariants.map(p => `customer_phone.eq.${p}`).join(','))
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !orders || orders.length === 0) {
    await sendWAText(
      from,
      '🔍 Kami tidak jumpa rekod order untuk nombor ini.\n\n💡 Mungkin order dibuat dengan nombor lain? Sila hubungi admin untuk semak.'
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

  const itemsList = Array.isArray(order.items)
    ? order.items.map((item: any) => `• ${item.product?.name || 'Produk'} x${item.qty}`).join('\n')
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
    `📄 Download PDF:\n${pdfLink}`,
    `━━━━━━━━━━━━━━━`,
    `_Terima kasih kerana memilih Golden Isle! 🙏_`,
  ].filter(Boolean).join('\n');

  await sendWAText(from, receiptMsg);
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
    `_Contoh: "Boleh tambah produk wine Perancis", "Packaging lebih cantik", dll._`
  );
}

// AI CHAT: Guna OpenAI dengan konteks katalog
async function handleAIChat(from: string, msgText: string) {
  let catalogText = 'Tiada maklumat stok terkini.';
  const { data: products } = await supabase
    .from('products')
    .select('name, price, category, stock_status')
    .eq('stock_status', 'in_stock');

  if (products && products.length > 0) {
    catalogText = products.map(p => `- ${p.name} (RM ${p.price})`).join('\n');
  }

  const systemPrompt = `You are an AI customer service assistant for Golden Isle Wholesale (a premium beverage wholesaler in Sabah & Labuan).

CRITICAL LANGUAGE RULES:
1. Detect the user's language (English, Chinese, Malay, Indonesian, etc.) and respond in exactly the SAME language.
2. DO NOT mix up Malaysian Malay and Indonesian. They are distinct.
3. If the user speaks Malaysian Malay, reply in casual Sabah slang (e.g., "bosku", "ngam", "bah", "urang").
4. If the user speaks English, reply in friendly, professional English.

Current Stock & Prices:
${catalogText}

Instructions:
- If they ask for prices or stock, refer to the list above.
- If they want to order, tell them to tap the "🛒 Buat Pesanan" button or type "order".
- If they want a receipt, tell them to tap the "🧾 Semak Resit" button or type "resit".
- If they want to give a suggestion, tell them to tap the "💡 Beri Cadangan" button or type "cadangan".
- Keep answers short, direct, and friendly. Do not write long paragraphs.`;

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
        { role: 'user', content: msgText },
      ],
    }),
  });

  const openaiData = await openaiRes.json();
  const reply = openaiData.choices?.[0]?.message?.content || 'Maaf bosku, otak saya sangkut sikit kejap. Cuba lagi ya!';
  await sendWAText(from, reply);
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

// ── TANGKAP MESEJ MASUK (POST) ───────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'whatsapp_business_account' || body.field === 'messages') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Handle Quick Reply Button tap (user tekan butang)
      if (message && message.type === 'button') {
        const from = message.from;
        const buttonPayload = message.button?.payload?.trim() || '';
        console.log(`\n🔘 BUTTON REPLY: [${from}] "${buttonPayload}"`);

        // Map button payload to intent handlers
        if (buttonPayload === 'btn_order' || buttonPayload === '🛒 Buat Pesanan') {
          await handleOrder(from);
        } else if (buttonPayload === 'btn_catalog' || buttonPayload === '🛍️ Lihat Katalog') {
          await handleCatalog(from);
        } else if (buttonPayload === 'btn_receipt' || buttonPayload === '🧾 Semak Resit') {
          await handleReceipt(from);
        } else if (buttonPayload === 'btn_suggest' || buttonPayload === '💡 Beri Cadangan') {
          await handleSuggestion(from, buttonPayload);
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

      // Handle text messages
      if (message && message.type === 'text') {
        const from = message.from;
        const msgText = message.text?.body?.trim() || '';

        console.log(`\n📩 MESEJ WA: [${from}] "${msgText}"`);

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
