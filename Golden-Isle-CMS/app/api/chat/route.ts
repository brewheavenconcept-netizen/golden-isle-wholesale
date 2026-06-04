import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildContextBlock } from "@/lib/contextBuilder";
import { generateInvoicePdf } from "@/lib/pdfGenerator";
// Note: Resend is imported dynamically below to avoid build errors when key is missing

async function saveLead(data: any) {
    console.log("Processing lead capture:", data);
    
    const googleWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    // Hitung kuantiti total, jumlah harga, dan kategori produk daripada cart (jika ada)
    let totalQty = 0;
    let totalAmount = 0;
    const categoriesSet = new Set<string>();

    if (data.cart && Array.isArray(data.cart)) {
        data.cart.forEach((item: any) => {
            const qty = Number(item.quantity) || 0;
            totalQty += qty;
            
            const priceNum = item.priceNum || parseFloat((item.price || "0").replace(/[^0-9.]/g, ""));
            if (!isNaN(priceNum)) {
                totalAmount += priceNum * qty;
            }
            
            if (item.category) {
                categoriesSet.add(item.category);
            }
        });
    }

    // Sediakan nilai muktamad (fallback kepada pengiraan cart jika data asal kosong)
    const finalQuantity = data.quantity || (totalQty > 0 ? totalQty : "");
    const finalBudget = data.budget || (totalAmount > 0 ? `RM ${totalAmount.toFixed(2)}` : "");
    const categoriesArray = Array.from(categoriesSet);
    const finalPreference = data.preference || (categoriesArray.length > 0 ? categoriesArray.join(", ") : "");

    // Gabungkan dalam satu payload dengan semua variasi nama kunci (keys) untuk Google Sheets
    const payload = {
        ...data,
        quantity: finalQuantity,
        kuantiti: finalQuantity,
        budget: finalBudget,
        bajet: finalBudget,
        preference: finalPreference,
        minat_produk: finalPreference,
        minatProduk: finalPreference
    };

    // Sediakan janji-janji (promises) untuk diproses serentak
    const tasks = [];

    // 1. Tembak Google Sheets Webhook
    if (googleWebhookUrl) {
        tasks.push(
            fetch(googleWebhookUrl, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (res.ok) console.log("✅ Lead successfully sent to Google Sheets!");
                else console.warn("⚠️ Google Sheets Webhook returned error status:", res.status);
            })
            .catch(err => console.error("❌ Failed to send lead to Google Sheets:", err))
        );
    } else {
        console.log("ℹ️ GOOGLE_SHEET_WEBHOOK_URL not configured — skipping Google Sheets update.");
    }

    // Bina pautan PDF invois dan WhatsApp (untuk order_created)
    // Fix: guna parentheses untuk elak operator precedence bug (|| vs ternary)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const invoiceUrl = `${appUrl}/api/invoice/${payload.orderId}`;
    
    // Pautan WhatsApp ringkas untuk admin Telegram (elak URL panjang yang break Markdown parser)
    const customerPhone = payload.phone ? payload.phone.replace(/[^0-9]/g, "") : "";
    // Nota: guna link ringkas wa.me sahaja — URL pre-filled yang panjang boleh break Telegram Markdown
    const whatsappLink = customerPhone ? `https://wa.me/${customerPhone}` : null;

    // 2. Tembak Telegram Bot API untuk alert instant
    if (telegramBotToken && telegramChatId) {
        // Susun format mesej Telegram yang cantik
        let messageText = "";
        if (payload.action === "order_created") {
            messageText = `🎉 *[GOLDEN ISLE - NEW ORDER SUCCESS!]* 💰\n\n`;
            messageText += `🆔 *Order ID:* \`${payload.orderId}\`\n`;
            messageText += `👤 *Customer:* \`${payload.name || "Anonymous"}\` (${payload.phone || "No Phone"})\n`;
            messageText += `🌐 *Language:* \`${payload.language?.toUpperCase() || "EN"}\`\n`;
            if (payload.quantity) messageText += `📦 *Total Quantity:* \`${payload.quantity} unit(s)\`\n`;
            messageText += `\n📄 *PDF Invoice:* ${invoiceUrl}\n`;
            if (whatsappLink) messageText += `💬 *Contact Customer:* [Click WhatsApp](${whatsappLink})\n`;
        } else {
            messageText = `🍻 *[GOLDEN ISLE - NEW LEAD]* 🚨\n\n`;
            messageText += `👤 *Status:* \`${payload.action === "whatsapp_click" ? "📞 WhatsApp Click" : "🛒 Added to Cart"}\`\n`;
            messageText += `🌐 *Language:* \`${payload.language?.toUpperCase() || "EN"}\`\n`;
            
            if (payload.budget) messageText += `💰 *Budget:* \`${payload.budget}\`\n`;
            if (payload.quantity) messageText += `📦 *Quantity:* \`${payload.quantity}\`\n`;
            if (payload.preference) messageText += `⭐ *Interest:* \`${payload.preference}\`\n`;
        }
        
        if (payload.cart && payload.cart.length > 0) {
            messageText += `\n*🛒 Cart Draft (Quotation):*\n`;
            payload.cart.forEach((item: any) => {
                messageText += `- ${item.quantity}x ${item.name} (${item.price || item.total})\n`;
            });
            
            messageText += `\n💵 *Draft Total:* *RM ${totalAmount.toFixed(2)}*\n`;
        }

        messageText += `\n⏰ *Time:* _${new Date(payload.timestamp || Date.now()).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}_`;

        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        
        tasks.push(
            fetch(telegramUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: messageText,
                    parse_mode: "Markdown"
                })
            })
            .then(res => {
                if (res.ok) console.log("✅ Lead notification sent to Telegram!");
                else console.warn("⚠️ Telegram API returned error status:", res.status);
            })
            .catch(err => console.error("❌ Failed to send Telegram alert:", err))
        );

        // 3. Tambahan: Jika order baru berjaya dibina, jana PDF Sebut Harga & hantar terus ke Telegram
        if (payload.action === "order_created") {
            tasks.push(
                generateInvoicePdf(payload)
                    .then(async (pdfBuffer) => {
                        const telegramDocUrl = `https://api.telegram.org/bot${telegramBotToken}/sendDocument`;
                        const formData = new FormData();
                        
                        // Buat file PDF dari buffer memory menggunakan class File
                        const file = new File([new Uint8Array(pdfBuffer)], `Quotation_${payload.orderId}.pdf`, { type: "application/pdf" });
                        formData.append("chat_id", telegramChatId);
                        formData.append("document", file);
                        formData.append("caption", `📄 Official PDF Quotation file for Order ID: ${payload.orderId}`);

                        const res = await fetch(telegramDocUrl, {
                            method: "POST",
                            body: formData
                        });

                        if (res.ok) {
                            console.log("✅ PDF Quotation successfully sent to Telegram!");
                        } else {
                            const errBody = await res.text();
                            console.warn("⚠️ Telegram sendDocument returned error status:", res.status, errBody);
                            const fs = require("fs");
                            const path = require("path");
                            const logPath = path.join(process.cwd(), "scripts", "debug_log.txt");
                            fs.appendFileSync(logPath, `[${new Date().toISOString()}] sendDocument Failed (Status ${res.status}): ${errBody}\n\n`);
                        }
                    })
                    .catch((err) => {
                        console.error("❌ Failed to generate or send PDF to Telegram:", err);
                        try {
                            const fs = require("fs");
                            const path = require("path");
                            const logPath = path.join(process.cwd(), "scripts", "debug_log.txt");
                            fs.appendFileSync(logPath, `[${new Date().toISOString()}] PDF Generation/Send Error: ${err.message}\n${err.stack}\n\n`);
                        } catch (e) {}
                    })
            );

            // 3b. Hantar email ke pelanggan via Resend (jika email & API key ada)
            const resendApiKey = process.env.RESEND_API_KEY;
            const customerEmail = payload.email || payload.customerEmail || null;

            if (resendApiKey && customerEmail) {
                // Bina baris jadual untuk item troli secara dinamik
                let cartRowsHtml = "";
                if (payload.cart && Array.isArray(payload.cart) && payload.cart.length > 0) {
                    cartRowsHtml = payload.cart.map((item: any) => {
                        const itemQty = item.quantity || 1;
                        const itemName = item.name || "Produk";
                        const itemCategory = item.category || "Beverage";
                        const priceVal = item.priceNum || parseFloat((item.price || "0").replace(/[^0-9.]/g, ""));
                        const totalVal = (priceVal * itemQty).toFixed(2);
                        
                        // Prioritize real image_url from frontend/DB if available, resolving relative paths
                        let productImgUrl = "";
                        if (item.image_url) {
                            if (item.image_url.startsWith("http")) {
                                productImgUrl = item.image_url;
                            } else {
                                const base = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
                                const path = item.image_url.startsWith("/") ? item.image_url : `/${item.image_url}`;
                                productImgUrl = `${base}${path}`;
                            }
                        }

                        // If URL resolves to localhost, it's unreachable by external email servers — clear it
                        if (productImgUrl.includes("localhost") || productImgUrl.includes("127.0.0.1")) {
                            productImgUrl = "";
                        }

                        // Fallback to category-based icons if no image_url resolved
                        if (!productImgUrl) {
                            productImgUrl = "https://img.icons8.com/fluency/96/beer.png";
                            const cat = itemCategory.toLowerCase();
                            const nameLower = itemName.toLowerCase();
                            if (cat.includes("whisky") || cat.includes("whiskey") || nameLower.includes("macallan") || nameLower.includes("blue label") || nameLower.includes("glenfiddich") || nameLower.includes("yamazaki")) {
                                productImgUrl = "https://img.icons8.com/fluency/96/whiskey-bottle.png";
                            } else if (cat.includes("wine") || nameLower.includes("penfolds") || nameLower.includes("lafite")) {
                                productImgUrl = "https://img.icons8.com/fluency/96/wine-bottle.png";
                            } else if (cat.includes("beer") || nameLower.includes("duvel") || nameLower.includes("brewdog")) {
                                productImgUrl = "https://img.icons8.com/fluency/96/beer-bottle.png";
                            }
                        }

                        return `
                            <tr>
                                <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;text-align:left;vertical-align:middle;">
                                    <table border="0" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="width:48px;padding-right:12px;vertical-align:middle;">
                                          <img src="${productImgUrl}" alt="" width="48" height="48" style="width:48px;height:48px;object-fit:contain;border-radius:8px;border:1px solid #E5E7EB;display:block;background-color:#F8FAFC;" />
                                        </td>
                                        <td style="vertical-align:middle;">
                                          <div style="font-size:16px;font-weight:600;color:#0F172A;line-height:1.3;font-family:'Inter',sans-serif;">${itemName}</div>
                                          <div style="font-size:13px;color:#64748B;margin-top:2px;font-family:'Inter',sans-serif;">${itemCategory}</div>
                                        </td>
                                      </tr>
                                    </table>
                                </td>
                                <td style="padding:16px 8px;border-bottom:1px solid #E5E7EB;font-size:15px;color:#64748B;text-align:center;vertical-align:middle;font-weight:500;font-family:'Inter',sans-serif;width:80px;">
                                    ${itemQty}
                                </td>
                                <td align="right" style="padding:16px 0;border-bottom:1px solid #E5E7EB;font-size:15px;font-weight:700;color:#0F172A;vertical-align:middle;font-family:'Inter',sans-serif;width:110px;">
                                    RM${totalVal}
                                </td>
                            </tr>
                        `;
                    }).join("");
                }

                const orderDateStr = new Date(payload.timestamp || Date.now()).toLocaleDateString("en-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                    dateStyle: "medium"
                });

                const taxRate = 0.08;
                const taxAmount = totalAmount * taxRate;
                const grandTotal = totalAmount + taxAmount;

                const dueDateStr = new Date((payload.timestamp ? new Date(payload.timestamp) : new Date()).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                    dateStyle: "medium"
                });

                const confirmationUrl = `${appUrl}/order-confirmation?orderId=${payload.orderId}`;
                const adminWhatsapp = "601164073143";
                const waSupportLink = `https://wa.me/${adminWhatsapp}?text=Salam%20Golden%20Isle%20Wholesale%2C%20saya%20ingin%20rujuk%20Order%20ID%3A%20${payload.orderId}`;

                tasks.push(
                    generateInvoicePdf(payload)
                        .then(async (pdfBuffer) => {
                            const emailRes = await fetch("https://api.resend.com/emails", {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${resendApiKey}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    from: process.env.RESEND_FROM_EMAIL || "Golden Isle Wholesale <onboarding@resend.dev>",
                                    to: [customerEmail],
                                    subject: `[Golden Isle] Official Quotation #${payload.orderId}`,
                                    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>[Golden Isle] Official Quotation #${payload.orderId}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body {
    margin: 0;
    padding: 0;
    background-color: #F8FAFC;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  @media only screen and (max-width: 680px) {
    .container {
      width: 100% !important;
      border-radius: 0px !important;
      border: none !important;
    }
    .container-td {
      padding: 16px !important;
    }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;padding:48px 16px;">
<tr><td align="center">
<table border="0" cellpadding="0" cellspacing="0" width="640" class="container" style="max-width:640px;width:100%;background-color:#FFFFFF;border-radius:24px;border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.03);overflow:hidden;border-collapse:separate;">
<tr><td class="container-td" style="padding:32px;">

<!-- HEADER -->
<table border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="vertical-align:middle;padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
      <div style="font-size:12px;font-weight:800;color:#0F172A;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;font-family:'Inter',sans-serif;">GOLDEN ISLE WHOLESALE</div>
      <div style="font-size:13px;font-weight:500;color:#64748B;margin-top:4px;font-family:'Inter',sans-serif;">Quotation #${payload.orderId}</div>
    </td>
  </tr>
</table>
<div style="height:24px;line-height:24px;font-size:24px;">&nbsp;</div>

<!-- HERO AMOUNT CARD -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:20px;border-collapse:separate;">
  <tr>
    <td style="padding:32px;text-align:center;vertical-align:middle;">
      <div style="font-size:14px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;font-family:'Inter',sans-serif;">Amount Due</div>
      <div style="font-size:48px;font-weight:800;color:#0F172A;letter-spacing:-0.03em;line-height:1.0;margin-bottom:12px;font-family:'Inter',sans-serif;">RM ${grandTotal.toFixed(2)}</div>
      
      <!-- Payment Methods -->
      <div style="font-size:12px;color:#64748B;font-family:'Inter',sans-serif;margin-bottom:16px;font-weight:500;">
        ✓ FPX &nbsp;&bull;&nbsp; ✓ DuitNow &nbsp;&bull;&nbsp; ✓ Credit Card
      </div>
      
      <!-- Status Timeline -->
      <div style="display:inline-block;padding-top:16px;border-top:1px solid #E5E7EB;width:100%;max-width:440px;font-size:11px;font-family:'Inter',sans-serif;color:#64748B;">
        <span style="color:#059669;font-weight:700;">✓ Generated</span> &nbsp;&bull;&nbsp; 
        <span style="color:#D97706;font-weight:700;">● Awaiting Payment</span> &nbsp;&bull;&nbsp; 
        <span>○ Processing</span> &nbsp;&bull;&nbsp; 
        <span>○ Delivered</span>
      </div>
    </td>
  </tr>
</table>

<!-- GREETING SECTION -->
<div style="margin-top:32px;font-size:15px;color:#0F172A;line-height:1.6;font-family:'Inter',sans-serif;margin-bottom:24px;">
  Hi ${payload.name ? payload.name.split(" ")[0] : "Customer"},<br/><br/>
  Your quotation is ready.
</div>

<!-- DOCUMENT METADATA INFO -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;border-collapse:separate;">
  <tr>
    <td style="padding:0 20px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <!-- Customer Row -->
        <tr>
          <td width="35%" style="width:35%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:13px;font-weight:500;color:#64748B;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:0.05em;">Customer</td>
          <td width="65%" style="width:65%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:14px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;text-align:right;">${payload.name || "Customer"}</td>
        </tr>
        <!-- Issued Row -->
        <tr>
          <td width="35%" style="width:35%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:13px;font-weight:500;color:#64748B;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:0.05em;">Issued</td>
          <td width="65%" style="width:65%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:14px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;text-align:right;">${orderDateStr}</td>
        </tr>
        <!-- Due Date Row -->
        <tr>
          <td width="35%" style="width:35%;height:44px;vertical-align:middle;font-size:13px;font-weight:500;color:#64748B;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:0.05em;">Payment Due</td>
          <td width="65%" style="width:65%;height:44px;vertical-align:middle;font-size:14px;font-weight:600;color:#EF4444;font-family:'Inter',sans-serif;text-align:right;">${dueDateStr}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ORDER SUMMARY -->
<div style="margin-top:32px;font-size:16px;font-weight:700;color:#0F172A;margin-bottom:12px;font-family:'Inter',sans-serif;">Order Summary</div>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;border-collapse:separate;">
  <tr>
    <td style="padding:24px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1.5px solid #E5E7EB;">
            <th style="padding:0 0 10px 0;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-family:'Inter',sans-serif;">Product</th>
            <th style="padding:0 8px 10px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;width:80px;font-family:'Inter',sans-serif;">Qty</th>
            <th style="padding:0 0 10px 0;text-align:right;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;width:110px;font-family:'Inter',sans-serif;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${cartRowsHtml}
          
          <!-- Pricing Summary Inline -->
          <tr>
            <td colspan="2" style="padding:16px 0 8px 0;text-align:right;font-size:13px;color:#64748B;font-family:'Inter',sans-serif;">Subtotal</td>
            <td style="padding:16px 0 8px 0;text-align:right;font-size:13px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;">RM ${totalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:4px 0 12px 0;text-align:right;font-size:13px;color:#64748B;font-family:'Inter',sans-serif;">SST (8%)</td>
            <td style="padding:4px 0 12px 0;text-align:right;font-size:13px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;">RM ${taxAmount.toFixed(2)}</td>
          </tr>
          <tr style="border-top:1.5px solid #E5E7EB;">
            <td colspan="2" style="padding:16px 0 0 0;text-align:right;font-size:14px;font-weight:700;color:#0F172A;font-family:'Inter',sans-serif;">Total Due</td>
            <td style="padding:16px 0 0 0;text-align:right;font-size:16px;font-weight:800;color:#2563EB;font-family:'Inter',sans-serif;">RM ${grandTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
</table>

<!-- ACTIONS -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px;">
  <tr>
    <td align="center" style="height:50px;background-color:#2563EB;border-radius:8px;vertical-align:middle;">
      <a href="${confirmationUrl}" target="_blank" style="display:block;width:100%;height:50px;line-height:50px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;text-align:center;font-family:'Inter',sans-serif;box-sizing:border-box;">Pay Invoice</a>
    </td>
  </tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">
  <tr>
    <td align="center" style="height:50px;background-color:#FFFFFF;border:1px solid #D1D5DB;border-radius:8px;vertical-align:middle;">
      <a href="${invoiceUrl}" target="_blank" style="display:block;width:100%;height:48px;line-height:48px;color:#374151;font-size:14px;font-weight:600;text-decoration:none;text-align:center;font-family:'Inter',sans-serif;box-sizing:border-box;">Download PDF</a>
    </td>
  </tr>
</table>

<!-- HELP CARD -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:16px;border-collapse:separate;">
  <tr>
    <td style="padding:20px;vertical-align:middle;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="vertical-align:middle;font-family:'Inter',sans-serif;">
            <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:2px;">Need help with your quotation?</div>
            <div style="font-size:12px;color:#64748B;line-height:1.4;">Contact our customer support if you need any assistance.</div>
          </td>
          <td align="right" style="vertical-align:middle;padding-left:16px;width:150px;white-space:nowrap;">
            <a href="${waSupportLink}" target="_blank" style="display:inline-block;background-color:#25D366;border:1px solid #1ead57;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:600;color:#FFFFFF;text-decoration:none;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.08);font-family:'Inter',sans-serif;vertical-align:middle;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="16" height="16" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;display:inline-block;border:none;filter:brightness(0) invert(1);" alt="WhatsApp" />WhatsApp Support
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- FOOTER -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:40px;text-align:center;">
  <tr>
    <td style="text-align:center;font-family:'Inter',sans-serif;">
      <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:4px;">Golden Isle Wholesale</div>
      <div style="font-size:13px;color:#64748B;margin-bottom:12px;">Labuan FT, Malaysia &bull; <a href="mailto:${customerEmail}" style="color:#2563EB;text-decoration:none;font-weight:500;">Contact Us</a></div>
      <div style="font-size:11px;color:#94A3B8;line-height:1.5;max-width:440px;margin:0 auto;">This email is generated automatically. Please ignore if you did not request any quotes or orders from us.</div>
    </td>
  </tr>
</table>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
                                    attachments: [{
                                        filename: `Quotation_${payload.orderId}.pdf`,
                                        content: Buffer.from(pdfBuffer).toString("base64")
                                    }]
                                })
                            });
                            if (emailRes.ok) console.log(`✅ Invoice email sent to ${customerEmail}!`);
                            else console.warn("⚠️ Resend email error:", await emailRes.text());
                        })
                        .catch(err => console.error("❌ Email send failed:", err))
                );
            } else if (resendApiKey && !customerEmail) {
                console.log("ℹ️ No customer email found — skipping Resend email.");
            } else {
                console.log("ℹ️ RESEND_API_KEY not configured — skipping email notification.");
            }
        }
    } else {
        console.log("ℹ️ TELEGRAM_BOT_TOKEN / CHAT_ID not configured — skipping Telegram notification.");
    }

    // Jalankan semua task serentak dan tunggu sehingga selesai
    if (tasks.length > 0) {
        await Promise.all(tasks);
        console.log("⚡ All lead integrations completed.");
    }

    // Pulangkan links yang berguna untuk frontend
    return {
        invoiceUrl,
        whatsappLink
    };
}

// ─── Supabase Product Search (server-only, service role) ─────────────────────

async function searchProducts(query: string, language: string = "ms") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Guard: if service role key not configured, return graceful fallback
    if (!url || !serviceKey) {
        console.warn("searchProducts: SUPABASE_SERVICE_ROLE_KEY not configured — skipping DB lookup.");
        const summary = language === "en" ? "Product database not connected. Please contact admin." : language === "zh" ? "产品数据库未连接。请联系管理员。" : "Pangkalan data produk belum disambungkan. Sila hubungi pentadbir.";
        return { products: [], summary };
    }

    try {
        const supabase = createClient(url, serviceKey);

        const q = query.toLowerCase();
        let baseSearch = query;
        if (q.includes("whisky") || q.includes("whiskey")) baseSearch = "whisky";
        else if (q.includes("wine")) baseSearch = "wine";
        else if (q.includes("vodka")) baseSearch = "vodka";
        else if (q.includes("cognac")) baseSearch = "cognac";
        else if (q.includes("brandy")) baseSearch = "brandy";
        else if (q.includes("beer")) baseSearch = "beer";
        else baseSearch = query.split(' ')[0] || query;

        const { data, error } = await supabase
            .from('products')
            .select('name, description, price, category, image_url, stock_quantity')
            .or(`name.ilike.%${baseSearch}%,category.ilike.%${baseSearch}%,description.ilike.%${baseSearch}%`)
            .gt('stock_quantity', 0);

        if (error || !data || data.length === 0) {
            // Fallback: just return ANY top 3 available products to avoid empty states
            const { data: fallbackData } = await supabase
                .from('products')
                .select('name, description, price, category, image_url, stock_quantity')
                .gt('stock_quantity', 0)
                .order('stock_quantity', { ascending: false })
                .limit(3);
            
            if (!fallbackData || fallbackData.length === 0) {
                const emptySummary = language === "en" ? "No products found." : language === "zh" ? "未找到产品。" : "Tiada produk dijumpai.";
                return { products: [], summary: emptySummary };
            }
            
            const fallbackSummary = language === "en" ? `No exact matches for "${query}", but here are our popular products:` : language === "zh" ? `未找到 "${query}" 的确切匹配，但这里是我们的热门产品：` : `Tiada hasil tepat untuk "${query}", tapi ini adalah produk popular kami:`;
            
            return {
                summary: fallbackSummary,
                products: fallbackData.slice(0, 3).map((p: any) => ({
                    name: p.name,
                    category: p.category,
                    price: `RM ${p.price}`,
                    description: p.description,
                    image_url: p.image_url,
                    badge: p.stock_quantity < 10 ? "TERHAD" : "TERSEDIA",
                    whatsapp_message: `Saya berminat dengan ${p.name} (RM ${p.price}). Boleh info lanjut?`
                }))
            };
        }

        let rankedData = [...data];

        // Rank based on mapped intent
        if (q.includes("restaurant") || q.includes("bar")) {
            // Horeca suitable, fast movers -> Sort by price ascending (volume-friendly)
            rankedData.sort((a, b) => a.price - b.price);
        } else if (q.includes("event") || q.includes("party")) {
            // Crowd favorites -> Sort by price ascending or mid-tier
            rankedData.sort((a, b) => a.price - b.price);
        } else if (q.includes("wholesale") || q.includes("resale") || q.includes("bulk")) {
            // Best margin, reseller friendly -> Sort by stock quantity descending
            rankedData.sort((a, b) => b.stock_quantity - a.stock_quantity);
        } else if (q.includes("personal") || q.includes("gift") || q.includes("premium")) {
            // Premium, gifting -> Sort by price descending
            rankedData.sort((a, b) => b.price - a.price);
        } else {
            // Default -> sort by price descending
            rankedData.sort((a, b) => b.price - a.price);
        }

        const top3 = rankedData.slice(0, 3);
        
        const successSummary = language === "en" ? `Found ${top3.length} product(s) for "${query}":` : language === "zh" ? `为您找到 ${top3.length} 款 "${query}" 产品：` : `Jumpa ${top3.length} produk untuk "${query}":`;

        return {
            summary: successSummary,
            products: top3.map((p: any) => ({
                name: p.name,
                category: p.category,
                price: `RM ${p.price}`,
                description: p.description,
                image_url: p.image_url,
                badge: p.stock_quantity < 10 ? "TERHAD" : "TERSEDIA",
                whatsapp_message: `Saya berminat dengan ${p.name} (RM ${p.price}). Boleh info lanjut?`
            }))
        };
    } catch (err) {
        console.error("searchProducts DB error:", err);
        const errSummary = language === "en" ? "Error searching for products. Please try again." : language === "zh" ? "搜索产品时出错。请重试。" : "Ralat semasa mencari produk. Cuba lagi.";
        return { products: [], summary: errSummary };
    }
}

async function queryProductDetails(name: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.warn("queryProductDetails: SUPABASE_SERVICE_ROLE_KEY not configured.");
        return null;
    }

    try {
        const supabase = createClient(url, serviceKey);
        const { data, error } = await supabase
            .from('products')
            .select('name, description, price, category, image_url, stock_quantity')
            .ilike('name', `%${name}%`)
            .gt('stock_quantity', 0)
            .limit(1);

        if (error || !data?.length) {
            return null;
        }

        return data[0];
    } catch (err) {
        console.error("queryProductDetails error:", err);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === "your_openai_api_key_here") {
            console.error("OPENAI_API_KEY is not defined or is placeholder in environment variables.");
            return NextResponse.json(
                { error: "OpenAI API key configuration error. Sila pastikan anda telah memasukkan key yang sah di .env.local" },
                { status: 500 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid JSON request body" },
                { status: 400 }
            );
        }

        const { message, messages, cart: incomingCart, language = "ms", action, leadContext = {}, customerContext, flowType } = body;
        const cart = Array.isArray(incomingCart) ? incomingCart : [];

        // Task 3: Lead Capture for WhatsApp click
        if (action === "whatsapp_click") {
            await saveLead({
                action: "whatsapp_click",
                language,
                cart,
                budget: leadContext.budget || "",
                quantity: leadContext.quantity || "",
                preference: leadContext.preference || "",
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({ success: true });
        }

        if (action === "order_created") {
            await saveLead({
                action: "order_created",
                language,
                cart,
                orderId: body.orderId,
                name: body.name,
                phone: body.phone,
                email: body.email,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({ success: true });
        }
        
        let languageInstruction = "";
        if (language === "en") {
            languageInstruction = `## LANGUAGE & TONE\n- Use casual, conversational English. Speak like a helpful local friend, not a rigid corporate consultant.`;
        } else if (language === "zh") {
            languageInstruction = `## LANGUAGE & TONE\n- Use natural, conversational Mandarin (Chinese). Friendly, warm, and direct.`;
        } else {
            // Default: ms
            languageInstruction = `## LANGUAGE & TONE\n- Gunakan bahasa Melayu santai. Boleh campur sikit slang Sabah (contoh: "bos", "ngam"). Speak like a helpful local friend.\n- Jangan terlalu skema. Elakkan ayat korporat.`;
        }
        
        // Build context block from customer session (injected by ChatWidget)
        const contextBlock = customerContext ? buildContextBlock(customerContext) : "";

        let systemInstructionText = `ROLE:
You are Golden AI, a lightning-fast, exclusive, and friendly concierge for Golden Isle Wholesale (a premium duty-free liquor supplier). 

CRITICAL CONSTRAINTS (VIOLATION IS STRICTLY FORBIDDEN):
1. LENGTH STRICT LIMIT: Maximum 3 short sentences per reply. Keep it extremely punchy and scannable.
2. NO FORMATTING: Strictly NO bullet points, NO bolding, NO markdown. Just natural chat.
3. PRICING: NEVER quote a price unless it comes directly from a tool result.
4. TONE: Be warm, persuasive, and proactive. Lead them back to your premium beverages. Never apologize like a robot.

${languageInstruction}

${contextBlock}
`;

        if (flowType === "ask_question") {
            systemInstructionText += `
CONCIERGE INQUIRY RULES:
1. Provide sophisticated, concise answers about products, shipping, delivery, and payments.
2. Even when answering questions, maintain your identity as a friendly consultant.
`;
        } else if (flowType === "wholesale_quote" || flowType === "competitor_compare") {
            systemInstructionText += `
EXECUTIVE QUOTATION RULES:
1. When a user asks for recommendations, use the 'search_products' tool to show product cards. Anticipate their needs instead of asking open-ended questions like "what is your budget?".
2. Product Cards: When returning products via 'search_products', the UI will automatically show "Add to Quote", "More Like This", and "Checkout".
3. Add to Quote: When they ask to add to quote, use the 'add_to_cart' tool.
4. Keep the conversation focused on building a premium wholesale quote smoothly.
`;
        } else {
            // General legacy flow rules
            systemInstructionText += `
CONCIERGE FLOW RULES:
1. Main Menu: When a user starts or says hello, offer these options: 'Browse Products', 'Recommend by Budget', 'Build Quote', 'Talk to Sales'.
2. Browse Products: If they ask to browse, use the 'get_categories' tool to fetch and show category buttons.
3. Category Click: Once a category is selected or mentioned, IMMEDIATELY use 'search_products' tool to show product cards. Do NOT ask open-ended questions like "what is your budget?".
4. Product Cards: When returning products via 'search_products', the UI will automatically show "Add to Quote", "More Like This", and "Checkout".
5. Add to Quote: When they ask to add to quote/cart, use the 'add_to_cart' tool.
6. Checkout: When they say checkout or pay, use the 'request_checkout' tool.
`;
        }

        systemInstructionText += `
GLOBAL RULES:
- Never hallucinate products, prices, stock, payment links, or shipping details.
- If they want to talk to a human, provide a WhatsApp link.

## PRICING GUARDRAILS
- NEVER suggest, quote, or calculate any price not returned directly from the database search tool.
- NEVER offer discounts, modify prices, or imply special rates not in the system.
- If user asks for discount: respond with "Boss, harga borong kami dah competitive. Untuk pembelian 10 karton ke atas, hubungi sales terus untuk harga khas."
- ALL prices must come from the search_products tool result only.

## FLOW GUARDRAILS  
- NEVER create, confirm, or finalise orders in text — the checkout_card UI handles this.
- NEVER process, simulate, or describe payment — the payment page handles this.
- NEVER bypass the checkout flow. If user asks to pay directly, call request_checkout tool.

## INTERACTIVE SUGGESTIONS
- Append 'SHOW_SUGGESTIONS:item1,item2,...' at the end of your response for quick contextual actions.
- Example: SHOW_SUGGESTIONS:Browse Products,Recommend by Budget,Talk to Sales`;


        // Format history for OpenAI
        const openAiMessages = [
            {
                role: "system",
                content: systemInstructionText
            }
        ];


        if (Array.isArray(messages)) {
            openAiMessages.push(...messages.map((m: any) => ({
                role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
                content: m.text || m.content || ""
            })));
        } else if (message && typeof message === "string") {
            openAiMessages.push({
                role: "user",
                content: message
            });
        }

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ 
                    model: "gpt-4o-mini",
                    messages: openAiMessages,
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "search_products",
                                description: "Cari produk arak premium dalam inventori Golden Isle Wholesale. WAJIB digunakan apabila pengguna bertanya tentang produk, harga, stok, wiski, bir, wine, rekomendasi produk, atau apa-apa barangan yang ada dijual.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        query: {
                                            type: "string",
                                            description: "Kata kunci carian produk. Contoh: 'whisky', 'beer', 'wine', 'Macallan', 'craft beer', dsb."
                                        }
                                    },
                                    required: ["query"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "update_lead_context",
                                description: "Save or update user's budget, product preference, and quantity requirements to memory.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        budget: { type: "string", description: "User's stated budget (e.g. 'RM500', 'under 1k')" },
                                        preference: { type: "string", description: "User's stated product preference (e.g. 'whisky', 'red wine')" },
                                        quantity: { type: "string", description: "User's stated quantity requirements (e.g. '10 bottles', '2 cartons')" }
                                    }
                                }
                            }
                        },

                        {
                            type: "function",
                            function: {
                                name: "add_to_cart",
                                description: "Masukkan satu atau beberapa produk ke dalam troli draf (cart) pelanggan. Gunakan apabila pengguna bersetuju dengan cadangan arak atau meminta secara jelas untuk membeli/memesan kuantiti tertentu. Contoh: 'tambah 5 botol Macallan', 'saya mau order Penfolds 2 botol'.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            description: "Senarai produk dan kuantiti yang ingin dimasukkan.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        description: "Nama produk yang ingin dibeli (seperti 'Macallan', 'Penfolds', 'Brandy', 'beer')."
                                                    },
                                                    quantity: {
                                                        type: "integer",
                                                        description: "Kuantiti atau bilangan botol yang ingin dipesan (minimum 1)."
                                                    }
                                                },
                                                required: ["name", "quantity"]
                                            }
                                        }
                                    },
                                    required: ["items"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "remove_from_cart",
                                description: "Keluarkan atau padamkan satu atau beberapa produk daripada troli draf (cart) pelanggan. Gunakan apabila pelanggan meminta untuk membatalkan tempahan barangan tertentu.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            description: "Senarai barangan yang mahu dibuang.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        description: "Nama produk yang mahu dibuang dari cart."
                                                    }
                                                },
                                                required: ["name"]
                                            }
                                        }
                                    },
                                    required: ["items"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "update_quantity",
                                description: "Kemaskini (update) kuantiti untuk produk yang sudah ada dalam troli draf (cart/quote). Gunakan apabila pelanggan meminta untuk menukar jumlah pesanan bagi barangan tertentu.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            description: "Senarai barangan yang mahu ditukar kuantitinya.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        description: "Nama produk yang ada dalam troli."
                                                    },
                                                    quantity: {
                                                        type: "integer",
                                                        description: "Kuantiti baru."
                                                    }
                                                },
                                                required: ["name", "quantity"]
                                            }
                                        }
                                    },
                                    required: ["items"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "view_cart",
                                description: "Paparkan senarai troli draf / resit draf (cart) pelanggan yang terkini. Gunakan apabila pelanggan meminta untuk menyemak pesanan mereka, bertanya 'berapa jumlah bil saya?', 'tunjuk cart saya', atau mahu proceed checkout.",
                                parameters: {
                                    type: "object",
                                    properties: {}
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "get_categories",
                                description: "Dapatkan senarai kategori produk yang ada dalam kedai.",
                                parameters: {
                                    type: "object",
                                    properties: {}
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "request_checkout",
                                description: "Panggil ini apabila pengguna sedia untuk checkout / membayar. Ia akan meminta butiran pelanggan atau terus membuka Payment Options Card jika details sudah ada.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        customer_name: { type: "string", description: "Nama pelanggan (jika ada)" },
                                        customer_phone: { type: "string", description: "Nombor telefon pelanggan (jika ada)" },
                                        customer_email: { type: "string", description: "Email pelanggan (jika ada)" }
                                    }
                                }
                            }
                        }
                    ],
                    tool_choice: "auto"
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`OpenAI API error (Status ${response.status}):`, errText);
            return NextResponse.json(
                { error: `OpenAI API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const choiceMessage = data.choices?.[0]?.message;
        const toolCalls = choiceMessage?.tool_calls;

        // ── Tool dispatch ────────────────────────────────────────────────────

        if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            let args: any = {};
            try {
                args = JSON.parse(toolCall.function.arguments || "{}");
            } catch (e) {
                console.error("Failed to parse tool call arguments:", e);
            }

            // get_categories — fetch available categories
            if (functionName === "get_categories") {
                // To keep it simple and dynamic, we just return the predefined categories or fetch from Supabase.
                // In this case, we'll return a static list that maps to what we expect in the DB.
                const categories = [
                    { label: "Whisky", value: "whisky" },
                    { label: "Wine", value: "wine" },
                    { label: "Vodka", value: "vodka" },
                    { label: "Cognac", value: "cognac" },
                    { label: "Craft Beer", value: "craft beer" }
                ];
                return NextResponse.json({
                    reply: "TOOL_RESULT_CATEGORIES:" + JSON.stringify(categories)
                });
            }

            // search_products — live Supabase product lookup
            if (functionName === "search_products") {
                const query = args.query ?? "";
                const result = await searchProducts(query, language);
                return NextResponse.json({
                    reply: "TOOL_RESULT_PRODUCT_CARDS:" + JSON.stringify(result)
                });
            }

            // request_checkout — switch to payment options
            if (functionName === "request_checkout") {
                return NextResponse.json({
                    reply: "TOOL_RESULT_CHECKOUT_CARD:" + JSON.stringify(args)
                });
            }
            if (functionName === "generate_quote_card") {
                return NextResponse.json({
                    reply: "TOOL_RESULT_QUOTE_CARD:" + JSON.stringify(args)
                });
            }

            const formatCartResult = (action: string, updatedCart: any[], summaryText: string) => {
                return "TOOL_RESULT:" + JSON.stringify({
                    action,
                    products: updatedCart,
                    summary: summaryText
                });
            };

            // add_to_cart — stateless cart update
            if (functionName === "add_to_cart") {
                const itemsToAdd = args.items ?? [];
                
                let updatedCart = [...cart];
                let addedCount = 0;
                let summaryList = [];

                for (const item of itemsToAdd) {
                    const dbProduct = await queryProductDetails(item.name);
                    if (dbProduct) {
                        const priceNum = Number(dbProduct.price);
                        const quantity = Number(item.quantity) || 1;
                        
                        const existingIdx = updatedCart.findIndex((c: any) => c.name.toLowerCase() === dbProduct.name.toLowerCase());
                        if (existingIdx > -1) {
                            updatedCart[existingIdx].quantity += quantity;
                            updatedCart[existingIdx].total = `RM ${(updatedCart[existingIdx].quantity * updatedCart[existingIdx].priceNum).toFixed(2)}`;
                        } else {
                            updatedCart.push({
                                name: dbProduct.name,
                                category: dbProduct.category || "Beverage",
                                price: `RM ${priceNum.toFixed(2)}`,
                                priceNum: priceNum,
                                quantity: quantity,
                                total: `RM ${(quantity * priceNum).toFixed(2)}`,
                                image_url: dbProduct.image_url,
                                whatsapp_message: `Saya berminat dengan ${dbProduct.name} (${quantity} unit, jumlah RM ${(quantity * priceNum).toFixed(2)}). Boleh proceed pesanan?`
                            });
                        }
                        addedCount += quantity;
                        summaryList.push(`${quantity}x ${dbProduct.name}`);
                    } else {
                        summaryList.push(`[Tiada Stok] ${item.name}`);
                    }
                }

                let summaryText = "";
                if (language === "en") {
                    summaryText = addedCount > 0 
                        ? `I have successfully added ${summaryList.join(", ")} to your quote draft. Here is your current quote receipt:`
                        : `I'm sorry, I couldn't find "${itemsToAdd.map((i: any)=>i.name).join(", ")}" with available stock in our inventory.`;
                } else if (language === "zh") {
                    summaryText = addedCount > 0 
                        ? `我已成功将 ${summaryList.join(", ")} 添加到您的报价单草稿中。以下是您当前的报价单明细：`
                        : `非常抱歉，在我们的库存中未找到有货的 "${itemsToAdd.map((i: any)=>i.name).join(", ")}"。`;
                } else {
                    summaryText = addedCount > 0 
                        ? `Saya sudah masukkan ${summaryList.join(", ")} ke dalam troli draf bosku. Berikut adalah resit draf ko yang terkini:`
                        : `Minta maaf bossku, saya tak jumpa produk "${itemsToAdd.map((i: any)=>i.name).join(", ")}" yang ada stok dalam inventori kita.`;
                }

                // Lead Capture
                await saveLead({
                    action: "add_to_cart",
                    language,
                    cart: updatedCart,
                    budget: leadContext.budget || "",
                    quantity: leadContext.quantity || "",
                    preference: leadContext.preference || "",
                    timestamp: new Date().toISOString()
                });

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // remove_from_cart — stateless cart delete
            if (functionName === "remove_from_cart") {
                const itemsToRemove = args.items ?? [];
                
                let updatedCart = [...cart];
                let removedList = [];

                for (const item of itemsToRemove) {
                    const idx = updatedCart.findIndex((c: any) => c.name.toLowerCase().includes(item.name.toLowerCase()));
                    if (idx > -1) {
                        removedList.push(updatedCart[idx].name);
                        updatedCart.splice(idx, 1);
                    }
                }

                let summaryText = "";
                if (language === "en") {
                    summaryText = removedList.length > 0 
                        ? `Perfect, I've removed ${removedList.join(", ")} from your quote draft. Here is your updated receipt:`
                        : `I couldn't find "${itemsToRemove.map((i: any)=>i.name).join(", ")}" in your quote draft.`;
                } else if (language === "zh") {
                    summaryText = removedList.length > 0 
                        ? `好的，我已从您的报价草稿中删除了 ${removedList.join(", ")}。这是您更新后的明细：`
                        : `在您的报价单草稿中未找到产品 "${itemsToRemove.map((i: any)=>i.name).join(", ")}"。`;
                } else {
                    summaryText = removedList.length > 0 
                        ? `Beres bossku, saya sudah padam ${removedList.join(", ")} dari troli draf ko. Ini resit draf terkini:`
                        : `Ehh, saya tak jumpa produk "${itemsToRemove.map((i: any)=>i.name).join(", ")}" di dalam troli draf ko sekarang.`;
                }

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // update_quantity — stateless cart update
            if (functionName === "update_quantity") {
                const itemsToUpdate = args.items ?? [];
                
                let updatedCart = [...cart];
                let updatedList = [];

                for (const item of itemsToUpdate) {
                    const idx = updatedCart.findIndex((c: any) => c.name.toLowerCase().includes(item.name.toLowerCase()));
                    if (idx > -1) {
                        const quantity = Number(item.quantity) || 1;
                        updatedCart[idx].quantity = quantity;
                        updatedCart[idx].total = `RM ${(updatedCart[idx].quantity * updatedCart[idx].priceNum).toFixed(2)}`;
                        updatedList.push(`${quantity}x ${updatedCart[idx].name}`);
                    }
                }

                let summaryText = "";
                if (language === "en") {
                    summaryText = updatedList.length > 0 
                        ? `Great, I've updated the quantities to ${updatedList.join(", ")}. Here is your updated quote draft:`
                        : `I couldn't find "${itemsToUpdate.map((i: any)=>i.name).join(", ")}" in your quote draft.`;
                } else if (language === "zh") {
                    summaryText = updatedList.length > 0 
                        ? `好的，我已将数量更新为 ${updatedList.join(", ")}。这是您更新后的报价单草稿：`
                        : `在您的报价单草稿中未找到产品 "${itemsToUpdate.map((i: any)=>i.name).join(", ")}"。`;
                } else {
                    summaryText = updatedList.length > 0 
                        ? `Cantik bosku, saya dah update kuantiti jadi ${updatedList.join(", ")}. Ini draf quote terkini:`
                        : `Sori bos, saya tak jumpa produk "${itemsToUpdate.map((i: any)=>i.name).join(", ")}" dalam draf quote.`;
                }

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // view_cart — stateless cart display
            if (functionName === "view_cart") {
                let summaryText = "";
                if (language === "en") {
                    summaryText = cart.length > 0
                        ? "Certainly, here are the details of your current quote draft (receipt):"
                        : "Your quote draft is currently empty. Would you like me to find some premium whiskies or beers to add?";
                } else if (language === "zh") {
                    summaryText = cart.length > 0
                        ? "好的，以下是您当前报价单（草稿）的详细信息："
                        : "您的报价单草稿目前是空的。需要我为您寻找一些高端威士忌或啤酒加入吗？";
                } else {
                    summaryText = cart.length > 0
                        ? "Baik bosku, berikut adalah butiran troli draf (resit draf) ko yang terkini:"
                        : "Troli draf ko masih kosong lagi, bossku. Mau saya carikan wiski atau beer premium untuk dimasukkan?";
                }
                
                return NextResponse.json({
                    reply: formatCartResult("cart_viewed", cart, summaryText)
                });
            }

            if (functionName === "update_lead_context") {
                let summaryText = "";
                if (language === "en") summaryText = "I have noted your preferences. How else can I assist you?";
                else if (language === "zh") summaryText = "我已经记录了您的需求。还有什么可以帮您的吗？";
                else summaryText = "Noted bosku! Ada apa-apa lagi yang saya boleh tolong?";

                return NextResponse.json({
                    reply: `TOOL_RESULT:{"action":"context_updated","data":${JSON.stringify(args)},"summary":"${summaryText}"}`
                });
            }
        }

        let reply = choiceMessage?.content;



        if (!reply) {
            console.error("Unexpected OpenAI API response structure:", JSON.stringify(data));
            return NextResponse.json(
                { error: "Failed to parse reply from OpenAI API response" },
                { status: 502 }
            );
        }
        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("Chat API Route Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
