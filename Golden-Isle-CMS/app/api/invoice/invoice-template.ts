// app/api/invoice/invoice-template.ts
// Pixel-perfect invoice email — matches Golden Isle brand screenshot exactly.
// Table-based layout, 100% inline CSS, Gmail/Outlook safe, max-width 640px.

export interface InvoiceItem {
    name: string;
    description?: string;  // e.g. "Premium Ale"
    quantity: number;
    unitPrice: number;      // numeric RM value
    imageUrl?: string;
}

export interface InvoiceData {
    customerName: string;
    customerEmail: string;
    invoiceNumber: string;  // e.g. "INV-1780454984769"
    issueDate: string;      // e.g. "3 Jun 2026"
    dueDate: string;        // e.g. "10 Jun 2026"
    items: InvoiceItem[];
    taxRate?: number;       // defaults to 0.08 (8% SST)
    payUrl?: string;
    pdfUrl?: string;
    whatsappUrl?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number): string =>
    `RM&nbsp;${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const F = "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

// ── Main generator ───────────────────────────────────────────────────────────
export function generateInvoiceHTML(data: InvoiceData): string {
    const {
        customerName,
        customerEmail,
        invoiceNumber,
        issueDate,
        dueDate,
        items,
        taxRate = 0.08,
        payUrl = "#",
        pdfUrl = "#",
        whatsappUrl = "https://wa.me/601164073143?text=Salam%20Golden%20Isle%20Wholesale%2C%20saya%20ingin%20rujuk%20Order%20ID%3A%20" + data.invoiceNumber,
    } = data;

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // ── Product rows ─────────────────────────────────────────────────────────
    const itemRowsHtml = items.map((item) => {
        const lineTotal = item.unitPrice * item.quantity;

        return `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #F1F5F9;vertical-align:middle;text-align:left;">
            <div style="font-size:14px;font-weight:700;color:#0F172A;font-family:${F};line-height:1.35;">${item.name}</div>
            <div style="font-size:12px;color:#64748B;margin-top:3px;font-family:${F};">
              ${item.description || "Product"}<span class="mobile-only-price" style="display:none;color:#94A3B8;margin-top:2px;">&nbsp;&bull;&nbsp;${item.quantity}&nbsp;&times;&nbsp;${fmt(item.unitPrice)}</span>
            </div>
          </td>
          <td class="hide-mobile" style="padding:14px 10px;border-bottom:1px solid #F1F5F9;vertical-align:middle;text-align:center;font-size:14px;color:#0F172A;font-family:${F};">
            ${item.quantity}
          </td>
          <td class="hide-mobile" style="padding:14px 10px;border-bottom:1px solid #F1F5F9;vertical-align:middle;text-align:right;font-size:14px;color:#0F172A;font-family:${F};white-space:nowrap;">
            ${fmt(item.unitPrice)}
          </td>
          <td style="padding:14px 20px;border-bottom:1px solid #F1F5F9;vertical-align:middle;text-align:right;font-size:14px;font-weight:700;color:#0F172A;font-family:${F};white-space:nowrap;">
            ${fmt(lineTotal)}
          </td>
        </tr>`;
    }).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>[Golden Isle] Invoice #${invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { margin:0; padding:0; background-color:#f8fafc; font-family:${F}; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:640px) {
      .outer-table { padding: 0 !important; }
      .wrap { width:100%!important; border-radius:0!important; border:none!important; box-shadow:none!important; }
      .header-col { display:block!important; width:100%!important; }
      .header-right { padding-top:12px!important; text-align:right!important; }
      .meta-col { display:block!important; width:100%!important; border-right:none!important;
                  border-bottom:1px solid #E2E8F0!important; padding:14px 20px !important; }
      .meta-col:last-child { border-bottom:none!important; }
      .help-content-col { display:block!important; width:100%!important; }
      .help-btn-col { display:block!important; width:100%!important; text-align:right!important; padding-left:0!important; padding-top:12px!important; }
      .help-btn-table { float:right!important; margin-right:0!important; }
      .help-br { display:none!important; }
      .btn-col { display:block!important; width:100%!important; padding-left:0!important; padding-right:0!important; padding-bottom:12px!important; }
      .btn-table { width:100%!important; }
      .help-card-container { padding:0 20px 20px !important; }
      .hide-mobile { display:none!important; }
      .mobile-only-price { display:inline!important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;">

<table border="0" cellpadding="0" cellspacing="0" width="100%" class="outer-table" style="background-color:#f8fafc;padding:30px 0 40px;">
<tr><td align="center">

<!-- ████ OUTER CARD ████████████████████████████████████████████████████████ -->
<table border="0" cellpadding="0" cellspacing="0" width="640" class="wrap"
  style="max-width:640px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #E2E8F0;border-collapse:separate;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">

  <!-- ══ HEADER: Logo + Brand + Invoice label ════════════════════════════ -->
  <tr>
    <td style="padding:22px 28px 20px;border-bottom:1px solid #E2E8F0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <!-- Left: Modern 2026 Logo + GOLDEN ISLE / WHOLESALE -->
          <td class="header-col" style="vertical-align:middle;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:11px;">
                  <img src="https://uvnngzfhxeeggmaocbws.supabase.co/storage/v1/object/public/product-images/logo.png"
                    width="38" height="38" alt="Golden Isle Logo"
                    style="display:block;width:38px;height:38px;border-radius:6px;object-fit:cover;">
                </td>
                <td style="vertical-align:middle;line-height:1;">
                  <div style="font-size:15px;font-weight:800;color:#0F172A;font-family:${F};letter-spacing:0.02em;line-height:1.15;white-space:nowrap;">GOLDEN ISLE</div>
                  <div style="font-size:15px;font-weight:800;color:#2563EB;font-family:${F};letter-spacing:0.02em;line-height:1.15;white-space:nowrap;">WHOLESALE</div>
                </td>
              </tr>
            </table>
          </td>
          <!-- Right: INVOICE label + number -->
          <td class="header-col header-right" style="vertical-align:middle;text-align:right;">
            <div style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.10em;font-family:${F};">Invoice</div>
            <div style="font-size:13px;font-weight:600;color:#0F172A;font-family:${F};margin-top:3px;white-space:nowrap;">#${invoiceNumber}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ HERO: Amount ════════════════════════════════════════════════════ -->
  <tr>
    <td style="padding:20px 28px 0;">
      <!-- Hero card with soft blue-gray bg -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%"
        style="background-color:#EEF2FF;border-radius:14px;border-collapse:separate;overflow:hidden;">
        <tr>
          <!-- Left: Amount info -->
          <td style="padding:28px;vertical-align:middle;text-align:left;">
            <div style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.09em;font-family:${F};margin-bottom:10px;">Amount Due</div>

            <!-- Large amount -->
            <div style="font-size:40px;font-weight:800;color:#0F172A;font-family:${F};letter-spacing:-0.03em;line-height:1;margin-bottom:14px;white-space:nowrap;">${fmt(total)}</div>

            <!-- Amber "Awaiting Payment" badge -->
            <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr>
                <td style="background-color:#FFFBEB;border:1.5px solid #FCD34D;border-radius:999px;padding:5px 12px 5px 9px;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:7px;vertical-align:middle;">
                        <!-- Amber dot -->
                        <div style="width:8px;height:8px;background-color:#F59E0B;border-radius:50%;font-size:0;line-height:0;">&nbsp;</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:12px;font-weight:600;color:#92400E;font-family:${F};white-space:nowrap;">Awaiting Payment</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Due date -->
            <div style="font-size:13px;color:#64748B;font-family:${F};">
              Due by <strong style="color:#EF4444;font-weight:700;">${dueDate}</strong>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ 3-COL META ROW ═════════════════════════════════════════════════════ -->
  <tr>
    <td style="padding:20px 28px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"
        style="border:1px solid #E2E8F0;border-radius:12px;border-collapse:separate;overflow:hidden;">
        <tr>
          <!-- Col 1: Customer -->
          <td class="meta-col" width="34%" style="padding:18px 20px;vertical-align:top;text-align:left;">
            <div style="font-size:10px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.09em;font-family:${F};margin-bottom:8px;">Customer</div>
            <div style="font-size:14px;font-weight:700;color:#0F172A;font-family:${F};margin-bottom:4px;">${customerName}</div>
            <div style="font-size:12px;color:#2563EB;font-family:${F};">${customerEmail}</div>
          </td>
          <!-- Col 2: Issued -->
          <td class="meta-col" width="33%" style="padding:18px 20px;vertical-align:top;text-align:left;">
            <div style="font-size:10px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.09em;font-family:${F};margin-bottom:8px;">Issued</div>
            <div style="font-size:14px;font-weight:700;color:#0F172A;font-family:${F};">${issueDate}</div>
          </td>
          <!-- Col 3: Due Date -->
          <td class="meta-col" width="33%" style="padding:18px 20px;vertical-align:top;text-align:left;">
            <div style="font-size:10px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.09em;font-family:${F};margin-bottom:8px;">Due Date</div>
            <div style="font-size:14px;font-weight:700;color:#EF4444;font-family:${F};">${dueDate}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ ORDER SUMMARY ══════════════════════════════════════════════════════ -->
  <tr>
    <td style="padding:22px 28px 8px;">
      <div style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:0.09em;font-family:${F};">Order Summary</div>
    </td>
  </tr>

  <!-- Product + totals card -->
  <tr>
    <td style="padding:0 28px 20px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" class="prod-table"
        style="border:1px solid #E2E8F0;border-radius:12px;border-collapse:separate;overflow:hidden;">

        <!-- Table Headers -->
        <thead>
          <tr style="background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;">
            <th style="padding:12px 20px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-family:${F};">Product</th>
            <th class="hide-mobile" style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-family:${F};width:60px;">Qty</th>
            <th class="hide-mobile" style="padding:12px 10px;text-align:right;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-family:${F};width:100px;">Unit Price</th>
            <th style="padding:12px 20px;text-align:right;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-family:${F};width:110px;">Total</th>
          </tr>
        </thead>

        <!-- Product rows -->
        <tbody>
          ${itemRowsHtml}
        </tbody>

        <!-- Subtotal + SST rows -->
        <tr>
          <td colspan="4" style="padding:14px 20px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:14px;color:#64748B;font-family:${F};padding-bottom:7px;text-align:right;padding-right:32px;">Subtotal</td>
                <td style="text-align:right;font-size:14px;color:#0F172A;font-family:${F};padding-bottom:7px;width:110px;font-weight:600;">${fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#64748B;font-family:${F};padding-bottom:14px;text-align:right;padding-right:32px;">SST (${(taxRate * 100).toFixed(0)}%)</td>
                <td style="text-align:right;font-size:14px;color:#0F172A;font-family:${F};padding-bottom:14px;width:110px;font-weight:600;">${fmt(taxAmount)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider above total -->
        <tr><td colspan="4" style="padding:0 20px;"><div style="height:1px;background-color:#F1F5F9;"></div></td></tr>

        <!-- Total Due -->
        <tr>
          <td colspan="4" style="padding:14px 20px 18px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:14px;font-weight:700;color:#0F172A;font-family:${F};text-align:right;padding-right:32px;">Total due</td>
                <td style="text-align:right;font-size:17px;font-weight:800;color:#2563EB;font-family:${F};letter-spacing:-0.02em;width:110px;">${fmt(total)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ ACTION BUTTONS (side-by-side on desktop, stacked on mobile) ════════ -->
  <tr>
    <td style="padding:0 28px 20px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <!-- Pay button -->
          <td class="btn-col" width="50%" style="padding-right:10px;vertical-align:middle;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="btn-table">
              <tr>
                <td align="center" style="background-color:#2563EB;border-radius:10px;">
                  <a href="${payUrl}" target="_blank"
                    style="display:block;padding:16px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;font-family:${F};letter-spacing:0.01em;border-radius:10px;">
                    &#128274; Pay Invoice
                  </a>
                </td>
              </tr>
            </table>
          </td>
          <!-- PDF button -->
          <td class="btn-col" width="50%" style="padding-left:10px;vertical-align:middle;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="btn-table">
              <tr>
                <td align="center" style="background-color:#ffffff;border:1.5px solid #E2E8F0;border-radius:10px;">
                  <a href="${pdfUrl}" target="_blank"
                    style="display:block;padding:14px 20px;font-size:14px;font-weight:600;color:#374151;text-decoration:none;text-align:center;font-family:${F};border-radius:10px;">
                    &#8675; Download PDF
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ NEED HELP BOX ══════════════════════════════════════════════════════ -->
  <tr>
    <td style="padding:0 28px 28px;" class="help-card-container">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"
        style="background-color:#F0F9FF;border:1px solid #BFDBFE;border-radius:12px;border-collapse:separate;">
        <tr>
          <td style="padding:18px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td class="help-content-col" style="vertical-align:middle;text-align:left;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:40px;vertical-align:middle;padding-right:14px;">
                        <img src="https://img.icons8.com/fluency/48/headset.png"
                          width="40" height="40" alt=""
                          style="display:block;width:40px;height:40px;">
                      </td>
                      <td style="vertical-align:middle;text-align:left;">
                        <div style="font-size:14px;font-weight:700;color:#0F172A;font-family:${F};margin-bottom:4px;">Need help with your invoice?</div>
                        <div style="font-size:12px;color:#64748B;font-family:${F};line-height:1.5;">Contact our customer support if you need any assistance.</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td class="help-btn-col" style="vertical-align:middle;text-align:right;padding-left:16px;width:170px;">
                  <table border="0" cellpadding="0" cellspacing="0" align="right" class="help-btn-table">
                    <tr>
                      <td style="background-color:#25D366;border:1px solid #25D366;border-radius:8px;padding:9px 14px;white-space:nowrap;">
                        <a href="${whatsappUrl}" target="_blank"
                          style="text-decoration:none;display:inline-block;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:7px;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                                  width="18" height="18"
                                  style="width:18px;height:18px;display:block;filter:brightness(0) invert(1);" alt="WhatsApp">
                              </td>
                              <td style="font-size:13px;font-weight:600;color:#ffffff;font-family:${F};vertical-align:middle;white-space:nowrap;">WhatsApp Support</td>
                            </tr>
                          </table>
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ FOOTER: Company + Legal ══════════════════════════ -->
  <tr>
    <td style="padding:20px 28px 28px;border-top:1px solid #F1F5F9;text-align:center;">
      <!-- Company name -->
      <div style="font-size:14px;font-weight:700;color:#0F172A;font-family:${F};margin-bottom:4px;">
        Golden Isle Wholesale
      </div>

      <!-- Address / Contact -->
      <div style="font-size:12px;color:#64748B;font-family:${F};margin-bottom:14px;">
        Labuan FT, Malaysia &nbsp;&bull;&nbsp; <a href="mailto:support@goldenisle.com" style="color:#2563EB;text-decoration:none;font-weight:500;">Contact Us</a>
      </div>

      <!-- Legal text -->
      <div style="font-size:11px;color:#94A3B8;font-family:${F};line-height:1.7;max-width:440px;margin:0 auto;">
        This email was generated automatically. Please do not reply to this email.<br>
        If you did not request this invoice, please ignore this email.
      </div>
    </td>
  </tr>

</table>
<!-- ████ END CARD ████████████████████████████████████████████████████████████ -->

</td></tr>
</table>

</body>
</html>`;
}
