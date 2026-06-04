import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase (gunakan Service Role Key untuk bypass RLS dalam API)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. VERIFIKASI WEBHOOK (Meta panggil ini SEKALI SAJA masa mula-mula setup)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Kita pakai token ni untuk match dengan apa ko taip di dashboard Meta nanti
  const MY_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'golden_isle_secret_token';

  if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
    console.log('🔥 WEBHOOK BERJAYA DISAHKAN OLEH META!');
    // Wajib pulangkan 'challenge' balik ke Meta dengan status 200
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// 2. TANGKAP MESEJ MASUK (Bila user hantar WhatsApp ke chatbot ko)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Pastikan payload betul dari WhatsApp Business Account atau Test Payload
    if (body.object === 'whatsapp_business_account' || body.field === 'messages') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Hanya proses kalau mesej jenis text
      if (message && message.type === 'text') {
        const from = message.from; // Nombor phone user (pemberi)
        const msgText = message.text?.body; // Isi text mesej

        console.log(`\n📩 MESEJ WHATSAPP BARU MASUK!`);
        console.log(`Dari: ${from}`);
        console.log(`Mesej: ${msgText}\n`);

        // --- 1. TARIK KATALOG PRODUK DARI SUPABASE ---
        let catalogText = "Tiada senarai produk (Stok Kosong).";
        try {
          const { data: products, error: dbError } = await supabase
            .from('products')
            .select('name, price, category, stock_status')
            .eq('stock_status', 'in_stock');
            
          if (!dbError && products && products.length > 0) {
            catalogText = products.map(p => `- ${p.name} (RM ${p.price})`).join('\n');
          }
        } catch (e) {
          console.error("Gagal tarik produk:", e);
        }

        // --- 2. MINTA OPENAI FIKIRKAN JAWAPAN DENGAN KONTEKS STOK ---
        const openaiUrl = 'https://api.openai.com/v1/chat/completions';
        
        const systemPrompt = `Anda adalah pembantu khidmat pelanggan AI untuk bisnes pemborong minuman bernama Golden Isle Wholesale. Jawab pendek, mesra, dan gunakan gaya bahasa Melayu santai atau Sabah (contoh: bosku, ngam). 

Berikut adalah senarai STOK TERKINI yang ADA DI KEDAI hari ini:
${catalogText}

Arahan penting:
- Sekiranya pelanggan bertanya harga atau stok, WAJIB rujuk senarai di atas.
- Jika mereka minta barang yang tiada dalam senarai, beritahu jujur stok belum sampai atau tiada.`;

        const openaiPayload = {
          model: 'gpt-4o-mini', // atau gpt-3.5-turbo
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: msgText }
          ]
        };

        const openaiRes = await fetch(openaiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(openaiPayload)
        });

        const openaiData = await openaiRes.json();
        console.log('\n--- OPENAI API RESPONSE ---');
        console.log(JSON.stringify(openaiData, null, 2));
        console.log('---------------------------\n');

        const aiResponseText = openaiData.choices?.[0]?.message?.content || "Maaf bosku, otak saya sangkut sikit kejap.";
        console.log(`🤖 AI BALAS: ${aiResponseText}`);

        // 2. HANTAR JAWAPAN GEMINI BALIK KE WHATSAPP PELANGGAN
        const waToken = process.env.WHATSAPP_TOKEN;
        const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (waToken && waPhoneId) {
          const waUrl = `https://graph.facebook.com/v17.0/${waPhoneId}/messages`;
          const waPayload = {
            messaging_product: "whatsapp",
            to: from, // hantar balik ke nombor yang mesej tadi
            text: { body: aiResponseText }
          };

          const waRes = await fetch(waUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(waPayload)
          });
          
          if(waRes.ok) {
            console.log('✅ Berjaya hantar mesej AI ke WhatsApp pelanggan!');
          } else {
            console.log('❌ Gagal hantar mesej ke WhatsApp:', await waRes.text());
          }
        } else {
          console.log('⚠️ WHATSAPP_TOKEN atau WHATSAPP_PHONE_NUMBER_ID belum diset dalam .env.local');
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
