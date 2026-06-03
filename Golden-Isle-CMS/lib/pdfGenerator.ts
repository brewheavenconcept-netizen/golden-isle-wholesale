// pdfGenerator.ts — Pure-JS PDF generator using jsPDF (no external font dependencies)
// This is safe to run inside Next.js App Router (Node runtime)

import { jsPDF } from "jspdf";

interface OrderItem {
    name: string;
    category?: string;
    price: string;
    priceNum: number;
    quantity: number;
    total: string;
}

interface OrderData {
    orderId: string;
    name: string;
    phone: string;
    language?: string;
    cart: OrderItem[];
    timestamp?: string;
}

export function generateInvoicePdf(orderData: OrderData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const gold = [184, 134, 11] as [number, number, number];
            const dark = [26, 26, 26] as [number, number, number];
            const gray = [100, 100, 100] as [number, number, number];
            const lightBg = [248, 248, 248] as [number, number, number];

            // ── Header gold bar ──────────────────────────────────────
            doc.setFillColor(...gold);
            doc.rect(0, 0, pageW, 14, "F");

            // Company name
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.setTextColor(...dark);
            doc.text("GOLDEN ISLE WHOLESALE", 40, 45);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(...gray);
            doc.text("Premium Duty-Free Liquor Wholesaler", 40, 58);
            doc.text("Labuan FT, Malaysia  |  sales@goldenisle.com", 40, 69);

            // Title (right)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(...gold);
            doc.text("OFFICIAL QUOTATION", pageW - 40, 45, { align: "right" });

            // Date & Order ID (right)
            const dateStr = new Date(orderData.timestamp || Date.now()).toLocaleString("en-MY", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur"
            });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(...dark);
            doc.text(`Quotation No: ${orderData.orderId}`, pageW - 40, 60, { align: "right" });
            doc.text(`Date: ${dateStr}`, pageW - 40, 72, { align: "right" });

            // Divider
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.5);
            doc.line(40, 85, pageW - 40, 85);

            // ── Client Details ────────────────────────────────────────
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(...dark);
            doc.text("CLIENT DETAILS (BILL TO):", 40, 105);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(60, 60, 60);
            doc.text(`Name   : ${orderData.name || "Anonymous Client"}`, 40, 122);
            doc.text(`Phone  : ${orderData.phone || "Not Provided"}`, 40, 136);
            doc.text(`Lang   : ${(orderData.language || "ms").toUpperCase()}`, 40, 150);

            // Status badge (right)
            doc.setFillColor(...lightBg);
            doc.roundedRect(pageW - 220, 100, 180, 55, 4, 4, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...gold);
            doc.text("STATUS: PENDING CONFIRMATION", pageW - 215, 118);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...gray);
            doc.text("This draft quote is valid for 7 days.", pageW - 215, 132);
            doc.text("Please confirm to lock in stock.", pageW - 215, 144);

            // ── Items Table ───────────────────────────────────────────
            const tTop = 185;
            const colX = { no: 40, item: 70, cat: 300, price: 380, qty: 450, total: 510 };

            // Table header
            doc.setFillColor(...gold);
            doc.rect(40, tTop, pageW - 80, 22, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text("No.", colX.no, tTop + 14);
            doc.text("Item Description", colX.item, tTop + 14);
            doc.text("Category", colX.cat, tTop + 14);
            doc.text("Unit Price", colX.price, tTop + 14, { align: "right" });
            doc.text("Qty", colX.qty, tTop + 14, { align: "center" });
            doc.text("Total", colX.total, tTop + 14, { align: "right" });

            let y = tTop + 22;
            let grandTotal = 0;
            let totalQty = 0;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);

            orderData.cart.forEach((item, i) => {
                // Alternating row bg
                if (i % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(40, y, pageW - 80, 20, "F");
                }

                const priceNum = item.priceNum || parseFloat((item.price || "0").replace(/[^0-9.]/g, ""));
                const qty = Number(item.quantity) || 1;
                const rowTotal = priceNum * qty;
                grandTotal += rowTotal;
                totalQty += qty;

                doc.setTextColor(...dark);
                doc.text(`${i + 1}`, colX.no, y + 13);
                // Truncate long names
                const itemName = item.name.length > 35 ? item.name.slice(0, 33) + "…" : item.name;
                doc.text(itemName, colX.item, y + 13);
                const catName = (item.category || "Beverage").slice(0, 15);
                doc.text(catName, colX.cat, y + 13);
                doc.text(`RM ${priceNum.toFixed(2)}`, colX.price, y + 13, { align: "right" });
                doc.text(`${qty}`, colX.qty, y + 13, { align: "center" });
                doc.text(`RM ${rowTotal.toFixed(2)}`, colX.total, y + 13, { align: "right" });

                // Row divider
                doc.setDrawColor(230, 230, 230);
                doc.setLineWidth(0.3);
                doc.line(40, y + 20, pageW - 40, y + 20);

                y += 20;
            });

            // ── Grand Total ───────────────────────────────────────────
            y += 12;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(...dark);
            doc.text(`Total Items: ${totalQty} unit(s)`, 40, y);

            doc.setFontSize(13);
            doc.setTextColor(...gold);
            doc.text(`GRAND TOTAL: RM ${grandTotal.toFixed(2)}`, pageW - 40, y, { align: "right" });

            // ── Payment Box ───────────────────────────────────────────
            const payY = y + 25;
            doc.setDrawColor(...gold);
            doc.setLineWidth(1);
            doc.rect(40, payY, pageW - 80, 72);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(...gold);
            doc.text("PAYMENT INSTRUCTIONS (BANK TRANSFER):", 50, payY + 16);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(...dark);
            doc.text("Bank Name      :  Bank Malaysia Berhad", 50, payY + 31);
            doc.text("Account Name   :  Golden Isle Wholesale", 50, payY + 44);
            doc.text("Account Number :  123-456-789", 50, payY + 57);

            doc.setFontSize(7.5);
            doc.setTextColor(...gray);
            doc.text("* Sila hantar bukti bayar ke WhatsApp kami untuk pengesahan segera.", pageW / 2 + 10, payY + 40, { maxWidth: 220 });

            // ── Footer ────────────────────────────────────────────────
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            doc.text(
                "Thank you for choosing Golden Isle Wholesale! We look forward to serving you.",
                pageW / 2, 800, { align: "center" }
            );

            // Gold bar at bottom
            doc.setFillColor(...gold);
            doc.rect(0, 827, pageW, 14, "F");

            // ── Export as Buffer ──────────────────────────────────────
            const arrayBuffer = doc.output("arraybuffer");
            resolve(Buffer.from(arrayBuffer));
        } catch (err) {
            reject(err);
        }
    });
}
