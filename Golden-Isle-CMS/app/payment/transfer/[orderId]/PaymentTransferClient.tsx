'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getOrder, uploadPaymentProof, updatePaymentProof } from '@/lib/storage';
import { usePublicStore } from '@/hooks/usePublicStore';

/* ── SVG Icons ─────────────────────────────────────────── */
const Icons = {
  upload: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9a9a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  lock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  receipt: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
};

const StepBadge = ({ number, active, done }: { number: string; active: boolean; done: boolean }) => (
  <div style={{
    width: 28, height: 28, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    background: "#1a1a0e",
    color: "#ffffff",
    transition: "all 0.3s ease",
    flexShrink: 0,
    opacity: (active || done) ? 1 : 0.3,
  }}>
    {done ? Icons.check : number}
  </div>
);

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Playfair+Display:wght@400;500;600;700&display=swap');

  :root {
    --white: #ffffff;
    --bg: #ffffff;
    --surface: #f5f3ee;
    --surface-hover: #efece5;
    --border: #e8e5dd;
    --border-light: #f0ede6;
    --dark: #1a1a0e;
    --dark-secondary: #4a4a3e;
    --muted: #9a9a8a;
    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 20px;
  }

  .payment-viewport {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .payment-content {
    max-width: 520px;
    width: 100%;
    margin: 0 auto;
    padding: 24px 20px 120px;
    position: relative;
  }

  .page-header {
    text-align: center;
    padding: 8px 0 24px;
    animation: fadeUp 0.5s ease-out;
  }
  .page-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-weight: 600;
    color: var(--dark);
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }
  .page-subtitle {
    font-size: 14px;
    color: var(--muted);
    font-weight: 400;
  }

  .order-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 20px;
    animation: fadeUp 0.5s ease-out 0.05s both;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03);
  }
  .order-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 16px;
  }
  .order-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .order-price {
    font-family: 'Playfair Display', serif;
    font-size: 36px;
    font-weight: 700;
    color: var(--dark);
    letter-spacing: -0.02em;
  }
  .order-ref {
    font-size: 14px;
    color: var(--muted);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .order-divider {
    height: 1px;
    background: var(--border-light);
    margin: 16px 0;
  }
  .order-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  .order-detail-label { color: var(--muted); }
  .order-detail-value { color: var(--dark); font-weight: 600; }
  .order-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark);
    background: var(--border-light);
    padding: 4px 12px;
    border-radius: 8px;
  }
  .order-status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--dark);
    animation: pulse 2s ease-in-out infinite;
  }

  .tabs-section {
    margin-bottom: 20px;
    animation: fadeUp 0.5s ease-out 0.1s both;
  }
  .tabs-container {
    display: flex;
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 4px;
    gap: 4px;
  }
  .tab-btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .tab-btn.active {
    background: var(--dark);
    color: var(--white);
    box-shadow: 0 4px 12px rgba(26, 26, 14, 0.2);
  }
  .tab-btn:not(.active):hover {
    background: var(--surface-hover);
    color: var(--dark-secondary);
  }

  .step-section {
    margin-bottom: 20px;
    animation: fadeUp 0.5s ease-out 0.15s both;
  }
  .step-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .step-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--dark);
    letter-spacing: -0.01em;
  }

  .qr-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03);
  }
  .qr-wrapper {
    display: inline-flex;
    padding: 16px;
    background: var(--white);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
    position: relative;
    width: 212px;
    height: 212px;
    align-items: center;
    justify-content: center;
  }
  
  .qr-helper {
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted);
    max-width: 280px;
    margin: 0 auto;
  }

  .upload-card {
    border: 1.5px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 32px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
    background: var(--white);
  }
  .upload-card:hover { border-color: var(--dark); background: var(--surface); }
  .upload-card.has-file { border-color: var(--dark); border-style: solid; background: var(--surface); }
  
  .upload-icon {
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
  }
  .upload-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--dark);
    margin-bottom: 6px;
  }
  .upload-hint {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 20px;
  }
  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--white);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .upload-btn:hover { border-color: var(--dark); background: var(--surface); }

  .file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--dark);
    margin-top: 14px;
  }

  .sticky-cta {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px 20px 34px;
    background: linear-gradient(0deg, var(--white) 80%, rgba(255,255,255,0) 100%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .sticky-cta-content {
    max-width: 520px;
    width: 100%;
  }

  .confirm-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 18px;
    border: none;
    border-radius: var(--radius-md);
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .confirm-btn.black {
    background: var(--dark);
    color: white;
    box-shadow: 0 4px 20px rgba(26, 26, 14, 0.3), inset 0 1px 0 rgba(255,255,255,0.1);
  }
  .confirm-btn.black::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    background-size: 200% 100%;
    animation: shimmer 3s ease-in-out infinite;
  }
  .confirm-btn.black:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26, 26, 14, 0.4); }
  .confirm-btn:disabled { background: var(--surface); color: var(--muted); box-shadow: none; cursor: not-allowed; }

  .security-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding-top: 12px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
  }

  .bank-info-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03);
  }
  .bank-info-header {
    padding: 14px 20px;
    background: var(--surface);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    border-bottom: 1px solid var(--border-light);
  }
  .bank-info-body { padding: 8px 20px; }
  .bank-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
  }
  .bank-row:not(:last-child) { border-bottom: 1px solid var(--border-light); }
  .bank-row-label { font-size: 13px; color: var(--muted); font-weight: 500; }
  .bank-row-value { font-size: 14px; color: var(--dark); font-weight: 600; font-variant-numeric: tabular-nums; }
  
  .copy-btn {
    background: #f0ede6;
    border: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark);
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 6px;
    transition: background 0.15s;
    text-decoration: none;
  }
  .copy-btn:hover { background: #e8e5dd; }
`;

export default function PaymentTransferClient() {
  const router = useRouter();
  const { orderId } = useParams();
  const { settings, loading: storeLoading } = usePublicStore();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qr' | 'bank'>('qr');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (orderId && typeof orderId === 'string') {
        const foundOrder = await getOrder(orderId);
        setOrder(foundOrder);
      }
      setLoading(false);
    };
    loadOrder();
  }, [orderId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File too large. Max size is 2MB.');
        return;
      }
      setReceipt(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!orderId || !receipt) {
      toast.error('Please upload a payment receipt first');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const proofUrl = await uploadPaymentProof(orderId as string, receipt);
      if (proofUrl) {
        await updatePaymentProof(orderId as string, proofUrl, 'verifying_payment' as any, 'payment_submitted');
        toast.success('Payment submitted! Redirecting...', { duration: 3000, icon: '🚀' });
        setTimeout(() => { router.push(`/order-review/${orderId}`); }, 2000);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit payment.');
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`, {
      style: { background: '#1a1a0e', color: '#ffffff', border: '1px solid #e8e5dd', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: '12px' }
    });
  };

  if (loading || storeLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#1a1a0e] w-10 h-10 mb-4" />
        <p className="text-[#9a9a8a] font-medium tracking-wide font-sans">Initializing secure payment...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#e8e5dd] max-w-sm w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="mx-auto text-red-500 w-12 h-12" />
          <h2 className="text-xl font-bold text-[#1a1a0e] tracking-wide font-sans">Order Not Found</h2>
          <button onClick={() => router.push('/')} className="w-full bg-[#1a1a0e] text-white py-3 rounded-xl font-bold tracking-wide transition-opacity hover:opacity-90">Back to Home</button>
        </div>
      </div>
    );
  }

  const canConfirm = !!receipt;

  return (
    <>
      <style>{css}</style>
      <div className="payment-viewport">
        <div className="payment-content">
          <div className="page-header">
            <h1 className="page-title">Complete Your Payment</h1>
            <p className="page-subtitle">Secure payment processing</p>
          </div>

          <div className="order-card">
            <div className="order-label">Order Summary</div>
            <div className="order-row">
              <div className="order-price">RM {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="order-ref">#{order.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="order-divider" />
            <div className="order-detail-row">
              <span className="order-detail-label">Status</span>
              <span className="order-status">
                <span className="order-status-dot" />
                Awaiting Payment
              </span>
            </div>
          </div>

          <div className="tabs-section">
            <div className="tabs-container">
              <button className={`tab-btn ${activeTab === 'qr' ? "active" : ""}`} onClick={() => setActiveTab('qr')}>DuitNow QR</button>
              <button className={`tab-btn ${activeTab === 'bank' ? "active" : ""}`} onClick={() => setActiveTab('bank')}>Bank Transfer</button>
            </div>
          </div>

          <div className="step-section">
            <div className="step-header">
              <StepBadge number="1" active done={false} />
              <span className="step-title">{activeTab === 'qr' ? "Scan QR Code" : "Transfer Details"}</span>
            </div>
            {activeTab === 'qr' ? (
              <div className="qr-card">
                <div className="qr-wrapper">
                  <img src={settings?.qr_code_url || "https://placeholder.com/200x200?text=DuitNow+QR"} alt="DuitNow QR" className="w-48 h-48 object-contain" />
                </div>
                <p className="qr-helper">Scan this QR code using your banking app to complete the payment.</p>
              </div>
            ) : (
              <div className="bank-info-card">
                <div className="bank-info-header">Bank Account Details</div>
                <div className="bank-info-body">
                  <div className="bank-row">
                    <span className="bank-row-label">Bank</span>
                    <span className="bank-row-value">{settings?.bank_name || 'Maybank'}</span>
                  </div>
                  <div className="bank-row">
                    <span className="bank-row-label">Account No.</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="bank-row-value">{settings?.bank_account_number || '1234567890'}</span>
                      <button className="copy-btn" onClick={() => copyToClipboard(settings?.bank_account_number || '1234567890', 'Account Number')}>Copy</button>
                    </div>
                  </div>
                  <div className="bank-row">
                    <span className="bank-row-label">Account Name</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="bank-row-value">{settings?.bank_holder_name || 'Golden Isle Trading'}</span>
                      <button className="copy-btn" onClick={() => copyToClipboard(settings?.bank_holder_name || 'Golden Isle Trading', 'Account Name')}>Copy</button>
                    </div>
                  </div>
                  <div className="bank-row">
                    <span className="bank-row-label">Amount</span>
                    <span className="bank-row-value">RM {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bank-row">
                    <span className="bank-row-label">Reference</span>
                    <span className="bank-row-value">#{order.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="step-section">
            <div className="step-header">
              <StepBadge number="2" active={false} done={!!receipt} />
              <span className="step-title">Upload Payment Receipt</span>
            </div>
            <div className={`upload-card ${receipt ? "has-file" : ""}`} onClick={() => !isSubmitting && fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              {!receipt ? (
                <>
                  <div className="upload-icon">{Icons.upload}</div>
                  <div className="upload-title">Upload Payment Receipt</div>
                  <div className="upload-hint">Max 2MB file (PNG, JPG)</div>
                  <button className="upload-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>{Icons.receipt} Upload Receipt</button>
                </>
              ) : (
                <>
                  <div className="upload-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                  <div className="upload-title" style={{ color: "#1a1a0e" }}>Receipt Uploaded</div>
                  <div className="file-info">{Icons.image}{receipt.name}</div>
                  <button className="upload-btn" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); setReceipt(null); }}>Replace File</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky-cta">
          <div className="sticky-cta-content">
            <button className={`confirm-btn ${canConfirm ? "black" : ""}`} disabled={!canConfirm || isSubmitting} onClick={handleSubmitPayment}>
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : Icons.lock}
              {isSubmitting ? 'Processing...' : 'Confirm Payment'}
            </button>
            <div className="security-footer">{Icons.shield}<span>Secured & encrypted payment</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
