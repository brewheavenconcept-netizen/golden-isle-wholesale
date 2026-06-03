// app/api/invoice/[orderId]/route.ts
// GET  → serve PDF for this order (existing)
// POST → send invoice email via Resend using generateInvoiceHTML

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateInvoicePdf } from "@/lib/pdfGenerator";
import { generateInvoiceHTML, type InvoiceData } from "@/app/api/invoice/invoice-template";

// ── GET: serve PDF ──────────────────────────────────────────────────────────
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;

        if (!orderId) {
            return NextResponse.json({ error: "Order ID diperlukan." }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceKey) {
            return NextResponse.json({ error: "Database not configured." }, { status: 500 });
        }

        const supabase = createClient(url, serviceKey);

        // Cuba cari order dari Supabase berdasarkan orderId
        const { data: order, error } = await supabase
            .from("orders")
            .select("id, customer_name, customer_phone, items, total, created_at, payment_method, status")
            .or(`id.eq.${orderId},id.ilike.%${orderId}%`)
            .single();

        let orderData;

        if (error || !order) {
            // Fallback: jana PDF placeholder jika order tak jumpa
            // (untuk kes chatbot order yang tak tersimpan di DB dengan ID yang sama)
            orderData = {
                orderId,
                name: "Pelanggan",
                phone: "—",
                language: "ms",
                cart: [],
                timestamp: new Date().toISOString()
            };
        } else {
            // Map Supabase order ke format PDF
            const items = Array.isArray(order.items) ? order.items : [];
            orderData = {
                orderId: orderId,
                name: order.customer_name || "Pelanggan",
                phone: order.customer_phone || "—",
                language: "ms",
                timestamp: order.created_at || new Date().toISOString(),
                cart: items.map((item: any) => ({
                    name: item.name || item.product_name || "Produk",
                    category: item.category || "Beverage",
                    price: item.price || `RM ${item.unit_price || 0}`,
                    priceNum: item.priceNum || item.unit_price || 0,
                    quantity: item.quantity || 1,
                    total: item.total || `RM ${(item.unit_price || 0) * (item.quantity || 1)}`
                }))
            };
        }

        // Jana PDF dari data
        const pdfBuffer = await generateInvoicePdf(orderData);

        // Pulangkan fail PDF terus sebagai download response
        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="Quotation_${orderId}.pdf"`,
                "Content-Length": String(pdfBuffer.length),
                "Cache-Control": "no-cache"
            }
        });

    } catch (err: any) {
        console.error("Invoice API Error:", err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}

// ── POST: send invoice email via Resend ─────────────────────────────────────
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            return NextResponse.json({ error: "RESEND_API_KEY not configured." }, { status: 500 });
        }

        // Body: { customerEmail, customerName, items[], dueDate?, issueDate?, taxRate? }
        const body = await req.json();
        const {
            customerEmail,
            customerName = "Customer",
            items = [],
            dueDate,
            issueDate,
            taxRate = 0.08
        } = body;

        if (!customerEmail) {
            return NextResponse.json({ error: "customerEmail is required." }, { status: 400 });
        }

        const now = new Date();
        const fmtDate = (d: Date) =>
            d.toLocaleDateString("en-MY", {
                day: "numeric", month: "short", year: "numeric",
                timeZone: "Asia/Kuala_Lumpur"
            });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

        const invoiceData: InvoiceData = {
            customerName,
            customerEmail,
            invoiceNumber: orderId,
            issueDate: issueDate || fmtDate(now),
            dueDate: dueDate || fmtDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
            items: items.map((item: any) => ({
                name: item.name || "Product",
                description: item.description || item.category || "",
                quantity: Number(item.quantity) || 1,
                unitPrice: item.priceNum || parseFloat((item.price || "0").replace(/[^0-9.]/g, "")) || 0
            })),
            taxRate,
            payUrl: `${appUrl}/order-confirmation?orderId=${orderId}`,
            pdfUrl: `${appUrl}/api/invoice/${orderId}`,
            whatsappUrl: `https://wa.me/601164073143?text=Salam%20Golden%20Isle%20Wholesale%2C%20saya%20ingin%20rujuk%20Order%20ID%3A%20${orderId}`
        };

        const htmlBody = generateInvoiceHTML(invoiceData);

        const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL || "Golden Isle Wholesale <onboarding@resend.dev>",
                to: [customerEmail],
                subject: `Your Golden Isle quotation is ready — ${orderId}`,
                html: htmlBody
            })
        });

        if (!emailRes.ok) {
            const errText = await emailRes.text();
            console.error("Resend error:", errText);
            return NextResponse.json({ error: "Email delivery failed.", detail: errText }, { status: 502 });
        }

        const resendData = await emailRes.json();
        console.log(`✅ Invoice email sent to ${customerEmail} (id: ${resendData.id})`);

        return NextResponse.json({ success: true, emailId: resendData.id });

    } catch (err: any) {
        console.error("Invoice POST Error:", err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}

