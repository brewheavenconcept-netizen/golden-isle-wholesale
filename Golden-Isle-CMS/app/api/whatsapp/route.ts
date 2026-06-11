import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePdf } from '../../../lib/pdfGenerator';
import { buildPhoneOrFilter, normalizeOrderItems } from '@/lib/orderCompat';
import { createEmptyContext, extractContextFromMessage, buildContextBlock, InvoiceItem } from '@/lib/contextBuilder';
import { matchInvoiceToCatalog } from '@/lib/catalogMatcher';
import crypto from 'crypto';

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

async function getWAMediaUrl(mediaId: string): Promise<string | null> {
  const waToken = process.env.WHATSAPP_TOKEN;
  if (!waToken) return null;

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${waToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      console.error('Error getting WA media URL:', JSON.stringify(data));
      return null;
    }
    return data.url;
  } catch (err) {
    console.error('Error getting WA media URL:', err);
    return null;
  }
}

async function downloadWAMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const waToken = process.env.WHATSAPP_TOKEN;
  if (!waToken) return null;

  try {
    const mediaUrl = await getWAMediaUrl(mediaId);
    if (!mediaUrl) return null;

    const res = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${waToken}` },
    });
    if (!res.ok) {
      console.error('Error downloading WA media:', res.status, await res.text());
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: res.headers.get('content-type') || 'audio/ogg',
    };
  } catch (err) {
    console.error('Error downloading WA media:', err);
    return null;
  }
}

function audioFilenameForMime(mimeType: string): string {
  if (mimeType.includes('mpeg')) return 'voice-note.mp3';
  if (mimeType.includes('mp4')) return 'voice-note.m4a';
  if (mimeType.includes('aac')) return 'voice-note.aac';
  if (mimeType.includes('wav')) return 'voice-note.wav';
  if (mimeType.includes('webm')) return 'voice-note.webm';
  return 'voice-note.ogg';
}

async function transcribeOpenAIAudio(buffer: Buffer, mimeType: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const form = new FormData();
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), audioFilenameForMime(mimeType));

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok || !data.text) {
      console.error('OpenAI transcription error:', JSON.stringify(data));
      return null;
    }
    return String(data.text).trim();
  } catch (err) {
    console.error('Error transcribing WA audio:', err);
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

const HIGH_IMPACT_VOICE_MOMENTS = new Set(['greeting', 'voice_input_summary']);
type VoiceMoment = 'greeting' | 'checkout_confirmation' | 'thank_you' | 'voice_input_summary';

async function generateVoiceNoteBuffer(text: string): Promise<Buffer | null> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ElevenLabs API Key not configured.");
    
    // Fallback to Adam if not set
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        }
      })
    });
    
    if (!res.ok) throw new Error(`ElevenLabs TTS API Error: ${res.status} ${await res.text()}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Error generating voice note:', err);
    return null;
  }
}

function trimForVoiceReply(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[*_`~#>]/g, '')
    .trim()
    .slice(0, 600);
}

async function sendAIVoiceReply(to: string, replyText: string): Promise<boolean> {
  const voiceText = trimForVoiceReply(replyText);
  if (!voiceText) return false;

  try {
    const audioBuffer = await generateVoiceNoteBuffer(voiceText);
    if (!audioBuffer) return false;

    const audioMediaId = await uploadWAMedia(audioBuffer, 'audio/mpeg', 'voice-note.mp3');
    if (!audioMediaId) {
      console.error('[VOICE] WhatsApp media upload failed - audioMediaId is null');
      return false;
    }

    await sendWAMediaById(to, audioMediaId, 'audio');
    return true;
  } catch (err) {
    console.error('Error sending AI voice reply:', err);
    return false;
  }
}

async function sendHighImpactVoiceReply(to: string, replyText: string, moment: VoiceMoment): Promise<boolean> {
  const shouldSendVoice = HIGH_IMPACT_VOICE_MOMENTS.has(moment);
  if (!shouldSendVoice) return false;
  return sendAIVoiceReply(to, replyText);
}

function buildVoiceInputSummary(transcript: string, replyText: string, language: ChatLanguage) {
  const lower = `${transcript} ${replyText}`.toLowerCase();
  const hasPackageDetails =
    lower.includes('package a') ||
    lower.includes('package b') ||
    lower.includes('package c') ||
    lower.includes('rm') ||
    lower.includes('whisky') ||
    lower.includes('beer') ||
    lower.includes('recommend') ||
    lower.includes('cadang');

  if (language === 'english') {
    return hasPackageDetails
      ? 'Got it boss. I found a few solid options for you, and I put the details clearly in the chat so you can compare properly.'
      : 'Got it boss. I replied in the chat with the next best step for you.';
  }

  if (language === 'chinese') {
    return hasPackageDetails
      ? '明白 boss。我已经把适合的选择放在聊天里，方便你比较价格和库存。'
      : '明白 boss。我已经在聊天里回复你下一步。';
  }

  return hasPackageDetails
    ? 'Ngam boss. KIRA sudah carikan pilihan yang ngam, detail saya letak dalam chat supaya bos senang compare.'
    : 'Ngam boss. KIRA sudah reply dalam chat dengan next step yang paling sesuai.';
}

// Generate lifestyle image using DALL-E 3
async function generatePromoImage(promptText: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: promptText + ' photorealistic, luxury premium lighting, suitable for WhatsApp promo sales.',
        n: 1,
        size: '1024x1024'
      })
    });
    const data = await res.json();
    return data?.data?.[0]?.url || null;
  } catch (err) {
    console.error('Error generating promo image:', err);
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

// Hantar status "typing..." ke WA
async function sendWATypingIndicator(to: string, messageId?: string) {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return;

  try {
    // There are 2 common ways for WA Cloud API, we'll try the sender_action approach or the typing_indicator approach.
    // The official v20+ docs usually recommend this for typing indicator:
    await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageId ? {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' }
      } : {
        messaging_product: 'whatsapp',
        to,
        action: 'typing_on' // fallback format some aggregators use
      }),
    });
  } catch (err) {
    console.error('Error sending typing indicator:', err);
  }
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
async function sendWAImage(to: string, imageUrl: string, caption: string): Promise<boolean> {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!waToken || !waPhoneId) return false;

  // Handle Supabase relative paths if needed, but usually image_url should be absolute or we format it.
  // Assuming imageUrl is a full valid URL here.
  let finalImageUrl = imageUrl;
  if (imageUrl.startsWith('/')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goldenisle-wholesale.vercel.app';
    finalImageUrl = `${appUrl}${imageUrl}`;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
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

    if (!res.ok) {
      console.error('[WA_IMAGE_ERROR]', res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('[WA_IMAGE_ERROR]', 'fetch_failed', err);
    return false;
  }
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

type CatalogProduct = {
  id: string;
  name: string;
  price: number | string;
  category?: string | null;
  stock_quantity?: number | null;
  stock_status?: string | null;
  is_featured?: boolean | null;
  image_url?: string | null;
};

type RecommendedProductCollector = {
  products: CatalogProduct[];
};

function buildProductSections(products: CatalogProduct[], maxSections = 3, maxPerSection = 10) {
  const grouped: Record<string, string[]> = {};
  for (const product of products) {
    const category = (product.category || 'Lain-lain').toUpperCase();
    if (!grouped[category]) grouped[category] = [];
    if (grouped[category].length < maxPerSection) grouped[category].push(String(product.id));
  }

  return Object.entries(grouped)
    .slice(0, maxSections)
    .map(([title, productIds]) => ({ title, productIds }));
}

function buildProductText(products: CatalogProduct[]) {
  return products
    .map((product) => {
      const stock = typeof product.stock_quantity === 'number' ? ` | Stok: ${product.stock_quantity}` : '';
      return `• ${product.name} - RM ${Number(product.price).toFixed(2)}${stock}`;
    })
    .join('\n');
}

function formatProductPrice(price: CatalogProduct['price']) {
  const amount = Number(price);
  if (Number.isFinite(amount)) return `RM${amount.toFixed(2)}`;
  return `RM${price}`;
}

function formatProductStockStatus(product: CatalogProduct) {
  if (product.stock_status === 'in_stock') return 'In stock';
  if (product.stock_status) return product.stock_status.replace(/_/g, ' ');
  if (typeof product.stock_quantity === 'number') return product.stock_quantity > 0 ? 'In stock' : 'Out of stock';
  return 'Check with KIRA';
}

function buildRecommendedProductImageCaption(product: CatalogProduct) {
  return `🥃 ${product.name}\n` +
    `${formatProductPrice(product.price)}\n` +
    `Status: ${formatProductStockStatus(product)}\n\n` +
    `Mau KIRA reserve 1 untuk bos?`;
}

async function sendRecommendedProductImages(
  to: string,
  products: CatalogProduct[],
  options: { sendButtons?: boolean } = {}
) {
  const shouldSendButtons = options.sendButtons === true;
  let sentCount = 0;

  for (const product of products) {
    if (sentCount >= 1) break;

    if (!product.image_url) {
      console.log('[WA_IMAGE_SKIP] product has no image_url', product.name, product.id);
      continue;
    }

    console.log('[WA_IMAGE_SEND]', product.name, product.image_url);
    const sent = await sendWAImage(to, product.image_url, buildRecommendedProductImageCaption(product));
    if (sent) sentCount += 1;
  }

  if (!sentCount || !shouldSendButtons) return;

  await sendWAButtons(to, 'Mau KIRA bantu teruskan yang mana bosku?', [
    { id: 'btn_order', title: 'Reserve 1' },
    { id: 'AI_TANYA_HARGA', title: 'Tanya Harga' },
    { id: 'btn_catalog', title: 'Tengok Lagi' }
  ]);
}

function isRecommendationImageFallbackIntent(text: string) {
  const lower = text.toLowerCase();
  const keywords = [
    'ada rm',
    'bajet',
    'budget',
    'recommend',
    'cadang',
    'paling murah',
    'murah',
    'whisky',
    'beer',
    'party',
    'hadiah',
    'boss',
    'bos',
    'borong',
    'kedai',
  ];

  return keywords.some((keyword) => lower.includes(keyword));
}

function extractBudgetAmount(text: string) {
  const match = text.match(/rm\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function productMatchesRecommendationText(product: CatalogProduct, text: string) {
  const lower = text.toLowerCase();
  const searchable = `${product.name} ${product.category || ''}`.toLowerCase();
  const categoryTerms: string[] = [];

  if (lower.includes('whisky') || lower.includes('whiskey')) categoryTerms.push('whisky', 'whiskey');
  if (lower.includes('beer')) categoryTerms.push('beer');

  if (!categoryTerms.length) return true;
  return categoryTerms.some((term) => searchable.includes(term));
}

async function getFallbackRecommendationProducts(msgText: string): Promise<CatalogProduct[]> {
  const lower = msgText.toLowerCase();
  const budgetAmount = extractBudgetAmount(msgText);
  const cheapIntent = lower.includes('murah') || lower.includes('paling murah');

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, category, stock_status, stock_quantity, image_url')
    .eq('stock_status', 'in_stock')
    .gt('stock_quantity', 0)
    .order('price', { ascending: true })
    .limit(30);

  if (error) {
    console.error('[AI_RECOMMENDATION_PRODUCTS]', 0, error.message);
    return [];
  }

  let candidates = ((data || []) as CatalogProduct[])
    .filter((product) => productMatchesRecommendationText(product, msgText));

  if (budgetAmount !== null) {
    candidates = candidates.filter((product) => Number(product.price) <= budgetAmount);
  }

  if (!cheapIntent) {
    candidates = candidates.sort((a, b) => Number(b.price) - Number(a.price));
  }

  console.log('[AI_RECOMMENDATION_PRODUCTS]', candidates.length);
  return candidates;
}

async function sendFallbackRecommendationImages(
  to: string,
  msgText: string,
  options: {
    sendImages?: boolean;
    recommendedProductCollector?: RecommendedProductCollector;
  } = {}
) {
  if (!isRecommendationImageFallbackIntent(msgText)) return;

  const products = await getFallbackRecommendationProducts(msgText);
  if (options.recommendedProductCollector) {
    options.recommendedProductCollector.products.push(...products);
  }

  if (options.sendImages !== false) {
    await sendRecommendedProductImages(to, products);
  }
}

async function sendRecommendedProducts(
  to: string,
  bodyText: string,
  products: CatalogProduct[],
  emptyText: string,
  options: { sendImages?: boolean } = {}
) {
  const shouldSendImages = options.sendImages !== false;

  if (!products.length) {
    await sendWAText(to, emptyText);
    return;
  }

  const sections = buildProductSections(products);
  const sentList = await sendWAProductList(to, sections, bodyText);
  if (sentList) {
    if (shouldSendImages) {
      await sendRecommendedProductImages(to, products);
    }
    return;
  }

  await sendWAText(to, `${bodyText}\n\n${buildProductText(products)}`);

  if (shouldSendImages) {
    await sendRecommendedProductImages(to, products);
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

async function sendWAAppointmentFlow(to: string, language: ChatLanguage, mode?: 'published' | 'draft'): Promise<boolean> {
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const flowId = process.env.WHATSAPP_APPOINTMENT_FLOW_ID;
  const flowMode: 'published' | 'draft' = mode || (process.env.WHATSAPP_APPOINTMENT_FLOW_MODE === 'published' ? 'published' : 'draft');

  if (!waToken || !waPhoneId || !flowId) {
    console.error('❌ Missing WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, or WHATSAPP_APPOINTMENT_FLOW_ID.');
    return false;
  }

  const flowToken = `gi_appointment_${to}_${Date.now()}`;
  const bodyText =
    language === 'english'
      ? 'Book a quick appointment with Golden Isle. Choose your date, time, and purpose directly in WhatsApp.'
      : language === 'chinese'
        ? '预约 Golden Isle 团队。你可以直接在 WhatsApp 选择日期、时间和预约目的。'
        : 'Buat appointment cepat dengan team Golden Isle. Pilih tarikh, masa, dan tujuan terus dalam WhatsApp.';

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: { type: 'text', text: '📅 Book Appointment' },
      body: { text: bodyText },
      footer: { text: 'Golden Isle Wholesale' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_action: 'navigate',
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: language === 'chinese' ? '填写预约' : 'Book Appointment',
          mode: flowMode,
          flow_action_payload: {
            screen: 'APPOINTMENT_FORM',
          },
        },
      },
    },
  };

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
    if (!res.ok) {
      console.error('❌ sendWAAppointmentFlow error:', JSON.stringify(resData));
      return false;
    }

    console.log('✅ Appointment flow sent!', JSON.stringify(resData));
    return true;
  } catch (err) {
    console.error('❌ Fetch error during sendWAAppointmentFlow:', err);
    return false;
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

  const greetKeywords = ['hai', 'hi', 'hello', 'helo', 'hey', 'assalamualaikum', 'salam', 'start', 'menu', 'mula', 'mulakan', 'apa khabar', 'selamat'];
  const orderKeywords = ['order', 'pesan', 'beli', 'buat pesanan', 'nak beli', 'mau beli', 'nak order', 'mau order', 'tempah'];
  const catalogKeywords = ['catalog', 'katalog', 'senarai', 'produk', 'product', 'list', 'stok', 'stock', 'barang', 'harga semua'];
  const receiptKeywords = ['resit', 'receipt', 'order saya', 'pesanan', 'invois', 'invoice', 'status order', 'order status'];
  const suggestKeywords = ['cadangan', 'suggest', 'suggestion', 'feedback', 'idea', 'saranan', 'komen', 'comment', 'review'];

  // Greet only if short message (≤4 words) to avoid false positives
  if (greetKeywords.some(k => lower.includes(k)) && lower.split(' ').length <= 4) return 'greet';
  if (receiptKeywords.some(k => lower.includes(k))) return 'receipt';
  if (orderKeywords.some(k => lower.includes(k))) return 'order';
  if (catalogKeywords.some(k => lower.includes(k))) return 'catalog';
  if (suggestKeywords.some(k => lower.includes(k))) return 'suggest';
  return 'ai';
}

function isCheckoutIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'checkout',
    'pay',
    'payment',
    'bayar',
    'buat bayaran',
    'order now',
    'place order',
    'confirm order',
    'confirm pesanan',
    'confirm',
    'reserve',
    'booking',
    'book this',
    'ambil',
    'saya ambil',
    'i take',
    'i want to buy',
    'want to buy',
    'mau beli',
    'nak beli',
    'mau order',
    'nak order',
    'buat pesanan',
    'tempah',
    'bulk order'
  ].some(phrase => lower.includes(phrase));
}

function isReceiptStatusIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'resit',
    'receipt',
    'invoice',
    'invois',
    'status order',
    'order status',
    'status pesanan',
    'order saya',
    'pesanan saya',
    'mana order',
    'mana pesanan',
    'sudah bayar',
    'paid already'
  ].some(phrase => lower.includes(phrase));
}

function isHumanHandoffIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'human',
    'real person',
    'talk to sales',
    'sales person',
    'salesman',
    'sales team',
    'admin',
    'staff',
    'agent',
    'call me',
    'contact me',
    'hubungi saya',
    'orang sebenar',
    'orang sales',
    'mau cakap dengan orang',
    'nak cakap dengan orang',
    '\u4eba\u5de5',
    '\u5ba2\u670d',
    '\u9500\u552e'
  ].some(phrase => lower.includes(phrase));
}

function isChaserOptOutIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'stop reminder',
    'stop follow up',
    'jangan remind',
    'jangan follow up',
    'cancel order',
    'cancel pesanan',
    'batalkan order',
    'batalkan pesanan',
    'tak jadi',
    'tidak jadi',
    'not interested',
    'no need'
  ].some(phrase => lower.includes(phrase));
}

type ChatLanguage = 'malay' | 'english' | 'chinese';

function getMalaysiaTimeGreeting(language: ChatLanguage) {
  const hour = (new Date().getUTCHours() + 8) % 24;
  if (hour >= 5 && hour < 12) {
    return language === 'english' ? 'Good morning' : language === 'chinese' ? '早上好' : 'Selamat pagi';
  }
  if (hour >= 12 && hour < 18) {
    return language === 'english' ? 'Good afternoon' : language === 'chinese' ? '下午好' : 'Selamat petang';
  }
  if (hour >= 18 && hour < 22) {
    return language === 'english' ? 'Good evening' : language === 'chinese' ? '晚上好' : 'Selamat malam';
  }
  return language === 'english' ? 'Good night' : language === 'chinese' ? '晚安' : 'Selamat malam';
}

function buildGreetingVoiceText(language: ChatLanguage) {
  if (language === 'english') {
    return 'Hey there, glad you texted Golden Isle. Ask me anything you need, and I will do my best to help.';
  }
  if (language === 'chinese') {
    return '你好，很高兴你联系 Golden Isle。你可以直接问我任何问题，我会尽量帮你。';
  }
  return 'Hai boss, glad bos WhatsApp Golden Isle. Tanya saja apa-apa yang bos perlu, saya cuba bantu sampai ngam.';
}

function detectRequestedLanguage(text: string): ChatLanguage | null {
  const lower = text.toLowerCase();

  if (
    lower.includes('can speak english') ||
    lower.includes('speak in english') ||
    lower.includes('english please') ||
    lower.includes('reply in english') ||
    lower.includes('bahasa english') ||
    lower.includes('use english') ||
    lower.includes('in english')
  ) {
    return 'english';
  }

  if (
    lower.includes('speak chinese') ||
    lower.includes('reply in chinese') ||
    lower.includes('mandarin please') ||
    lower.includes('中文') ||
    lower.includes('华语')
  ) {
    return 'chinese';
  }

  if (
    lower.includes('bahasa melayu') ||
    lower.includes('cakap melayu') ||
    lower.includes('malay please') ||
    lower.includes('speak malay')
  ) {
    return 'malay';
  }

  return null;
}

async function handleLanguageSwitch(from: string, language: ChatLanguage) {
  await supabase.from('customers').update({ preferred_language: language }).eq('phone', from);
  const reply =
    language === 'english'
      ? 'Yes boss, I can speak English. What are you looking for today: shop stock, party drinks, gift ideas, or a package recommendation?'
      : language === 'chinese'
        ? '可以 boss，KIRA 可以用中文回复。你今天想找店铺库存、派对饮料、礼物，还是配套推荐？'
        : 'Boleh boss, KIRA boleh cakap Melayu. Bos cari stok kedai, party, hadiah, atau mau saya suggest package?';

  await sendWAText(from, reply);
}

function detectLanguage(text: string): ChatLanguage {
  const lower = text.toLowerCase();

  if (/[\u4e00-\u9fff]/.test(text)) return 'chinese';
  if (['apa', 'boleh', 'mau', 'saya', 'ada', 'untuk', 'bosku', 'ko', 'ni'].some(word => lower.includes(word))) return 'malay';
  if (['hello', 'hi', 'what', 'how', 'price', 'do you', 'have', 'products', 'browse', 'order', 'thanks', 'thank you', 'english'].some(word => lower.includes(word))) return 'english';

  return 'malay';
}

async function rememberUserLanguage(from: string, text: string): Promise<ChatLanguage> {
  const language = detectLanguage(text);
  // Simpan ke Supabase tanpa sekat (fire and forget boleh, atau await untuk pasti)
  await supabase.from('customers').upsert({ phone: from, preferred_language: language }, { onConflict: 'phone' });
  return language;
}

async function getUserLanguage(from: string): Promise<ChatLanguage> {
  const { data } = await supabase.from('customers').select('preferred_language').eq('phone', from).single();
  return (data?.preferred_language as ChatLanguage) || 'malay';
}

function isProductAvailabilityIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'apa product ko ada',
    'apa produk',
    'produk apa ada',
    'what products do you have',
    'what product',
    'have products',
    '有什么产品',
    '什么产品',
  ].some(phrase => lower.includes(phrase));
}

function isProspectQualificationIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'saya berminat',
    'berminat dengan promo',
    'saya mau tanya',
    'nak tahu harga',
    'cari stok',
    'stok kedai',
    'untuk kedai',
    'untuk restoran',
    'untuk event',
    'party',
    'event',
    'interested',
    'i am interested',
    'want to know price',
    'looking for stock',
    'for my shop',
    'for restaurant',
    'for event',
    'party supply',
    'wholesale',
    '我有兴趣',
    '想知道价格',
    '批发',
    '店',
    '餐厅',
    '活动',
  ].some(phrase => lower.includes(phrase));
}

function isAppointmentIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'appointment',
    'appoint',
    'meeting',
    'meet',
    'jumpa',
    'berjumpa',
    'datang kedai',
    'datang office',
    'mau discuss',
    'nak discuss',
    'set appointment',
    'book appointment',
    'event besar',
    'corporate',
  ].some(phrase => lower.includes(phrase));
}

function isLocationIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return [
    'location',
    'alamat',
    'kedai di mana',
    'di mana kedai',
    'where is your shop',
    'where are you',
    'shop location',
    'store location',
    'showroom',
    'google map',
    'google maps',
    'maps',
    'waze',
  ].some(phrase => lower.includes(phrase));
}

function buildStoreLocationText(language: ChatLanguage) {
  const locationText = process.env.WHATSAPP_STORE_LOCATION_TEXT || 'Golden Isle Wholesale, Labuan, Malaysia';
  const mapUrl = process.env.WHATSAPP_STORE_MAP_URL || process.env.NEXT_PUBLIC_STORE_MAP_URL || 'https://www.google.com/maps/search/?api=1&query=Golden%20Isle%20Wholesale%20Labuan';

  if (language === 'english') {
    return `📍 *Golden Isle location*\n\n${locationText}\n\nGoogle Maps:\n${mapUrl}\n\nBoss, if you want to visit, tell me your preferred day/time and KIRA can suggest an appointment with the team.`;
  }

  if (language === 'chinese') {
    return `📍 *Golden Isle location*\n\n${locationText}\n\nGoogle Maps:\n${mapUrl}\n\nIf you want to visit, send KIRA your preferred day/time and the team can follow up.`;
  }

  return `📍 *Location Golden Isle*\n\n${locationText}\n\nGoogle Maps:\n${mapUrl}\n\nKalau bos mau datang, bagitahu hari/masa yang ngam. KIRA boleh suggest appointment dengan team.`;
}

async function handleStoreLocation(from: string) {
  const language = await getUserLanguage(from);
  await sendWAButtons(from, buildStoreLocationText(language), [
    { id: 'btn_talk_sales', title: 'Set Appointment' },
    { id: 'LIHAT_CATALOG', title: language === 'english' ? 'View Catalog' : 'Tengok Catalog' },
    { id: 'TANYA_KIRA', title: language === 'english' ? 'Ask KIRA' : 'Tanya KIRA' }
  ]);
}

async function handleAppointmentSuggestion(from: string) {
  const language = await getUserLanguage(from);
  const sentFlow = await sendWAAppointmentFlow(from, language);
  if (sentFlow) return;

  const body =
    language === 'english'
      ? "Boss, this sounds like something worth planning properly. KIRA can suggest a quick appointment with the Golden Isle team so we can match the right stock, budget, and delivery timing.\n\nTell me your preferred day/time, or tap below and our sales team can follow up."
      : language === 'chinese'
        ? "Boss, this sounds like a good one to plan with the team. Send KIRA your preferred day/time, or tap below and Golden Isle sales can follow up."
        : "Boss, ni nampak macam order yang bagus untuk plan betul-betul. KIRA boleh suggest appointment cepat dengan team Golden Isle supaya stok, bajet, dan delivery timing semua ngam.\n\nBos boleh reply hari/masa yang sesuai, atau tekan bawah biar sales team follow up.";

  await sendWAButtons(from, body, [
    { id: 'btn_talk_sales', title: 'Set Appointment' },
    { id: 'LIHAT_CATALOG', title: language === 'english' ? 'View Catalog' : 'Tengok Catalog' },
    { id: 'SEMAK_STOK', title: language === 'english' ? 'Check Stock' : 'Semak Stok' }
  ]);
}

async function handleHumanHandoff(from: string, reason = 'Customer requested human handoff') {
  const language = await getUserLanguage(from);

  await supabase.from('orders')
    .update({ chaser_opted_out: true })
    .eq('customer_phone', from)
    .in('payment_status', ['unpaid', 'pending_payment', 'pending']);

  const reply =
    language === 'english'
      ? 'Okay boss. I will get the Golden Isle sales team to follow up with you shortly.'
      : language === 'chinese'
        ? 'Okay boss. Golden Isle sales team will follow up with you shortly.'
        : 'Okay boss. Saya roger team Golden Isle untuk follow up bos sekejap lagi.';

  await sendWAText(from, reply);
  await notifyTelegram(`📞 <b>SALES HANDOFF REQUEST</b>\nPhone: +${from}\nReason: ${reason}\n<i>Please follow up as soon as possible.</i>`);
}

async function sendQualificationMenu(from: string) {
  const language = await getUserLanguage(from);
  const body =
    language === 'chinese'
      ? "🔥 很好。KIRA 会帮你找到合适的选择。\n\n你要找饮料用于什么场景？"
      : language === 'english'
        ? "🔥 Great. KIRA can help you find the right options.\n\nWhat are you looking for drinks for?"
        : "🔥 Mantap bosku. KIRA bantu cari pilihan yang ngam.\n\nBos cari minuman untuk apa?";

  await sendWAButtons(
    from,
    body,
    [
      { id: 'QUALIFY_RETAIL', title: language === 'chinese' ? '🏪 店铺 / 零售' : language === 'english' ? '🏪 Shop / Retail' : '🏪 Kedai / Retail' },
      { id: 'QUALIFY_RESTAURANT', title: language === 'chinese' ? '🍽️ 餐厅 / 酒吧' : language === 'english' ? '🍽️ Restaurant / Bar' : '🍽️ Restoran / Bar' },
      { id: 'QUALIFY_EVENT', title: language === 'chinese' ? '🎉 活动 / 派对' : language === 'english' ? '🎉 Event / Party' : '🎉 Event / Party' }
    ]
  );
}

async function sendCatalogFollowUp(from: string) {
  const language = await getUserLanguage(from);
  const body =
    language === 'chinese'
      ? "有看到感兴趣的产品吗？"
      : language === 'english'
        ? "Found anything interesting?"
        : "Dah jumpa produk yang menarik bosku?";

  await sendWAButtons(from, body, [
    { id: 'SEMAK_STOK', title: language === 'chinese' ? '📦 查询库存' : language === 'english' ? '📦 Check Stock' : '📦 Semak Stok' },
    { id: 'TANYA_KIRA', title: language === 'chinese' ? '💬 问 KIRA' : language === 'english' ? '💬 Ask KIRA' : '💬 Tanya KIRA' },
    { id: 'LIHAT_CATALOG', title: language === 'chinese' ? '🛒 查看全部' : language === 'english' ? '🛒 View All' : '🛒 Tengok Semua' }
  ]);
}

async function handleProductAvailability(from: string, text: string) {
  const language = await rememberUserLanguage(from, text);
  const reply =
    language === 'chinese'
      ? "📦 Golden Isle 有几种饮料分类：\n\n🍺 啤酒\n🍷 葡萄酒\n🥃 威士忌\n🍸 烈酒\n\n我现在打开目录给你查看所有产品 👇"
      : language === 'english'
        ? "📦 Golden Isle has several drink categories:\n\n🍺 Beer\n🍷 Wine\n🥃 Whisky\n🍸 Spirits\n\nI'll open the catalog so you can browse all products 👇"
        : "📦 Golden Isle ada beberapa kategori minuman:\n\n🍺 Beer\n🍷 Wine\n🥃 Whisky\n🍸 Spirits\n\nSaya buka catalog untuk bos tengok semua produk ya 👇";

  await sendWAText(from, reply);
  await handleCatalog(from);
}

// ── Handlers ─────────────────────────────────────────────────────────────────

// GREETING: Hantar welcome message dengan 3 Quick Reply Buttons
async function handleGreeting(from: string) {
  const language = await getUserLanguage(from);
  const timeGreeting = getMalaysiaTimeGreeting(language);
  const body =
    language === 'chinese'
      ? `👋 ${timeGreeting}, welcome to Golden Isle Wholesale 🥃\n\nKIRA can help with shop stock, party drinks, gift ideas, package suggestions, appointments, and orders.\n\nWhat are you planning today?`
      : language === 'english'
        ? `👋 ${timeGreeting} boss! Welcome to Golden Isle Wholesale 🥃\n\nKIRA can help with shop stock, party drinks, gift ideas, package suggestions, appointments, and orders.\n\nWhat are you planning today?`
        : `👋 ${timeGreeting} boss! Selamat datang ke Golden Isle Wholesale 🥃\n\nKIRA boleh bantu bos cari stok kedai, minuman party, hadiah, suggest package, set appointment, dan urus order.\n\nBos cari untuk apa hari ni?`;

  await sendHighImpactVoiceReply(from, buildGreetingVoiceText(language), 'greeting');

  await sendWAButtons(
    from,
    body,
    [
      { id: 'TANYA_KIRA', title: language === 'chinese' ? '🤖 问 KIRA' : language === 'english' ? '🤖 Ask KIRA' : '🤖 Tanya KIRA' },
      { id: 'LIHAT_CATALOG', title: language === 'chinese' ? '📦 浏览产品' : language === 'english' ? '📦 Browse Products' : '📦 Browse Products' },
      { id: 'MAKE_APPOINTMENT', title: language === 'chinese' ? '📅 预约' : language === 'english' ? '📅 Appointment' : '📅 Appointment' },
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
  const language = await getUserLanguage(from);
  const text =
    language === 'chinese'
      ? "🛒 想下单吗？我先打开产品目录给你看看。\n\n你可以选择产品查看价格，然后把产品加入购物车。👇"
      : language === 'english'
        ? "🛒 Ready to order? I'll open the product catalog for you first.\n\nChoose a product to view details, then add it to cart when you're ready. 👇"
        : `🛒 *Bosku nak buat pesanan? Tengok-tengok katalog dulu ya!*\n\n` +
          `Pilih produk kat bawah ni, klik untuk tengok harga. ` +
          `Lepas order, KIRA akan uruskan cepat-cepat untuk bosku! 👇`;

  // Fallback: tunjuk catalog interaktif terus sebab WA Flow 'draft' tak support WA Web
  await sendWAText(from, text);
  await handleCatalog(from);
}

// CATALOG: Cuba native Meta catalog dulu, fallback ke interactive list
async function handleCatalog(from: string) {
  const language = await getUserLanguage(from);
  const catalogId = process.env.WHATSAPP_CATALOG_ID;

  // ── 1. Cuba Native Meta Catalog (Add to Cart butang) ──────────────────────
  if (catalogId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, category')
      .eq('stock_status', 'in_stock')
      .gt('stock_quantity', 0)
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
      const productListText =
        language === 'chinese'
          ? '以下是 Golden Isle 的产品。你可以选择产品并加入购物车。'
          : language === 'english'
            ? 'Here are Golden Isle products. Select an item to view details and add it to cart.'
            : undefined;
      const sentList = await sendWAProductList(from, nativeSections, productListText);
      if (sentList) {
        await new Promise(r => setTimeout(r, 1000));
        await sendCatalogFollowUp(from);
        return;
      }

      // Fallback: catalog_message (tunjuk semua catalog sekaligus)
      const thumbnailId = String(products[0].id);
      const sentCatalog = await sendWACatalogMessage(
        from,
        language === 'chinese'
          ? '🛍️ 浏览 Golden Isle 所有产品。选择产品后可以直接加入购物车。'
          : language === 'english'
            ? '🛍️ Browse all Golden Isle products. Select a product to add it to cart.'
            : '🛍️ Tengok semua produk Golden Isle bosku! Tekan produk untuk Add to Cart terus! 🛒🍻',
        thumbnailId
      );
      if (sentCatalog) {
        await new Promise(r => setTimeout(r, 1000));
        await sendCatalogFollowUp(from);
        return;
      }
    }
  }

  // ── 2. Fallback: WA Interactive List (lama) ────────────────────────────────
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, category, description')
    .eq('stock_status', 'in_stock')
    .gt('stock_quantity', 0)
    .order('category')
    .limit(10);

  if (error || !products || products.length === 0) {
    await sendWAText(
      from,
      language === 'chinese'
        ? '⚠️ 抱歉，库存正在更新。请联系管理员获取最新信息。'
        : language === 'english'
          ? '⚠️ Sorry, stock is being updated. Please contact admin for the latest info.'
          : '⚠️ Maaf bosku, stok sedang dikemaskini. Sila hubungi admin untuk info terbaru.'
    );
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
    const text =
      language === 'chinese'
        ? `🛍️ *Golden Isle 产品目录*\n\n${textList}\n\n_请选择产品，或直接输入产品名称。_`
        : language === 'english'
          ? `🛍️ *Golden Isle Product Catalog*\n\n${textList}\n\n_Select a product or type the product name directly._`
          : `🛍️ *Golden Isle — Catalog Produk*\n\n${textList}\n\n_Pilih produk yang mau, taip nama dia terus ya bosku!_`;
    await sendWAText(from, text);
    await sendCatalogFollowUp(from);
  } else {
    await sendWAInteractiveList(from, sections);
    await new Promise(r => setTimeout(r, 1500));
    await sendCatalogFollowUp(from);
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
    await sendHighImpactVoiceReply(from, voiceScript, 'thank_you');
  } catch (voiceErr) {
    console.error('Failed to generate/send Voice Note:', voiceErr);
  }
}

// SUGGESTION BOX: Simpan feedback & notify admin
async function handleSuggestion(from: string, msgText: string) {
  const language = await getUserLanguage(from);
  const { data: customer } = await supabase.from('customers').select('is_awaiting_suggestion').eq('phone', from).single();

  // Kalau user dalam mod "tunggu jawapan suggestion"
  if (customer?.is_awaiting_suggestion) {
    await supabase.from('customers').update({ is_awaiting_suggestion: false }).eq('phone', from);

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

    const thanksText =
      language === 'english'
        ? 'Thanks for the suggestion. The Golden Isle team will review it.'
        : language === 'chinese'
          ? '谢谢你的建议。Golden Isle 团队会认真查看。'
          : 'Terima kasih boss. Team Golden Isle akan semak cadangan bos.';

    await sendWAText(from, thanksText);
    return;
  }

  // Mulakan sesi suggestion — minta input dulu
  await supabase.from('customers').update({ is_awaiting_suggestion: true }).eq('phone', from);
  const promptText =
    language === 'english'
      ? 'Sure boss. Please send your suggestion or feedback here.'
      : language === 'chinese'
        ? '可以 boss。请直接在这里发送你的建议或反馈。'
        : 'Boleh boss. Tulis cadangan atau feedback bos di sini.';

  await sendWAText(from, promptText);
  return;
}



// AI CHAT: Guna OpenAI dengan konteks katalog
async function handleAIChat(
  from: string,
  msgText: string,
  options: {
    sendText?: boolean;
    sendProductImages?: boolean;
    recommendedProductCollector?: RecommendedProductCollector;
  } = {}
): Promise<string | null> {
  const shouldSendText = options.sendText !== false;
  const shouldSendProductImages = options.sendProductImages !== false;
  const requestedLanguage = detectRequestedLanguage(msgText);
  const detectedLanguage = requestedLanguage || await getUserLanguage(from) || detectLanguage(msgText);
  const language = detectedLanguage as ChatLanguage;
  await supabase.from('customers').upsert({ phone: from, preferred_language: language }, { onConflict: 'phone' });
  let catalogText = 'Tiada maklumat stok terkini.';
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, category, stock_status, stock_quantity, image_url')
    .eq('stock_status', 'in_stock');

  if (products && products.length > 0) {
    catalogText = products.map(p => `- ID: ${p.id} | ${p.name} (RM ${p.price}) [Kategori: ${p.category || 'Lain-lain'}]`).join('\n');
  }

  const languageRules = {
    malay: `Reply in friendly Sabah Malay. Use "bosku" naturally. Keep the tone warm, helpful and sales-focused.`,
    english: `Reply in English only. Be professional, friendly and sales-focused. Do NOT use "bosku" or Malay slang.`,
    chinese: `Reply in Simplified Chinese only. Do NOT mix Malay or English. Be professional, friendly and sales-focused. Do NOT use "bosku".`,
  }[language];
  const ctaExample = {
    malay: `"Mau order sekarang bosku?", "KIRA sedia tolong!"`,
    english: `"Would you like to order now?", "KIRA is ready to help."`,
    chinese: `"你想现在下单吗？", "KIRA 可以帮你。"`
  }[language];
  const thankYouReply = {
    malay: `"Sama-sama bosku! Jangan segan order lagi tau 😊"`,
    english: `"You're welcome. Feel free to order again anytime 😊"`,
    chinese: `"不客气。需要下单时随时告诉我 😊"`
  }[language];
  const catalogFollowUp = {
    malay: `"Bosku nampak something menarik? KIRA boleh suggest yang best untuk bosku!"`,
    english: `"Did anything catch your eye? KIRA can recommend the best options for you."`,
    chinese: `"有看到感兴趣的产品吗？KIRA 可以为你推荐合适的选择。"`
  }[language];
  const upsellExample = {
    malay: `"Bosku, ramai customer ambil [related product] sekali dengan order macam ni. Mau KIRA tambahkan?"`,
    english: `"Many customers pair [related product] with this kind of order. Would you like me to add it?"`,
    chinese: `"很多客户会把 [related product] 和这类订单一起购买。需要我帮你加上吗？"`
  }[language];

  const systemPrompt = `You are KIRA, Golden Isle Wholesale's calm, confident male senior sales consultant for Sabah & Labuan, Malaysia. You know the products well, speak naturally, and help customers buy without sounding pushy. Reply like a sharp human salesperson, not a robotic chatbot and not an excited new hire.

1. HUMOR & WARMTH (CRITICAL):
- Use light humour only when it feels natural. One emoji max unless the customer is playful first.
- Be warm, friendly, and highly sales-focused.
- NEVER break character.
- NEVER say "I am an AI", "Saya AI", or mention being an artificial intelligence.
- Do NOT force a question or CTA on every reply. Use one only when it moves the customer forward.
- When a CTA is useful, keep it short like: ${ctaExample}
- If user says thank you, ALWAYS reply in the detected language with: ${thankYouReply}

2. SALES INTELLIGENCE & NEXT ACTION:
- Think like a consultative salesperson: infer budget, category, purpose, urgency, and stock fit from the message before replying.
- Be direct, calm, and short. One small human line is enough.
- If the customer shows buying signal, switch to cashier mode: stop recommending and guide them to order/payment/details.
- Buying signal means quantity, budget, "mau order", "nak beli", "reserve", "confirm", "bayar", or a specific product choice.
- After a user views the catalog or asks about products, follow up only when helpful: ${catalogFollowUp}
- After an order is placed or discussed, upsell only if it does not delay checkout: ${upsellExample}
- For package suggestions, write clear text packages only. Use this format:
  Package A — RM...
  Package B — RM...
  Package C — RM...
- Keep package details in text. Do not ask for package details to be converted into TTS.
- If the user sounds B2B/serious (shop, restaurant, borong, bulk, event, corporate), suggest a short appointment with the Golden Isle team.
- If the user asks for shop address/location/showroom/maps, tell them KIRA can send the location.

3. RESPONSE DISCIPLINE RULES:
- Answer ONLY what was asked. Nothing more.
- Target 1 message per reply. Maximum 2 messages if a product image or catalog UI is truly useful.
- Do NOT send voice notes unless the user sent a voice note first.
- Do NOT send images unless the user asks for images or you are recommending a specific product.
- Do NOT repeat CTAs. One CTA maximum, at the end only.
- If user asks location, send location only and stop.
- If user asks for human/sales/admin, hand off and stop.
- If user says thank you, say thank you and stop.

4. IMAGES & VISUALS (CRITICAL):
- When user asks for images (e.g. "ada gambar?", "show product", "macam mana rupa?", "recommend untuk party", "gift set ada?", "promo ada?", "tunjuk yang nampak premium"):
- If recommending a specific product, call 'recommend_products'. Keep it to the best few options.
- If showing a general promotional lifestyle image as a demo, you MUST call 'generate_promo_image' tool. Don't generate for every message, only when it helps sales.

5. LANGUAGE STYLE:
- ${languageRules}
- NEVER use Indonesian slang ("kamu", "dong", "sih", "deh", "banget", "aja").
- Max 3 sentences per reply unless explaining an order.
- Use emojis sparingly.

Current Stock & Prices:
${catalogText}

Business Rules (CRITICAL — you are the SOLE decision-maker):
- Greetings & Small Talk → Do NOT call any tools. Reply with friendly text only.
- Recommend Products → ALWAYS call 'recommend_products'. Do NOT list products in plain text.
- Full Catalog → Call 'view_full_catalog' ONLY when explicitly requested.
- Order/Checkout/Buy → Call 'start_order' to open the catalog for them.
- Receipt/Invoice/Order Status → Call 'check_order_status'.
- Location/Address/Maps/Waze → Call 'send_location'.
- Appointment/Meeting/Visit → Call 'book_appointment'.
- Human/Salesman/Admin Request → Call 'escalate_to_human'.
- Price Inquiry → Call 'tanya_harga' with the product ID.
- Promo Images → Call 'generate_promo_image' ONLY when visual demo helps sales.
- Payment → we accept bank transfer & FPX.
- You must call EXACTLY ONE tool per response when an action is needed. Do NOT combine text reply with a tool call.`;

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
        description: 'Call this ONLY when the user asks for product recommendations, searches for specific beverages, or wants to buy specific items. This will display them as a native interactive Multi-Product List in WhatsApp.',
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
        name: 'generate_promo_image',
        description: 'Call this ONLY when the user asks to see a promo image, gift set, premium setup, party setup, or general visual demo of our offerings.',
        parameters: {
          type: 'object',
          properties: {
            theme_prompt: {
              type: 'string',
              description: 'A short visual prompt for the image (e.g. "Premium whisky bottle on luxury bar counter", "Craft beer party setup")'
            },
            caption: {
              type: 'string',
              description: 'Catchy sales caption for the image in the user language / Sabahan slang.'
            }
          },
          required: ['theme_prompt', 'caption']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'view_full_catalog',
        description: 'Call this ONLY when the user explicitly asks to browse the entire store catalog, see all products, or check the full product list.',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Body message inviting them to view the catalog in the user language / Sabahan slang (max 3 sentences). No markdown or bullet points.'
            }
          },
          required: ['text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'escalate_to_human',
        description: 'Call when the customer is frustrated, explicitly asks for a real person/salesman/admin, or when you truly cannot help them after trying.',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Brief reason for escalation' }
          },
          required: ['reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'check_order_status',
        description: 'Call when the user asks about their order status, receipt, invoice, or payment status.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Brief acknowledgement message in user language.' }
          },
          required: ['text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'send_location',
        description: 'Call when the user asks for the shop address, location, Google Maps, Waze, or showroom directions.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Brief message in user language.' }
          },
          required: ['text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'book_appointment',
        description: 'Call when the user wants to set up a meeting, appointment, visit the office, or discuss a large/corporate order in person.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Brief message in user language.' }
          },
          required: ['text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'start_order',
        description: 'Call when the user wants to place an order, checkout, buy, or proceed to payment.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Brief message inviting them to browse and order.' }
          },
          required: ['text']
        }
      }
    }
  ];

  const { data: pastMsgs } = await supabase
    .from('wa_messages')
    .select('role, content')
    .eq('phone', from)
    .order('created_at', { ascending: false })
    .limit(20);

  const history = (pastMsgs || []).reverse().map(m => ({ role: m.role, content: m.content }));
  history.push({ role: 'user', content: msgText });

  await supabase.from('wa_messages').insert({ phone: from, role: 'user', content: msgText });

  // ── Build Customer Context (from contextBuilder.ts) ──
  const ctx = createEmptyContext();
  for (const msg of history) {
    if (msg.role === 'user') {
      Object.assign(ctx, extractContextFromMessage(msg.content, ctx));
    }
  }
  const contextBlock = buildContextBlock(ctx);

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt + (contextBlock ? '\n\n' + contextBlock : '') },
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
        const availableProducts = (products || []) as CatalogProduct[];
        const productById = new Map(availableProducts.map((product) => [String(product.id), product]));
        const recommendedProducts: CatalogProduct[] = [];
        const seenProductIds = new Set<string>();
        const formattedSections = (sections || []).map((s: any) => ({
          title: s.title || 'Cadangan',
          productIds: (s.product_ids || [])
            .map((id: string | number) => String(id))
            .filter((id: string) => {
              const product = productById.get(id);
              if (!product) return false;
              if (seenProductIds.has(id)) return false;
              recommendedProducts.push(product);
              seenProductIds.add(id);
              return true;
            }),
        })).filter((s: { productIds: string[] }) => s.productIds.length > 0);

        console.log(`🤖 AI recommending products via tool:`, JSON.stringify(formattedSections));
        console.log('[AI_RECOMMENDATION_PRODUCTS]', recommendedProducts.length);
        if (!recommendedProducts.length) {
          const fallback =
            language === 'english'
              ? 'Sorry, KIRA could not match that recommendation to current in-stock catalog products. Want to view the catalog?'
              : 'Maaf bosku, KIRA belum dapat match cadangan tu dengan produk in-stock dalam catalog. Mau tengok catalog dulu?';

          await sendWAButtons(from, fallback, [
            { id: 'btn_catalog', title: language === 'english' ? 'View Catalog' : 'Tengok Lagi' },
            { id: 'TANYA_KIRA', title: 'Tanya KIRA' }
          ]);
          history.push({ role: 'assistant', content: `[System Note: Recommendation IDs were not found in Supabase catalog; sent catalog fallback.]` });
          return fallback;
        }

        const success = await sendWAProductList(from, formattedSections, text);
        if (!success && shouldSendText) {
          await sendWAText(from, text);
        }

        if (options.recommendedProductCollector) {
          options.recommendedProductCollector.products.push(...recommendedProducts);
        }

        if (shouldSendProductImages) {
          await sendRecommendedProductImages(from, recommendedProducts);
        }

        history.push({ role: 'assistant', content: `[System Note: Successfully recommended products to user using WhatsApp Product List UI. The text intro was: ${text}]` });
        return text || null;
      }

      if (functionName === 'generate_promo_image') {
        const { theme_prompt, caption } = args;
        console.log(`🤖 AI generating promo image for: ${theme_prompt}`);
        
        if (shouldSendText) await sendWAText(from, "Sekejap bosku, KIRA tengah sediakan gambar yang paling ngam untuk bosku... 📸✨");
        
        const imageUrl = await generatePromoImage(theme_prompt);
        if (imageUrl) {
          await sendWAImage(from, imageUrl, caption);
          history.push({ role: 'assistant', content: `[System Note: Successfully sent generated promotional image with caption: ${caption}]` });
        } else {
          if (shouldSendText) await sendWAText(from, caption);
          history.push({ role: 'assistant', content: `[System Note: Sent text caption because image generation failed: ${caption}]` });
        }
        return caption || null;
      }

      if (functionName === 'view_full_catalog') {
        const { text } = args;
        const thumbnailId = products && products.length > 0 ? String(products[0].id) : undefined;
        console.log(`🤖 AI showing full catalog via tool`);
        const success = await sendWACatalogMessage(from, text, thumbnailId);
        if (!success && shouldSendText) {
          await sendWAText(from, text);
        }
        await sendCatalogFollowUp(from);
        history.push({ role: 'assistant', content: `[System Note: Successfully sent the full product catalog to user using WhatsApp Catalog UI. The text intro was: ${text}]` });
        return text || null;
      }

      if (functionName === 'tanya_harga') {
        const { product_id, product_name } = args;
        console.log(`🤖 AI handling tanya_harga for product: ${product_name} (${product_id})`);

        let resolvedProduct: CatalogProduct | null = null;
        
        // Validate against Supabase
        const { data: byId } = await supabase
          .from('products')
          .select('id, name, price, category, stock_status, stock_quantity, image_url')
          .eq('id', product_id)
          .maybeSingle();
        if (byId) {
          resolvedProduct = byId;
        } else {
          const searchTerm = product_name || product_id;
          const { data: byName } = await supabase
            .from('products')
            .select('id, name, price, category, stock_status, stock_quantity, image_url')
            .ilike('name', `%${searchTerm}%`)
            .limit(1)
            .maybeSingle();
          if (byName) resolvedProduct = byName;
        }

        if (resolvedProduct) {
          const question =
            language === 'chinese'
              ? `你想买 *${resolvedProduct.name}* 用在什么场合？`
              : language === 'english'
                ? `What are you buying *${resolvedProduct.name}* for?`
                : `Bosku order *${resolvedProduct.name}* ni untuk apa ni?`;
          await sendWAButtons(from, question, [
            { id: `tanya_qty_event_${resolvedProduct.id}`, title: '🎉 Event/Party' },
            { id: `tanya_qty_stok_${resolvedProduct.id}`, title: language === 'english' ? '🏪 Shop Stock' : language === 'chinese' ? '🏪 店铺库存' : '🏪 Stok Kedai' },
            { id: `tanya_qty_cuba_${resolvedProduct.id}`, title: language === 'english' ? '🍺 Try First' : language === 'chinese' ? '🍺 先试试' : '🍺 Cuba Dulu' }
          ]);
          await sendRecommendedProductImages(from, [resolvedProduct], { sendButtons: false });
          history.push({ role: 'assistant', content: `[System Note: Successfully sent the Tiered Pricing Step 1 options to user for product: ${resolvedProduct.name}]` });
          return question;
        } else {
          const notFound =
            language === 'chinese'
              ? '抱歉，KIRA 还不能在目录里匹配这个产品。要我打开目录让你直接选择吗？'
              : language === 'english'
                ? 'Sorry, KIRA could not match that product in the catalog. Would you like me to open the catalog so you can choose directly?'
                : 'Maaf bosku, KIRA belum dapat match produk tu dengan catalog. Mau KIRA buka catalog untuk bosku pilih terus?';
          await sendWAButtons(from, notFound, [
            { id: 'LIHAT_CATALOG', title: language === 'english' ? '🛍️ Catalog' : language === 'chinese' ? '🛍️ 目录' : '🛍️ Tengok Catalog' },
            { id: 'TANYA_KIRA', title: '💬 Tanya KIRA' }
          ]);
          history.push({ role: 'assistant', content: `[System Note: Product not found, fallback to catalog prompt.]` });
          return notFound;
        }
      }

      // ── NEW TOOL: escalate_to_human ──
      if (functionName === 'escalate_to_human') {
        const { reason } = args;
        console.log(`🤖 AI escalating to human: ${reason}`);
        await handleHumanHandoff(from, reason || 'AI decided escalation was needed');
        history.push({ role: 'assistant', content: `[System Note: Escalated to human sales team. Reason: ${reason}]` });
        return null;
      }

      // ── NEW TOOL: check_order_status ──
      if (functionName === 'check_order_status') {
        const { text } = args;
        console.log(`🤖 AI checking order status`);
        if (text && shouldSendText) await sendWAText(from, text);
        await handleReceipt(from);
        history.push({ role: 'assistant', content: `[System Note: Showed order status/receipt to user.]` });
        return text || null;
      }

      // ── NEW TOOL: send_location ──
      if (functionName === 'send_location') {
        console.log(`🤖 AI sending store location`);
        await handleStoreLocation(from);
        history.push({ role: 'assistant', content: `[System Note: Sent store location to user.]` });
        return null;
      }

      // ── NEW TOOL: book_appointment ──
      if (functionName === 'book_appointment') {
        console.log(`🤖 AI booking appointment`);
        await handleAppointmentSuggestion(from);
        history.push({ role: 'assistant', content: `[System Note: Sent appointment booking flow to user.]` });
        return null;
      }

      // ── NEW TOOL: start_order ──
      if (functionName === 'start_order') {
        const { text } = args;
        console.log(`🤖 AI starting order flow`);
        if (text && shouldSendText) await sendWAText(from, text);
        await handleCatalog(from);
        history.push({ role: 'assistant', content: `[System Note: Opened catalog/order flow for user.]` });
        return text || null;
      }
    }

    const reply = choiceMessage?.content || (
      language === 'chinese'
        ? '抱歉，KIRA 这里暂时卡了一下。请再试一次。'
        : language === 'english'
          ? 'Sorry, KIRA got stuck for a moment. Please try again.'
          : 'Maaf bosku, otak saya sangkut sikit kejap. Cuba lagi ya!'
    );
    history.push({ role: 'assistant', content: reply });
    await supabase.from('wa_messages').insert({ phone: from, role: 'assistant', content: reply });
    if (shouldSendText) await sendWAText(from, reply);
    // ❌ REMOVED: sendFallbackRecommendationImages — was causing "phantom catalog" spam.
    // KIRA now controls product display exclusively via recommend_products tool.
    return reply;
  } catch (err) {
    console.error('Error in handleAIChat:', err);
    await sendWAText(
      from,
      language === 'chinese'
        ? '抱歉，AI 系统暂时有点问题。请再试一次。'
        : language === 'english'
          ? 'Sorry, there was a small AI system error. Please try again.'
          : 'Maaf bosku, ada ralat sikit dalam sistem AI. Cuba lagi ya.'
    );
    return null;
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


// ── VERIFIKASI WEBHOOK SIGNATURE (ANTI-HACKER) ──────────────────────────────
function verifyWebhookSignature(req: Request, bodyText: string): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // Skip sekuriti kalau takde (untuk dev)

  const signature = req.headers.get('x-hub-signature-256');
  if (!signature) {
    console.error('❌ Tiada signature X-Hub-Signature-256');
    return false;
  }

  try {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(bodyText, 'utf8').digest('hex');
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (err) {
    console.error('❌ Ralat semasa verify signature:', err);
    return false;
  }
}

// ── TANGKAP MESEJ MASUK (POST) ───────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    
    // 1. VERIFIKASI SIGNATURE
    if (!verifyWebhookSignature(request, bodyText)) {
      console.error('❌ Webhook Signature Gagal! Permintaan ditolak.');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = JSON.parse(bodyText);

    if (body.object === 'whatsapp_business_account' || body.field === 'messages') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      
      // 2. IDEMPOTENCY CHECK (ANTI-DOUBLE REPLY)
      const messageId = message?.id;
      if (messageId) {
        const { data: existingMsg } = await supabase
          .from('wa_webhooks')
          .select('message_id')
          .eq('message_id', messageId)
          .single();
        
        if (existingMsg) {
          console.log('⚡ Duplicate webhook event received, skipping:', messageId);
          return new NextResponse('EVENT_RECEIVED', { status: 200 }); // Meta berhenti hantar
        }
        
        // Simpan message_id supaya tak proses lagi
        const fromNumber = message.from || 'unknown';
        await supabase.from('wa_webhooks').insert({ message_id: messageId, phone: fromNumber }).select();
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
        } else if (buttonPayload === 'MAKE_APPOINTMENT') {
          await handleAppointmentSuggestion(from);
        } else if (buttonPayload === 'btn_receipt' || buttonPayload === '🧾 Semak Resit' || buttonPayload === 'SEMAK_RESIT') {
          await handleReceipt(from);
        } else if (buttonPayload === 'btn_suggest' || buttonPayload === '💡 Beri Cadangan') {
          await handleSuggestion(from, buttonPayload);
        } else if (buttonPayload === 'SEMAK_STOK') {
          const language = await getUserLanguage(from);
          await sendWAText(
            from,
            language === 'chinese'
              ? "📦 KIRA 会帮你查询最新库存。\n\n你可以从目录选择产品，或直接输入想查询的产品名称。"
              : language === 'english'
                ? "📦 KIRA will help you check the latest stock.\n\nYou can choose a product from the catalog or type the product name you want to check."
                : "📦 KIRA semak stok terkini untuk bosku.\n\nBoleh pilih produk dari catalog atau taip nama produk yang bos mau check."
          );
          await handleCatalog(from);
        } else if (buttonPayload === 'TANYA_KIRA') {
          const language = await getUserLanguage(from);
          const body =
            language === 'chinese'
              ? "🤖 KIRA 可以帮你：\n\n💰 查询产品价格\n📦 为店铺 / 餐厅找库存\n🍺 按预算推荐产品\n🎉 为活动推荐饮料\n\n你想做什么？"
              : language === 'english'
                ? "🤖 KIRA can help you:\n\n💰 Ask product prices\n📦 Find stock for a shop / restaurant\n🍺 Recommend products by budget\n🎉 Recommend drinks for an event\n\nWhat would you like to do?"
                : "🤖 Hai bosku, KIRA boleh bantu:\n\n💰 Tanya harga produk\n📦 Cari stok untuk kedai / restoran\n🍺 Cadang produk ikut bajet\n🎉 Cadang minuman untuk event\n\nApa bos mau buat?";
          await sendWAButtons(
            from,
            body,
            [
              { id: 'AI_TANYA_HARGA', title: language === 'chinese' ? '💰 查询价格' : language === 'english' ? '💰 Ask Price' : '💰 Tanya Harga' },
              { id: 'AI_BORONG_KEDAI', title: language === 'chinese' ? '📦 店铺采购' : language === 'english' ? '📦 Shop Stock' : '📦 Borong Kedai' },
              { id: 'AI_CADANGAN', title: language === 'chinese' ? '🍺 产品推荐' : language === 'english' ? '🍺 Recommend' : '🍺 Cadangan Produk' }
            ]
          );
        } else if (buttonPayload === 'AI_TANYA_HARGA') {
          const language = await getUserLanguage(from);
          await sendWAText(
            from,
            language === 'chinese'
              ? "💰 你想查询什么产品的价格？\n\n例子：\n• 最便宜的啤酒\n• Heineken 价格\n• RM200 以下的威士忌\n\n请输入产品名称或预算，KIRA 会帮你找合适的。"
              : language === 'english'
                ? "💰 Which product price would you like to check?\n\nExamples:\n• Cheapest beer\n• Heineken price\n• Whisky under RM200\n\nType the product name or your budget, and KIRA will find the right match."
                : "💰 Nak check harga produk apa bosku?\n\nContoh:\n• Beer paling murah\n• Harga Heineken\n• Whisky bawah RM200\n\nTaip nama produk atau bajet bos, KIRA carikan yang ngam 😊"
          );
        } else if (buttonPayload === 'AI_BORONG_KEDAI') {
          const language = await getUserLanguage(from);
          await sendWAText(
            from,
            language === 'chinese'
              ? "📦 你是要为店铺、餐厅还是活动找库存？\n\n请告诉 KIRA：\n• 生意类型\n• 大概预算\n• 顾客常找的产品\n\n例子：\n“我要为店铺补啤酒库存，预算 RM1000”"
              : language === 'english'
                ? "📦 Are you looking for stock for a shop, restaurant, or event?\n\nTell KIRA:\n• Business type\n• Estimated budget\n• Products customers usually ask for\n\nExample:\n\"I need beer stock for my shop, budget RM1000\""
                : "📦 Bos cari stok untuk kedai, restoran atau event?\n\nBeritahu KIRA:\n• Jenis bisnes\n• Anggaran bajet\n• Produk yang biasa customer cari\n\nContoh:\n\"Saya mau stok beer untuk kedai, bajet RM1000\""
          );
        } else if (buttonPayload === 'AI_CADANGAN') {
          const language = await getUserLanguage(from);
          await sendWAButtons(from, language === 'chinese' ? "🍺 KIRA 可以根据你的情况推荐产品。\n\n请选择：" : language === 'english' ? "🍺 KIRA can recommend products based on your situation.\n\nChoose one:" : "🍺 KIRA boleh cadangkan produk ikut situasi bosku.\n\nPilih satu:", [
            { id: 'AI_POPULAR', title: language === 'chinese' ? '🔥 热门产品' : language === 'english' ? '🔥 Popular' : '🔥 Produk Popular' },
            { id: 'AI_BUDGET', title: language === 'chinese' ? '💸 预算推荐' : language === 'english' ? '💸 Budget Picks' : '💸 Bajet Murah' },
            { id: 'AI_EVENT', title: language === 'chinese' ? '🎉 活动用途' : language === 'english' ? '🎉 For Event' : '🎉 Untuk Event' }
          ]);
        } else if (buttonPayload === 'AI_POPULAR') {
          const language = await getUserLanguage(from);
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price, category, stock_quantity, stock_status, is_featured, image_url')
            .eq('stock_status', 'in_stock')
            .gt('stock_quantity', 0)
            .order('is_featured', { ascending: false })
            .order('stock_quantity', { ascending: false })
            .limit(6);
          await sendRecommendedProducts(
            from,
            language === 'chinese'
              ? "这些是目前有库存的热门产品，可以直接加入购物车。"
              : language === 'english'
                ? "Here are popular in-stock products you can add to cart right away."
                : "Ini produk popular yang ada stok sekarang bosku. Tekan produk untuk Add to Cart terus!",
            products || [],
            language === 'chinese'
              ? "抱歉，目前没有可推荐的库存产品。"
              : language === 'english'
                ? "Sorry, there are no in-stock products to recommend right now."
                : "Maaf bosku, belum ada produk in-stock untuk dicadangkan sekarang."
          );
        } else if (false && buttonPayload === 'AI_POPULAR') {
          const language = await getUserLanguage(from);
          await handleAIChat(
            from,
            language === 'chinese'
              ? "为新客户推荐热门产品。回答要简短、友好，并以销售为导向。"
              : language === 'english'
                ? "Recommend popular products for a new customer. Keep it brief, friendly, and sales-focused."
                : "Cadangkan produk popular untuk customer baru.\nJawab ringkas, friendly dan sales-focused."
          );
        } else if (buttonPayload === 'AI_BUDGET') {
          const language = await getUserLanguage(from);
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price, category, stock_quantity, stock_status, is_featured, image_url')
            .eq('stock_status', 'in_stock')
            .gt('stock_quantity', 0)
            .order('price', { ascending: true })
            .limit(6);
          await sendRecommendedProducts(
            from,
            language === 'chinese'
              ? "这些是目前比较预算友好的现货产品，可以直接加入购物车。"
              : language === 'english'
                ? "These are the best budget-friendly in-stock picks you can add to cart."
                : "Ini pilihan bajet murah yang ada stok sekarang bosku. Tekan produk untuk Add to Cart terus!",
            products || [],
            language === 'chinese'
              ? "抱歉，目前没有预算友好的库存产品。"
              : language === 'english'
                ? "Sorry, there are no budget-friendly in-stock products right now."
                : "Maaf bosku, belum ada produk bajet yang in-stock sekarang."
          );
        } else if (false && buttonPayload === 'AI_BUDGET') {
          const language = await getUserLanguage(from);
          await handleAIChat(
            from,
            language === 'chinese'
              ? "推荐最划算或预算友好的产品。如果还不知道客户预算，请先询问预算。"
              : language === 'english'
                ? "Recommend the best value or budget-friendly products. Ask for the customer's budget if it is not known yet."
                : "Cadangkan produk paling berbaloi atau bajet murah.\nTanya bajet customer jika belum diketahui."
          );
        } else if (buttonPayload === 'AI_EVENT') {
          const language = await getUserLanguage(from);
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price, category, stock_quantity, stock_status, is_featured, image_url')
            .eq('stock_status', 'in_stock')
            .gt('stock_quantity', 0)
            .order('category')
            .order('price', { ascending: true })
            .limit(9);
          await sendRecommendedProducts(
            from,
            language === 'chinese'
              ? "这些现货产品适合活动或聚会，可以先加入购物车。"
              : language === 'english'
                ? "These in-stock picks are suitable for events and parties. Add what you like to cart."
                : "Ini pilihan yang ngam untuk event atau party dan ada stok sekarang bosku. Tekan produk untuk Add to Cart!",
            products || [],
            language === 'chinese'
              ? "抱歉，目前没有适合活动推荐的库存产品。"
              : language === 'english'
                ? "Sorry, there are no in-stock event picks right now."
                : "Maaf bosku, belum ada produk event yang in-stock sekarang."
          );
        } else if (false && buttonPayload === 'AI_EVENT') {
          const language = await getUserLanguage(from);
          await handleAIChat(
            from,
            language === 'chinese'
              ? "帮助客户为活动选择饮料。如果资料不足，请询问人数、预算和活动类型。"
              : language === 'english'
                ? "Help the customer choose drinks for an event. Ask for the number of people, budget, and event type if there is not enough information."
                : "Bantu customer pilih minuman untuk event.\nTanya jumlah orang, bajet dan jenis event jika maklumat belum cukup."
          );
        } else if (buttonPayload === 'QUALIFY_RETAIL') {
          const language = await getUserLanguage(from);
          await sendWAText(
            from,
            language === 'chinese'
              ? "🏪 针对店铺，KIRA 可以推荐比较容易销售的库存。\n\n请告诉我：\n• 大概预算\n• 啤酒 / 葡萄酒 / 威士忌 / 混合\n• 顾客平时常找什么\n\n例子：\n“我要为店铺补啤酒库存，预算 RM1000”"
              : language === 'english'
                ? "🏪 For a shop, KIRA can recommend stock that is easier to sell.\n\nTell me:\n• Estimated budget\n• Beer / wine / whisky / mixed products\n• What your customers usually ask for\n\nExample:\n\"I need beer stock for my shop, budget RM1000\""
                : "🏪 Untuk kedai, KIRA boleh bantu cadangkan stok yang senang jalan.\n\nBoleh bagitahu:\n• Bajet anggaran\n• Beer / wine / whisky / campuran\n• Customer biasa cari apa\n\nContoh:\n\"Saya mau stok beer untuk kedai, bajet RM1000\""
          );
        } else if (buttonPayload === 'QUALIFY_RESTAURANT') {
          const language = await getUserLanguage(from);
          await sendWAText(
            from,
            language === 'chinese'
              ? "🍽️ 针对餐厅 / 酒吧，KIRA 可以根据菜单和顾客风格推荐饮料。\n\n请告诉我：\n• 餐厅 / 酒吧类型\n• 大概预算\n• 想要啤酒、葡萄酒、威士忌还是混合\n\n例子：\n“我要为餐厅采购葡萄酒和啤酒，预算 RM2000”"
              : language === 'english'
                ? "🍽️ For a restaurant / bar, KIRA can recommend drinks based on your menu and customer style.\n\nTell me:\n• Type of restaurant / bar\n• Estimated budget\n• Beer, wine, whisky, or mixed products\n\nExample:\n\"I need wine and beer for my restaurant, budget RM2000\""
                : "🍽️ Untuk restoran / bar, KIRA boleh cadangkan minuman ikut menu dan customer style.\n\nBoleh bagitahu:\n• Jenis restoran / bar\n• Bajet anggaran\n• Mau beer, wine, whisky atau campuran\n\nContoh:\n\"Saya mau wine dan beer untuk restoran, bajet RM2000\""
          );
        } else if (buttonPayload === 'QUALIFY_EVENT') {
          const language = await getUserLanguage(from);
          await sendWAText(
            from,
            language === 'chinese'
              ? "🎉 针对活动，KIRA 可以按人数和预算推荐饮料。\n\n请告诉我：\n• 多少人\n• 活动类型\n• 大概预算\n• 想要啤酒、葡萄酒、威士忌还是混合\n\n例子：\n“活动 50 人，预算 RM800”"
              : language === 'english'
                ? "🎉 For an event, KIRA can recommend drinks based on the number of people and budget.\n\nTell me:\n• Number of people\n• Event type\n• Estimated budget\n• Beer, wine, whisky, or mixed products\n\nExample:\n\"Event for 50 people, budget RM800\""
                : "🎉 Untuk event, KIRA boleh bantu kira cadangan minuman ikut jumlah orang dan bajet.\n\nBoleh bagitahu:\n• Berapa orang\n• Jenis event\n• Bajet anggaran\n• Mau beer, wine, whisky atau campuran\n\nContoh:\n\"Event 50 orang, bajet RM800\""
          );
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
            
            await supabase.from('wa_messages').insert({ phone: from, role: 'system', content: systemNote });
            
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
        } else if (buttonPayload === 'btn_talk_sales') {
          await handleHumanHandoff(from, 'Customer tapped sales handoff button');
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
            const {
              appointment_name,
              appointment_phone,
              appointment_email,
              appointment_date,
              appointment_time,
              appointment_purpose,
              appointment_notes,
            } = responseJson;

            if (appointment_date || appointment_time || appointment_name) {
              await supabase.from('inquiries').insert({
                message: `APPOINTMENT VIA WA FLOW — Nama: ${appointment_name || '-'} | Phone: ${appointment_phone || from} | Email: ${appointment_email || '-'} | Tarikh: ${appointment_date || '-'} | Masa: ${appointment_time || '-'} | Tujuan: ${appointment_purpose || '-'} | Nota: ${appointment_notes || '-'}`,
                channel: 'whatsapp_appointment_flow',
                phone: from,
                status: 'new',
                created_at: new Date().toISOString(),
              });

              await notifyTelegram(
                `📅 <b>APPOINTMENT BARU via WhatsApp Flow</b>\n\n` +
                `📱 WhatsApp: +${from}\n` +
                `👤 Nama: ${appointment_name || '-'}\n` +
                `☎️ Phone: ${appointment_phone || from}\n` +
                `✉️ Email: ${appointment_email || '-'}\n` +
                `📅 Tarikh: ${appointment_date || '-'}\n` +
                `🕒 Masa: ${appointment_time || '-'}\n` +
                `🎯 Tujuan: ${appointment_purpose || '-'}\n` +
                `📝 Nota: ${appointment_notes || '-'}\n\n` +
                `<i>Sila confirm slot appointment dengan customer.</i>`
              );

              await sendWAText(
                from,
                `✅ Appointment request received${appointment_name ? `, ${appointment_name}` : ''}.\n\n` +
                `📅 Date: ${appointment_date || '-'}\n` +
                `🕒 Time: ${appointment_time || '-'}\n\n` +
                `Golden Isle team will confirm your slot shortly.`
              );

              return new NextResponse('EVENT_RECEIVED', { status: 200 });
            }

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
      // Handle Image Messages (Vision AI)
      if (message && message.type === 'image') {
        const from = message.from;
        const imageId = message.image?.id;

        console.log(`\n📸 IMAGE WA: [${from}] media=${imageId || 'missing'}`);

        if (!imageId) {
          await sendWAText(from, 'Maaf bosku, gambar tu tak jelas. Cuba hantar sekali lagi ya.');
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const media = await downloadWAMedia(imageId);
        if (!media) {
          await sendWAText(from, 'Aduh, saya tak dapat buka gambar ni bos. Boleh hantar balik?');
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const base64Image = media.buffer.toString('base64');
        const mimeType = media.mimeType || 'image/jpeg';
        
        await sendWAText(from, 'KIRA tengah teliti gambar ni kejap ya bosku... 🔍👀');

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          await sendWAText(from, 'Maaf bos, mata AI KIRA belum pasang (API Key tiada).');
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const visionPrompt = `You are KIRA, a specialized AI assistant for Golden Isle Wholesale (liquor/beverage). 
Analyze the image provided and return ONLY a valid JSON object.

If the image is a supplier invoice or purchase receipt:
{
  "type": "invoice",
  "data": {
    "supplier": "supplier company name (string or null)",
    "invoiceDate": "date in YYYY-MM-DD format (string or null)",  
    "items": [
      {
        "name": "product name",
        "quantity": number,
        "unitPrice": number (in RM),
        "total": number
      }
    ],
    "invoiceTotal": number (total amount in RM)
  }
}

If the image is NOT an invoice (e.g. a bottle, a drink, a person, a screenshot, etc.):
{
  "type": "other",
  "description": "Provide a very detailed description of the image in English. If it is an alcohol bottle, identify the brand, type (whisky, beer, wine, etc.), age, and any details visible."
}

Rules:
- For invoices, extract ALL line items visible and convert foreign currencies to RM.
- Return ONLY valid JSON, no explanation text or markdown wrappers.`;

        try {
          const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: "high" } },
                    { type: "text", text: visionPrompt },
                  ],
                },
              ],
            }),
          });

          const visionData = await visionRes.json();
          const rawContent = visionData.choices?.[0]?.message?.content || "";
          
          let extractedVision: any;
          try {
            const cleaned = rawContent.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
            extractedVision = JSON.parse(cleaned);
          } catch (e) {
            await sendWAText(from, 'Hmm... gambar ni macam kurang jelas atau KIRA tak dapat baca tulisan dia. Boleh ambil gambar yang lebih terang sikit bos? 🧐');
            return new NextResponse('EVENT_RECEIVED', { status: 200 });
          }

          if (extractedVision.type === "other" || !extractedVision.data) {
            const desc = extractedVision.description || "Sebuah gambar yang tidak jelas.";
            const aiPrompt = `[Customer sent an image. Vision AI Description: "${desc}"] Reply naturally as KIRA based on this image. If it's an alcohol bottle, show your expertise and ask if they want to check stock or buy it!`;
            await handleAIChat(from, aiPrompt, { sendText: true });
            return new NextResponse('EVENT_RECEIVED', { status: 200 });
          }

          const extractedInvoice = extractedVision.data;
          const items: InvoiceItem[] = (extractedInvoice.items || []).map((item: any) => ({
            name: item.name || "Unknown Product",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
            supplier: extractedInvoice.supplier,
          }));

          const catalogMatch = await matchInvoiceToCatalog(items);
          
          if (catalogMatch.matches.length === 0) {
            await sendWAText(from, 'KIRA dah scan resit ni, tapi nampaknya produk ni KIRA belum ada stok lagi bosku. Ada cari barang lain?');
          } else {
            const savings = catalogMatch.totalSavings;
            if (savings > 0) {
              const reply = `Wah bosku! Kalau ambil barang-barang ni dari Golden Isle, bos boleh **jimat RM${savings.toFixed(2)}** tau! 💸🔥\n\nHarga resit bos: RM${catalogMatch.totalInvoiceSpend.toFixed(2)}\nHarga Golden Isle: RM${catalogMatch.totalGoldenIsleSpend.toFixed(2)}\n\nNak KIRA masukkan dalam troli terus tak barang-barang ni?`;
              await sendWAText(from, reply);
            } else {
              const reply = `KIRA dah scan resit ni bosku. Harga lebih kurang sama je dengan harga borong KIRA. Boleh lah kalau bos nak tambah sikit stok dari Golden Isle! 🛒`;
              await sendWAText(from, reply);
            }
          }
        } catch (err) {
          console.error("Vision API error:", err);
          await sendWAText(from, "Aduh, sistem mata KIRA tengah pening sikit. Cuba lagi nanti ya bosku.");
        }
        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      // Handle audio / voice messages through KIRA, then reply with voice when possible.
      if (message && message.type === 'audio') {
        const from = message.from;
        const audioId = message.audio?.id;

        console.log(`\nVOICE NOTE WA: [${from}] media=${audioId || 'missing'}`);

        if (messageId) {
          await sendWATypingIndicator(from, messageId);
        }

        if (!audioId) {
          console.error('WA audio message missing media id:', JSON.stringify(message.audio || {}));
          await sendWAText(from, 'Maaf bosku, voice note tu belum dapat saya baca. Cuba hantar sekali lagi ya.');
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const media = await downloadWAMedia(audioId);
        if (!media) {
          console.error('Failed to download WA audio media:', audioId);
          await sendWAText(from, 'Maaf bosku, voice note tu belum dapat saya download. Boleh taip mesej atau hantar semula?');
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const transcript = await transcribeOpenAIAudio(media.buffer, media.mimeType);
        if (!transcript) {
          console.error('Failed to transcribe WA audio media:', audioId);
          await sendWAText(from, 'Maaf bosku, saya belum dapat tangkap voice note tu. Boleh taip mesej atau hantar semula?');
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const requestedLanguage = detectRequestedLanguage(transcript);
        if (requestedLanguage) {
          await handleLanguageSwitch(from, requestedLanguage);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const language = await rememberUserLanguage(from, transcript);
        console.log(`VOICE NOTE TRANSCRIPT WA: [${from}] "${transcript}"`);

        if (isCheckoutIntent(transcript)) {
          const summary =
            language === 'english'
              ? 'Okay boss. I will open the order flow so you can choose and proceed.'
              : language === 'chinese'
                ? 'Okay boss. I will open the order flow for you now.'
                : 'Okay boss. Saya buka order flow supaya bos boleh pilih dan proceed.';
          await sendHighImpactVoiceReply(from, summary, 'voice_input_summary');
          await handleOrder(from);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        if (isHumanHandoffIntent(transcript)) {
          const summary =
            language === 'english'
              ? 'Okay boss. I will get the Golden Isle sales team to follow up with you.'
              : language === 'chinese'
                ? 'Okay boss. Golden Isle sales team will follow up with you shortly.'
                : 'Okay boss. Saya roger team Golden Isle untuk follow up bos.';
          await sendHighImpactVoiceReply(from, summary, 'voice_input_summary');
          await handleHumanHandoff(from, `Voice transcript: ${transcript.slice(0, 160)}`);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        if (isLocationIntent(transcript)) {
          const summary =
            language === 'english'
              ? 'Sure boss, I sent the Golden Isle location in the chat.'
              : language === 'chinese'
                ? '可以 boss，我已经把 Golden Isle 的位置发到聊天里。'
                : 'Boleh boss, KIRA sudah hantar location Golden Isle dalam chat.';
          await sendHighImpactVoiceReply(from, summary, 'voice_input_summary');
          await handleStoreLocation(from);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        if (isAppointmentIntent(transcript)) {
          const summary =
            language === 'english'
              ? 'Good idea boss. I sent an appointment option in the chat so the team can help you plan properly.'
              : language === 'chinese'
                ? '好主意 boss。我已经在聊天里发了预约选项，方便团队跟进。'
                : 'Bagus boss. KIRA sudah hantar option appointment dalam chat supaya team boleh bantu plan elok-elok.';
          await sendHighImpactVoiceReply(from, summary, 'voice_input_summary');
          await handleAppointmentSuggestion(from);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        const recommendedProductCollector: RecommendedProductCollector = { products: [] };
        const aiReply = await handleAIChat(from, transcript, {
          sendText: false,
          sendProductImages: false,
          recommendedProductCollector,
        });
        if (!aiReply) {
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // Reply with voice always for voice note input - use AI reply directly
        const voiceReplyText = aiReply.length > 10 ? aiReply : buildVoiceInputSummary(transcript, aiReply, language);
        const voiceSent = await sendAIVoiceReply(from, voiceReplyText);
        console.log(`[VOICE REPLY] sent=${voiceSent} text="${voiceReplyText.slice(0, 80)}..."`);

        return new NextResponse('EVENT_RECEIVED', { status: 200 });
      }

      // Handle text messages — SIMPLIFIED ROUTER (Enterprise v2)
      // Principle: ONE BRAIN (KIRA AI), not two competing routers.
      // Only 4 safety-critical checks before AI. Everything else → KIRA decides.

      if (message && message.type === 'text') {
        const from = message.from;
        const msgText = message.text?.body?.trim() || '';

        // ── Safety Check 1: Language Switch (must be before AI) ──
        const requestedLanguage = detectRequestedLanguage(msgText);
        if (requestedLanguage) {
          await handleLanguageSwitch(from, requestedLanguage);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        await rememberUserLanguage(from, msgText);
        console.log(`\n📩 MESEJ WA: [${from}] "${msgText}"`);

        // ── Safety Check 2: Human Handoff (must always work, even if AI is down) ──
        if (isHumanHandoffIntent(msgText)) {
          // Stop payment chasers when customer asks for human
          try {
            await supabase.from('orders')
              .update({ chaser_opted_out: true })
              .eq('customer_phone', from)
              .in('payment_status', ['pending_payment', 'unpaid', 'pending'])
              .eq('chaser_opted_out', false);
          } catch (err) {
            console.error('Error auto-stopping chaser:', err);
          }
          await handleHumanHandoff(from, `Customer text: ${msgText.slice(0, 160)}`);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // ── Safety Check 3: Suggestion Mode Intercept (stateful, must intercept) ──
        const { data: customerData } = await supabase.from('customers').select('is_awaiting_suggestion').eq('phone', from).single();
        if (customerData?.is_awaiting_suggestion) {
          await handleSuggestion(from, msgText);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // ── Safety Check 4: Short Greeting (< 4 words — no AI needed) ──
        const intent = detectIntent(msgText);
        if (intent === 'greet') {
          // Session tracking for repeat greeting
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

          if (isNewSession) {
            const handled = await handleRepeatGreeting(from);
            if (handled) return new NextResponse('EVENT_RECEIVED', { status: 200 });
          }
          await handleGreeting(from);
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // ── Chaser opt-out (background action, doesn't block AI) ──
        if (isChaserOptOutIntent(msgText)) {
          try {
            await supabase.from('orders')
              .update({ chaser_opted_out: true })
              .eq('customer_phone', from)
              .in('payment_status', ['pending_payment', 'unpaid', 'pending'])
              .eq('chaser_opted_out', false);
          } catch (err) {
            console.error('Error auto-stopping chaser:', err);
          }
        }

        // ── Session tracking for non-greet messages ──
        try {
          await supabase.from('customers').upsert({
            phone: from,
            last_session_at: new Date().toISOString()
          }, { onConflict: 'phone' });
        } catch (err) {
          console.error('Error tracking session:', err);
        }

        // ── EVERYTHING ELSE → KIRA AI (Single Brain) ──
        // KIRA will decide: recommend products, show catalog, check receipt,
        // send location, book appointment, or just chat.
        console.log(`🧠 Routed to KIRA AI (bypassed keyword router)`);
        
        if (messageId) {
          await sendWATypingIndicator(from, messageId);
        }
        
        await handleAIChat(from, msgText);
      }

      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not a WhatsApp event', { status: 404 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
