'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Download, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check,
  FileText,
  Code,
  Smartphone,
  Monitor,
  Building2,
  ChevronRight,
  ExternalLink,
  Send,
  Loader2,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function InvoiceGenerator() {
  // --- STATE MANAGEMENT ---
  const [customerName, setCustomerName] = useState('Eddy Jiang');
  const [customerEmail, setCustomerEmail] = useState('jiangeddy3@gmail.com'); // Default to tester email
  const [orderId, setOrderId] = useState('INV-' + Math.floor(100000000 + Math.random() * 900000000));
  const [orderDate, setOrderDate] = useState('Jun 3, 2026');
  const [dueDate, setDueDate] = useState('Jun 10, 2026');
  const [itemQuantity, setItemQuantity] = useState(5);
  const [unitPrice, setUnitPrice] = useState(240.00); 
  const [taxRate, setTaxRate] = useState(0.08); // 8% SST
  
  // UI State
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop'); 
  const [viewType, setViewType] = useState<'preview' | 'code_react' | 'code_html'>('preview'); 
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Calculations
  const subtotal = itemQuantity * unitPrice;
  const taxAmount = subtotal * taxRate;
  const totalPrice = subtotal + taxAmount;

  // Format currency helper (RM/MYR focus)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    toast.success('Copied code to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic code templates matching current state
  const reactComponentCode = `import React from 'react';
import { Download, ArrowRight } from 'lucide-react';

export default function StripeStyleInvoice() {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">
        
        {/* Invoice Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Header Section */}
          <div className="p-8 border-b border-slate-100">
            <div className="font-extrabold text-slate-900 tracking-wider text-xs uppercase">
              GOLDEN ISLE WHOLESALE
            </div>
            <div className="text-slate-500 text-xs mt-1">
              Quotation #${orderId}
            </div>
          </div>

          {/* Body Section */}
          <div className="p-8 space-y-8">
            
            {/* Hero Amount Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Amount Due
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
                {formatCurrency(${totalPrice})}
              </h2>
              
              {/* Payment Methods */}
              <div className="text-xs text-slate-500 font-semibold mb-4">
                ✓ FPX &nbsp;&bull;&nbsp; ✓ DuitNow &nbsp;&bull;&nbsp; ✓ Credit Card
              </div>
              
              {/* Status Timeline */}
              <div className="pt-4 border-t border-slate-200/60 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500 font-medium">
                <span className="text-emerald-600 font-bold">✓ Generated</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Awaiting Payment
                </span>
                <span className="text-slate-300">•</span>
                <span>○ Processing</span>
                <span className="text-slate-300">•</span>
                <span>○ Delivered</span>
              </div>
            </div>

            {/* Greeting */}
            <div className="text-sm text-slate-900 leading-relaxed">
              Hi ${customerName.split(' ')[0]},<br/><br/>
              Your quotation is ready.
            </div>

            {/* Document Metadata */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Customer</span>
                <span className="text-slate-900 font-bold">${customerName} (${customerEmail})</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Issued</span>
                <span className="text-slate-900 font-bold">${orderDate}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Payment Due</span>
                <span className="text-red-600 font-bold">${dueDate}</span>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-900">Order Summary</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-center w-16">Qty</th>
                      <th className="px-4 py-3 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">Duvel Belgian Golden Ale</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Craft Beer Import</div>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-700 font-semibold">${itemQuantity}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">{formatCurrency(${subtotal})}</td>
                    </tr>
                    
                    {/* Pricing Summary Rows Inline */}
                    <tr className="bg-slate-50/50">
                      <td colSpan={2} className="px-4 py-2.5 text-right text-slate-400 font-semibold">Subtotal</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(${subtotal})}</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td colSpan={2} className="px-4 py-2.5 text-right text-slate-400 font-semibold">SST (${(taxRate * 100).toFixed(0)}%)</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(${taxAmount})}</td>
                    </tr>
                    <tr className="bg-slate-50/80 border-t border-slate-200">
                      <td colSpan={2} className="px-4 py-3 text-right text-slate-900 font-bold">Total Due</td>
                      <td className="px-4 py-3 text-right font-extrabold text-blue-600 text-sm tracking-tight">{formatCurrency(${totalPrice})}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
              <button className="flex-grow inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Pay Invoice <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex-grow inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>

          </div>
          
          {/* Footer */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 text-xs text-slate-500 leading-relaxed text-center sm:text-left">
            If you have any questions about this quotation, please contact support@goldenisle.com. <br className="hidden sm:block"/>
            By paying this quotation, you agree to our terms & conditions.
          </div>

        </div>
      </div>
    </div>
  );
}`;

  const emailHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>[Golden Isle] Official Quotation #${orderId}</title>
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
      <div style="font-size:13px;font-weight:500;color:#64748B;margin-top:4px;font-family:'Inter',sans-serif;">Quotation #${orderId}</div>
    </td>
  </tr>
</table>
<div style="height:24px;line-height:24px;font-size:24px;">&nbsp;</div>

<!-- HERO AMOUNT CARD -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E5E7EB;border-radius:20px;border-collapse:separate;">
  <tr>
    <td style="padding:32px;text-align:center;vertical-align:middle;">
      <div style="font-size:14px;font-weight:500;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;font-family:'Inter',sans-serif;">Amount Due</div>
      <div style="font-size:48px;font-weight:800;color:#0F172A;letter-spacing:-0.03em;line-height:1.0;margin-bottom:12px;font-family:'Inter',sans-serif;">${formatCurrency(totalPrice)}</div>
      
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
  Hi ${customerName.split(" ")[0]},<br/><br/>
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
          <td width="65%" style="width:65%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:14px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;text-align:right;">${customerName}</td>
        </tr>
        <!-- Issued Row -->
        <tr>
          <td width="35%" style="width:35%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:13px;font-weight:500;color:#64748B;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:0.05em;">Issued</td>
          <td width="65%" style="width:65%;height:44px;vertical-align:middle;border-bottom:1px solid #F1F5F9;font-size:14px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;text-align:right;">${orderDate}</td>
        </tr>
        <!-- Due Date Row -->
        <tr>
          <td width="35%" style="width:35%;height:44px;vertical-align:middle;font-size:13px;font-weight:500;color:#64748B;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:0.05em;">Payment Due</td>
          <td width="65%" style="width:65%;height:44px;vertical-align:middle;font-size:14px;font-weight:600;color:#EF4444;font-family:'Inter',sans-serif;text-align:right;">${dueDate}</td>
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
          <tr>
            <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;text-align:left;vertical-align:middle;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:48px;padding-right:12px;vertical-align:middle;">
                      <img src="https://img.icons8.com/fluency/96/beer-bottle.png" alt="" width="48" height="48" style="width:48px;height:48px;object-fit:contain;border-radius:8px;border:1px solid #E5E7EB;display:block;background-color:#F8FAFC;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:16px;font-weight:600;color:#0F172A;line-height:1.3;font-family:'Inter',sans-serif;">Duvel Belgian Golden Ale</div>
                      <div style="font-size:13px;color:#64748B;margin-top:2px;font-family:'Inter',sans-serif;">Craft Beer</div>
                    </td>
                  </tr>
                </table>
            </td>
            <td style="padding:16px 8px;border-bottom:1px solid #E5E7EB;font-size:15px;color:#64748B;text-align:center;vertical-align:middle;font-weight:500;font-family:'Inter',sans-serif;width:80px;">
                ${itemQuantity}
            </td>
            <td align="right" style="padding:16px 0;border-bottom:1px solid #E5E7EB;font-size:15px;font-weight:700;color:#0F172A;vertical-align:middle;font-family:'Inter',sans-serif;width:110px;">
                ${formatCurrency(subtotal)}
            </td>
          </tr>
          
          <!-- Pricing Summary Inline -->
          <tr>
            <td colspan="2" style="padding:16px 0 8px 0;text-align:right;font-size:13px;color:#64748B;font-family:'Inter',sans-serif;">Subtotal</td>
            <td style="padding:16px 0 8px 0;text-align:right;font-size:13px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:4px 0 12px 0;text-align:right;font-size:13px;color:#64748B;font-family:'Inter',sans-serif;">SST (${(taxRate * 100).toFixed(0)}%)</td>
            <td style="padding:4px 0 12px 0;text-align:right;font-size:13px;font-weight:600;color:#0F172A;font-family:'Inter',sans-serif;">${formatCurrency(taxAmount)}</td>
          </tr>
          <tr style="border-top:1.5px solid #E5E7EB;">
            <td colspan="2" style="padding:16px 0 0 0;text-align:right;font-size:14px;font-weight:700;color:#0F172A;font-family:'Inter',sans-serif;">Total Due</td>
            <td style="padding:16px 0 0 0;text-align:right;font-size:16px;font-weight:800;color:#2563EB;font-family:'Inter',sans-serif;">${formatCurrency(totalPrice)}</td>
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
      <a href="#" target="_blank" style="display:block;width:100%;height:50px;line-height:50px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;text-align:center;font-family:'Inter',sans-serif;box-sizing:border-box;">Pay Invoice</a>
    </td>
  </tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">
  <tr>
    <td align="center" style="height:50px;background-color:#FFFFFF;border:1px solid #D1D5DB;border-radius:8px;vertical-align:middle;">
      <a href="#" target="_blank" style="display:block;width:100%;height:48px;line-height:48px;color:#374151;font-size:14px;font-weight:600;text-decoration:none;text-align:center;font-family:'Inter',sans-serif;box-sizing:border-box;">Download PDF</a>
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
            <a href="#" target="_blank" style="display:inline-block;background-color:#25D366;border:1px solid #1ead57;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:600;color:#FFFFFF;text-decoration:none;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.08);font-family:'Inter',sans-serif;vertical-align:middle;">
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
</html>`;

  // Real B2B Email Sending via backend chat integration
  const handleSendEmail = async () => {
    setIsSending(true);
    const cart = [
      {
        name: 'Duvel Belgian Golden Ale',
        category: 'Craft Beer',
        price: 'RM ' + unitPrice.toFixed(2),
        priceNum: unitPrice,
        quantity: itemQuantity,
        total: 'RM ' + (unitPrice * itemQuantity).toFixed(2),
        image_url: 'https://images.unsplash.com/photo-1569919659476-f0852f682859?q=80&w=120',
        whatsapp_message: `Saya berminat dengan Duvel Belgian Golden Ale (${itemQuantity} unit, jumlah ${formatCurrency(subtotal)}). Boleh proceed?`
      }
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'order_created',
          name: customerName,
          email: customerEmail,
          phone: '60113152225', // Tester fallback
          orderId: orderId,
          cart: cart,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success(`Succesfully sent invoice to ${customerEmail}!`);
      } else {
        toast.error('Failed to dispatch invoice. Check API configurations.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error dispatching e-mail. Check network.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/50 selection:text-blue-900">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Invoice & Quotation Builder
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Generate and dispatch beautiful Enterprise-grade PDF/HTML quotations instantly
          </p>
        </div>

        {/* Tab switcher using Framer Motion active pill */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
          {(['preview', 'code_react', 'code_html'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setViewType(tab)}
              className="relative px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all z-10 flex items-center gap-1.5 capitalize cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {viewType === tab && (
                <motion.span
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50 z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab === 'preview' && <Monitor className="w-3.5 h-3.5" />}
                {tab === 'code_react' && <Code className="w-3.5 h-3.5" />}
                {tab === 'code_html' && <FileText className="w-3.5 h-3.5" />}
                {tab === 'preview' ? 'Visual Preview' : tab === 'code_react' ? 'React Component' : 'Email HTML'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Data Editor Panel */}
        <section className="lg:col-span-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Invoice Parameters
            </h2>
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Send Live Email
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Customer Name
              </label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Customer Email
              </label>
              <input 
                type="email" 
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Invoice Number
              </label>
              <input 
                type="text" 
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-950 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Issue Date
                </label>
                <input 
                  type="text" 
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Due Date
                </label>
                <input 
                  type="text" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-900 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Unit Price (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-semibold">RM</span>
                  <input 
                    type="number" 
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Quantity
                </label>
                <input 
                  type="number" 
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tax Rate (SST)
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              >
                <option value="0">Exempt (0%)</option>
                <option value="0.06">6% SST</option>
                <option value="0.08">8% SST (Default)</option>
                <option value="0.10">10% SST</option>
              </select>
            </div>
          </div>
          
          {/* Pro Tips Note */}
          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> 
              Enterprise Standards
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>• System automatically binds calculations.</li>
              <li>• Generated HTML handles strict inline styles.</li>
              <li>• Fonts use standard fallbacks for Outlook.</li>
            </ul>
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Viewports */}
        <section className="lg:col-span-8 flex flex-col items-center">
          
          {/* VIEW TYPE: VISUAL PREVIEW */}
          {viewType === 'preview' && (
            <div className="w-full flex flex-col items-center">
              
              {/* Responsive Width Toggle (Framer Motion spring action) */}
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-sm mb-6 gap-1 relative z-10">
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${previewMode === 'mobile' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile (375px)
                </button>
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${previewMode === 'desktop' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop (Full)
                </button>
              </div>

              {/* Viewport Bezier Frame (Vercel/Linear Simulated Browser) */}
              <div className="w-full border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-slate-100 dark:bg-[#121215] flex flex-col">
                
                {/* Browser Bezel Header */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 px-8 py-1 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-sm select-none border border-slate-200/30">
                    https://goldenisle.com/api/invoice/{orderId}
                  </div>
                  <div className="w-12" /> {/* Spacing spacer */}
                </div>

                {/* Simulated Web View Container */}
                <div className="p-8 flex justify-center items-center overflow-auto min-h-[580px]">
                  
                  {/* Animating the layout width change using spring transitions */}
                  <motion.div 
                    animate={{ width: previewMode === 'mobile' ? 375 : 680 }}
                    transition={{ type: "spring", stiffness: 220, damping: 25 }}
                    className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden text-slate-950 font-sans selection:bg-blue-100"
                  >
                    
                    {/* Header */}
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                      <div className="font-extrabold text-slate-900 tracking-wider text-xs uppercase font-sans">
                        GOLDEN ISLE WHOLESALE
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        Quotation #{orderId}
                      </div>
                    </div>

                    {/* Hero Amount Card */}
                    <div className="p-6 sm:p-8 pb-0">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Amount Due
                        </div>
                        <AnimatePresence mode="popLayout">
                          <motion.h2 
                            key={totalPrice}
                            initial={{ opacity: 0.6, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-2"
                          >
                            {formatCurrency(totalPrice)}
                          </motion.h2>
                        </AnimatePresence>
                        
                        {/* Payment Methods */}
                        <div className="text-xs text-slate-500 font-semibold mb-4">
                          ✓ FPX &nbsp;&bull;&nbsp; ✓ DuitNow &nbsp;&bull;&nbsp; ✓ Credit Card
                        </div>
                        
                        {/* Status Timeline */}
                        <div className="pt-4 border-t border-slate-200/60 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px] text-slate-500 font-semibold">
                          <span className="text-emerald-600 font-bold">✓ Generated</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting Payment
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>○ Processing</span>
                          <span className="text-slate-300">•</span>
                          <span>○ Delivered</span>
                        </div>
                      </div>
                    </div>

                    {/* Greeting */}
                    <div className="p-6 sm:p-8 pb-0 text-sm text-slate-900 leading-relaxed font-sans">
                      Hi {customerName.split(' ')[0]},<br/><br/>
                      Your quotation is ready.
                    </div>

                    {/* Document Metadata */}
                    <div className="p-6 sm:p-8 pb-0">
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider">Customer</span>
                          <span className="text-slate-900 font-bold">{customerName} ({customerEmail})</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider">Issued</span>
                          <span className="text-slate-900 font-bold">{orderDate}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider">Payment Due</span>
                          <span className="text-red-600 font-bold">{dueDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Summary Table with Inline Calculations */}
                    <div className="p-6 sm:p-8">
                      <div className="text-sm font-bold text-slate-900 mb-3">Order Summary</div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3 text-center w-16">Qty</th>
                              <th className="px-4 py-3 text-right w-24">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="px-4 py-4">
                                <div className="font-bold text-slate-900">Duvel Belgian Golden Ale</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Craft Beer Import</div>
                              </td>
                              <td className="px-4 py-4 text-center text-slate-700 font-semibold">{itemQuantity}</td>
                              <td className="px-4 py-4 text-right font-bold text-slate-900">{formatCurrency(subtotal)}</td>
                            </tr>
                            
                            {/* Pricing Summary Rows Inline */}
                            <tr className="bg-slate-50/50">
                              <td colSpan={2} className="px-4 py-2.5 text-right text-slate-400 font-semibold">Subtotal</td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(subtotal)}</td>
                            </tr>
                            <tr className="bg-slate-50/50">
                              <td colSpan={2} className="px-4 py-2.5 text-right text-slate-400 font-semibold">SST ({(taxRate * 100).toFixed(0)}%)</td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(taxAmount)}</td>
                            </tr>
                            <tr className="bg-slate-50/80 border-t border-slate-200">
                              <td colSpan={2} className="px-4 py-3 text-right text-slate-900 font-bold">Total Due</td>
                              <td className="px-4 py-3 text-right font-extrabold text-blue-600 text-sm tracking-tight">{formatCurrency(totalPrice)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* CTA Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 p-6 sm:p-8 pt-0 pb-6">
                      <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer">
                        Pay Invoice <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 cursor-pointer">
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </div>

                    {/* Inside-Invoice Client Footer */}
                    <div className="bg-slate-50 px-6 sm:px-8 py-5 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 leading-relaxed text-center sm:text-left">
                        If you have any questions about this quotation, please contact <span className="text-blue-600 font-semibold hover:underline cursor-pointer">support@goldenisle.com</span>.<br className="hidden sm:block"/>
                        By paying this quotation, you agree to our terms & conditions.
                      </p>
                    </div>

                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TYPE: REACT JSX CODE EXPORT */}
          {viewType === 'code_react' && (
            <div className="w-full bg-slate-950 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800/80">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2 select-none">
                  <Code className="w-3.5 h-3.5 text-blue-500" />
                  StripeStyleInvoice.jsx
                </span>
                
                {/* Micro-interaction on Copy Icon */}
                <button 
                  onClick={() => handleCopyCode(reactComponentCode)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.5, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0.5, rotate: 45 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span>{copied ? 'Copied!' : 'Copy React Code'}</span>
                </button>
              </div>
              <pre className="p-6 overflow-auto text-xs text-slate-300 font-mono leading-relaxed bg-[#0b0c10] max-h-[600px] select-all">
                <code>{reactComponentCode}</code>
              </pre>
            </div>
          )}

          {/* VIEW TYPE: HTML EMAIL TEMPLATE EXPORT */}
          {viewType === 'code_html' && (
            <div className="w-full bg-slate-950 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800/80">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2 select-none">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  invoice_email.html
                </span>
                
                {/* Micro-interaction on Copy Icon */}
                <button 
                  onClick={() => handleCopyCode(emailHtmlTemplate)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.5, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0.5, rotate: 45 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span>{copied ? 'Copied!' : 'Copy Email HTML'}</span>
                </button>
              </div>
              <div className="bg-blue-500/10 border-b border-blue-500/20 p-3.5 px-6 shrink-0 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" /> 
                <p className="text-[11px] text-blue-400 font-semibold tracking-wide">
                  OUTLOOK & GMAIL RENDERING: Template uses 100% nested tables and inline CSS style guides.
                </p>
              </div>
              <pre className="p-6 overflow-auto text-xs text-slate-300 font-mono leading-relaxed bg-[#0b0c10] max-h-[600px] select-all">
                <code>{emailHtmlTemplate}</code>
              </pre>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}
