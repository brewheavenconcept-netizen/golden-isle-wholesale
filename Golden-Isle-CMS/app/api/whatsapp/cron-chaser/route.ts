import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for sending WA messages
async function sendWAMessage(to: string, message: any) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.error('Missing WA credentials');
    return false;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        ...message
      }),
    });
    
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Error sending WA message to ${to}:`, errBody);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error in sendWAMessage to ${to}:`, error);
    return false;
  }
}

// Telegram notification helper
async function notifyTelegram(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Error sending Telegram notification', err);
  }
}

export async function GET(request: Request) {
  try {
    // 1. Timezone Check (9AM to 6PM MYT)
    const now = new Date();
    // UTC+8
    const mytHour = (now.getUTCHours() + 8) % 24;
    
    if (mytHour < 9 || mytHour >= 18) {
      return NextResponse.json({ message: 'Outside of business hours (9AM-6PM MYT). Skipping chaser.' }, { status: 200 });
    }

    // 2. Fetch Unpaid Orders
    // We fetch orders that are 'pending_payment' or 'unpaid', not opted out, and chaser_count < 3
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, customers:customer_phone(name, phone)')
      .in('payment_status', ['pending_payment', 'unpaid', 'pending'])
      .lt('chaser_count', 3)
      .eq('chaser_opted_out', false);

    if (error) {
      throw error;
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'No unpaid orders to chase.' }, { status: 200 });
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000); // 20 hours to give a buffer for the 24h mark
    const fortyFourHoursAgo = new Date(Date.now() - 44 * 60 * 60 * 1000); // Buffer for 48h mark

    let processedCount = 0;

    for (const order of orders) {
      const orderCreatedAt = new Date(order.created_at);
      const lastChaserSent = order.last_chaser_sent ? new Date(order.last_chaser_sent) : null;
      const count = order.chaser_count;
      
      const phone = order.customer_phone;
      // Depending on join format, customers might be array or object. Let's gracefully handle name
      let customerName = order.customer_name || 'bosku';
      if (order.customers && !Array.isArray(order.customers) && order.customers.name) {
         customerName = order.customers.name;
      } else if (Array.isArray(order.customers) && order.customers.length > 0 && order.customers[0].name) {
         customerName = order.customers[0].name;
      }

      let itemsSummary = '';
      if (order.items && order.items.length > 0) {
        itemsSummary = `${order.items[0].name || 'Produk'} x ${order.items[0].quantity || 1}`;
        if (order.items.length > 1) itemsSummary += ` (+${order.items.length - 1} lagi)`;
      } else {
        itemsSummary = 'Pesanan Borong';
      }

      const total = Number(order.total).toFixed(2);
      const orderDate = orderCreatedAt.toLocaleDateString('ms-MY');
      const orderIdShort = order.id.split('-')[0];

      let shouldSend = false;
      let messagePayload: any = null;

      // Determine stage
      if (count === 0 && orderCreatedAt < twoHoursAgo) {
        // TAHAP 1
        shouldSend = true;
        messagePayload = {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: `Hai bosku ${customerName}! 👋\n\nSekadar peringatan mesra — invoice bosku #${orderIdShort} masih menunggu payment ni.\n\n📦 ${itemsSummary}\n💰 Jumlah: RM ${total}\n📅 Order: ${orderDate}\n\nMungkin bosku terlupa kot? Tak apa, settle bila senang! 😊` },
            action: {
              buttons: [
                { type: 'reply', reply: { id: `btn_pay_${order.id}`, title: '💳 Bayar Sekarang' } },
                { type: 'reply', reply: { id: `btn_invoice_${order.id}`, title: '📋 Tengok Invoice' } },
                { type: 'reply', reply: { id: `btn_snooze_${order.id}`, title: '⏰ Kejap Lagi' } }
              ]
            }
          }
        };
      } else if (count === 1 && lastChaserSent && lastChaserSent < twentyHoursAgo) {
        // TAHAP 2
        shouldSend = true;
        messagePayload = {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: `Bosku ${customerName},\n\nInvoice #${orderIdShort} dah 24 jam belum settle lagi ni.\n\n💰 RM ${total} pending\n⚠️ Stok dah di-reserve untuk bosku — tapi ada limit masa.\n\nBoleh settle hari ni bosku? Supaya order boleh proceed dan stok confirm untuk bosku. 🙏` },
            action: {
              buttons: [
                { type: 'reply', reply: { id: `btn_pay_${order.id}`, title: '💳 Bayar Sekarang' } },
                { type: 'reply', reply: { id: 'btn_talk_sales', title: '📞 Hubungi Sales' } },
                { type: 'reply', reply: { id: `btn_cancel_${order.id}`, title: '❌ Cancel Order' } }
              ]
            }
          }
        };
      } else if (count === 2 && lastChaserSent && lastChaserSent < fortyFourHoursAgo) {
        // TAHAP 3
        shouldSend = true;
        messagePayload = {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: `Bosku ${customerName},\n\nIni peringatan terakhir untuk invoice #${orderIdShort}.\n\n💰 RM ${total}\n⏰ Stok akan dilepaskan dalam 24 jam sekiranya tiada respon.\n\nKalau ada issue dengan payment atau nak discuss, boleh terus reply mesej ni — team kami sedia membantu. 🤝` },
            action: {
              buttons: [
                { type: 'reply', reply: { id: `btn_pay_${order.id}`, title: '💳 Bayar Sekarang' } },
                { type: 'reply', reply: { id: 'btn_talk_sales', title: '💬 Cakap Dgn Sales' } }, // Reduced length to fit WA 20 char limit
                { type: 'reply', reply: { id: `btn_cancel_${order.id}`, title: '❌ Cancel Order' } }
              ]
            }
          }
        };
      }

      if (shouldSend && messagePayload) {
        const success = await sendWAMessage(phone, messagePayload);
        
        if (success) {
          const newCount = count + 1;
          const nowStr = new Date().toISOString();
          
          // Update Order
          await supabase.from('orders').update({
            chaser_count: newCount,
            last_chaser_sent: nowStr
          }).eq('id', order.id);

          // Log
          await supabase.from('chaser_logs').insert({
            order_id: order.id,
            tahap: newCount,
            sent_at: nowStr,
            delivered: true
          });

          // Admin notification on Tahap 3
          if (newCount === 3) {
            await notifyTelegram(
              `⚠️ <b>ALERT: Invoice #${orderIdShort}</b>\n` +
              `Customer: ${customerName} (+${phone})\n` +
              `Amount: RM ${total}\n` +
              `Status: 48 jam belum bayar\n\n` +
              `<i>3 reminder dah dihantar. Sila follow up manual. 🙏</i>`
            );
          }

          processedCount++;
        }
      }
    }

    return NextResponse.json({ message: 'Chaser processed', count: processedCount }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing cron chaser:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
