import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface OrderData {
  orderId: string;
  name: string;
  phone: string;
  timestamp: string;
  cart: Array<{
    name: string;
    quantity: number;
    priceNum: number;
  }>;
}

export async function generateReceipt(order: OrderData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 600]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, size: number = 12, isBold: boolean = false) => {
    page.drawText(text, { x, y, size, font: isBold ? boldFont : font, color: rgb(0, 0, 0) });
  };

  // Header
  let currentY = height - 50;
  drawText('Golden Isle Wholesale - Resit Rasmi', 50, currentY, 16, true);
  
  // Order Info
  currentY -= 40;
  drawText(`Order ID: ${order.orderId}`, 50, currentY, 12);
  currentY -= 20;
  drawText(`Tarikh: ${new Date(order.timestamp).toLocaleDateString()}`, 50, currentY, 12);
  currentY -= 20;
  drawText(`No. Tel: ${order.phone}`, 50, currentY, 12);

  // Table Header
  currentY -= 40;
  drawText('Item', 50, currentY, 12, true);
  drawText('Qty', 250, currentY, 12, true);
  drawText('Harga (RM)', 300, currentY, 12, true);

  // Line
  currentY -= 10;
  page.drawLine({ start: { x: 50, y: currentY }, end: { x: 350, y: currentY }, thickness: 1, color: rgb(0, 0, 0) });

  // Items
  currentY -= 20;
  let total = 0;
  for (const item of order.cart) {
    drawText(item.name.slice(0, 25), 50, currentY, 10);
    drawText(item.quantity.toString(), 250, currentY, 10);
    const itemTotal = item.quantity * item.priceNum;
    drawText(itemTotal.toFixed(2), 300, currentY, 10);
    total += itemTotal;
    currentY -= 20;
  }

  // Line
  currentY -= 10;
  page.drawLine({ start: { x: 50, y: currentY }, end: { x: 350, y: currentY }, thickness: 1, color: rgb(0, 0, 0) });

  // Total
  currentY -= 20;
  drawText('Jumlah:', 230, currentY, 12, true);
  drawText(`RM ${total.toFixed(2)}`, 300, currentY, 12, true);

  // Footer
  currentY -= 60;
  drawText('Terima kasih bosku!', 150, currentY, 14, true);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
