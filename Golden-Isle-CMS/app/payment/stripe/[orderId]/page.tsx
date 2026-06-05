'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, Lock, CreditCard, CheckCircle2, AlertCircle, 
  Sparkles, X, ChevronDown, Moon, Sun, Check, ExternalLink, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrder, updateOrder } from '@/lib/storage';
import toast from 'react-hot-toast';

// ── Types ──
interface OrderDetails {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{
    product: {
      id: string;
      name: string;
      price: number;
      images: string[];
    };
    qty: number;
  }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
}

interface ItemState {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  badge: string;
  image?: string;
}

// ── Confetti Particle Component for Checkout Success ──
function ConfettiEffect() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; color: string; delay: number; duration: number; angle: number }>>([]);
  
  useEffect(() => {
    const colors = ['#635bff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    const tempParticles = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.5,
      duration: Math.random() * 2.5 + 2,
      angle: Math.random() * 360
    }));
    setParticles(tempParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: `${p.y}vh`, x: `${p.x}vw`, rotate: p.angle, opacity: 1 }}
          animate={{ 
            y: '110vh', 
            x: `${p.x + (Math.sin(p.id) * 12)}vw`,
            rotate: p.angle + 360,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'linear',
            repeat: 0
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 0.6 : 1),
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.7 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// ── Icons ──
const Icons = {
  ChevronLeft,
  Lock,
  CreditCard,
  CheckCircle: CheckCircle2,
  Sparkles,
  ChevronDown,
  JapanCrest: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
      <path d="M50 20V80M20 50H80" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="8" fill="currentColor" className="opacity-80" />
    </svg>
  )
};

export default function StripeGatewayPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  // ── States ──
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Configurator items state (loaded from order)
  const [items, setItems] = useState<ItemState[]>([]);

  // Checkout inputs
  const [email, setEmail] = useState("jiangeddy3@gmail.com");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");
  const [cardName, setCardName] = useState("Bobby Lim");
  const [country, setCountry] = useState("Malaysia MY");
  const [postalCode, setPostalCode] = useState("88000");

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [darkMode, setDarkMode] = useState(false); // Default to Light Mode!
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<'generic' | 'visa' | 'mastercard' | 'amex'>('generic');

  const subtotal = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const deliveryFee = 0.00;
  const totalDue = subtotal + deliveryFee;

  // ── Load Order Data ──
  useEffect(() => {
    const fetchOrder = async () => {
      if (orderId) {
        try {
          const foundOrder = await getOrder(orderId);
          if (foundOrder) {
            setOrder(foundOrder as any);
            setEmail('jiangeddy3@gmail.com');
            setCardName(foundOrder.customer_name || 'Bobby Lim');
            
            const mappedItems: ItemState[] = foundOrder.items.map((item: any, index: number) => ({
              id: item.product.id || String(index),
              name: item.product.name,
              description: "Premium craft selection from Golden Isle Store",
              price: item.product.price,
              quantity: item.qty,
              badge: index === 0 ? "Best Seller" : "Add-on",
              image: item.product.images?.[0]
            }));
            setItems(mappedItems);
          } else {
            toast.error('Order not found');
          }
        } catch (error) {
          console.error('Failed to load order:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchOrder();
  }, [orderId]);

  // ── Quantity Adjuster ──
  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  // ── Card Input Change Handler ──
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    const cleanNumber = formatted.slice(0, 19);
    setCardNumber(cleanNumber);

    const digitOnly = cleanNumber.replace(/\s+/g, '');
    if (digitOnly.startsWith('4')) {
      setCardBrand('visa');
    } else if (/^(5[1-5]|2[2-7])/.test(digitOnly)) {
      setCardBrand('mastercard');
    } else if (/^(34|37)/.test(digitOnly)) {
      setCardBrand('amex');
    } else {
      setCardBrand('generic');
    }
  };

  // ── Card Expiry Date Handler ──
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardExpiry(value.slice(0, 5));
  };

  // ── CVC Change Handler ──
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCardCVC(value.slice(0, cardBrand === 'amex' ? 4 : 3));
  };

  // ── Submit Checkout Mockup Payment ──
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalDue === 0) {
      setPaymentError("Please add at least 1 item to proceed with checkout.");
      return;
    }
    
    setIsProcessing(true);
    setPaymentError("");

    setTimeout(async () => {
      setIsProcessing(false);
      if (cardNumber.includes("1278")) {
        setPaymentError("Card Declined: Insufficient funds (Simulated Code 1278).");
        toast.error("Transaction declined.");
      } else {
        setPaymentSuccess(true);
        toast.success("Payment authorized successfully!");
        
        try {
          await updateOrder(
            orderId, 
            { 
              status: 'confirmed', 
              payment_status: 'paid',
              payment_method: 'Stripe Mockup Gateway'
            }, 
            '00000000-0000-0000-0000-000000000000'
          );
        } catch (err) {
          console.warn('DB update failed, utilizing memory fallback:', err);
        }

        // Trigger automatic paid invoice email via Resend
        try {
          await fetch(`/api/invoice/${orderId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerEmail: email,
              customerName: cardName || order?.customer_name || 'Customer',
              items: items.map((item) => ({
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                priceNum: item.price
              })),
              taxRate: 0.08
            })
          });
          console.log('✅ Automatic Resend invoice receipt sent.');
        } catch (emailErr) {
          console.warn('⚠️ Failed to send automatic email receipt:', emailErr);
        }
      }
    }, 2400);
  };

  const resetFlow = () => {
    setPaymentSuccess(false);
    setPaymentError("");
    setCardNumber("");
    setCardExpiry("");
    setCardCVC("");
    router.push(`/order-confirmation?orderId=${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#635bff] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Initializing secure checkout session...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <ShieldAlert className="text-rose-500 w-12 h-12 mb-4" />
        <h1 className="text-lg font-bold text-slate-800">Order Session Not Found</h1>
        <p className="text-slate-500 text-xs mt-2 max-w-xs">We could not locate this order inside our sandbox registry.</p>
        <button onClick={() => router.push('/')} className="mt-6 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition">
          Return to Store
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
      darkMode ? 'dark bg-[#0A0D14] text-slate-100' : 'bg-[#F8F9FC] text-slate-900'
    } antialiased flex flex-col font-sans`}>
      
      {/* Google Inter Font & Custom Scrollbar Style Injected */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .font-sans {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
      `}</style>

      {/* Stripe Iconic Diagonal Mesh Gradient Sash Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute top-[30%] -left-[10%] w-[120%] h-[40%] origin-top-left -rotate-[6deg] opacity-[0.85] blur-[1px] transition-all"
          style={{
            background: 'linear-gradient(110deg, #F3F7FF 10%, #E8EFFF 30%, #E9D3FF 50%, #FFD6E8 75%, #FFF0D4 95%)'
          }}
        />
        {darkMode && (
          <div className="absolute inset-0 bg-[#0A0D14]/90 backdrop-blur-sm z-1" />
        )}
      </div>

      {/* Header Panel */}
      <header className={`px-6 py-4 flex items-center justify-between border-b relative z-20 ${
        darkMode ? 'border-white/5 bg-[#0a0d14]/80 backdrop-blur-md' : 'border-slate-200/50 bg-white/70 backdrop-blur-md'
      }`}>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push(`/payment/selection/${orderId}`)}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
              darkMode 
                ? 'bg-white/5 text-slate-355 hover:bg-white/10 hover:text-white border border-white/5' 
                : 'bg-white text-slate-655 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2">
          <Icons.JapanCrest className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-slate-805'}`} />
          <span className="font-sans text-[11px] tracking-[0.2em] font-extrabold uppercase opacity-90 text-slate-600 dark:text-slate-400">
            GOLDEN AI RETAILER
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-xl border transition-all ${
              darkMode ? 'bg-white/5 border-white/10 text-yellow-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Theme Switcher"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================= COLUMN 1: Cart Configurator & Invoice ================= */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Unified Order Panel */}
          <div className={`rounded-[16px] border overflow-hidden transition-all duration-300 divide-y ${
            darkMode 
              ? 'bg-[#131926] border-white/5 divide-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
              : 'bg-white border-slate-200/60 divide-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.03)]'
          }`}>
            
            {/* Total Amount Panel */}
            <div className="p-8 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-[0.15em] font-bold text-slate-400 block mb-1">
                    AMOUNT DUE
                  </span>
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tight tabular-nums text-slate-905 dark:text-white flex items-baseline">
                    <span className="text-xl font-normal text-slate-400 mr-1.5">RM</span>
                    {totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-slate-105 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                    REF-{orderId.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Configurator Column */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  01 / CONFIGURATOR
                </h3>
                <span className="text-[9px] font-bold text-[#635bff] bg-[#635bff]/10 px-2 py-0.5 rounded-full">
                  Adjust Units
                </span>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-[12px] border transition-all duration-300 relative overflow-hidden ${
                      item.quantity > 0 
                        ? (darkMode ? 'bg-[#1a202e] border-[#635bff]/30' : 'bg-white border-[#635bff]/20 shadow-sm') 
                        : (darkMode ? 'bg-[#131926]/50 border-white/5' : 'bg-slate-55/50 border-slate-200/60')
                    }`}
                  >
                    <div className="flex gap-3 justify-between items-start mb-3">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-200/40 flex items-center justify-center text-xs font-mono font-bold text-slate-400">
                          {item.image ? (
                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            "BEER"
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-white tracking-tight">{item.name}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                              item.badge === "Best Seller" ? 'bg-[#635bff]/10 text-[#635bff]' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {item.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-550 block mt-0.5 max-w-[180px] truncate">
                            {item.description}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-xs text-slate-705 dark:text-slate-250">
                          RM {item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity adjustments */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400">Units:</span>
                      <div className={`flex items-center p-0.5 rounded-lg border ${
                        darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-100/70 border-slate-200'
                      }`}>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className={`p-1 px-2.5 rounded transition-all text-xs font-extrabold ${
                            item.quantity === 0 
                              ? 'opacity-30 cursor-not-allowed' 
                              : (darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-800 shadow-sm')
                          }`}
                          disabled={item.quantity === 0}
                        >
                          -
                        </button>
                        
                        <span className="text-xs font-mono font-bold px-3 min-w-[28px] text-center">
                          {item.quantity}
                        </span>

                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className={`p-1 px-2.5 rounded transition-all text-xs font-extrabold ${
                            darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-805 shadow-sm'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt invoice details */}
            <div className="p-6 relative">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                02 / ORDER SUMMARY
              </h4>
              
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between text-slate-505">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100 font-medium">
                    RM {subtotal.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-slate-505 items-center gap-2">
                  <span className="whitespace-nowrap truncate text-[11px]">Fulfillment (Langkawi/Labuan/KL)</span>
                  <span className="text-emerald-605 font-mono font-bold tracking-wider text-[10px] shrink-0">
                    FREE
                  </span>
                </div>

                <div className="border-t border-slate-150 dark:border-white/5 pt-3.5 flex justify-between text-sm">
                  <span className="font-semibold text-slate-705 dark:text-slate-200">Total due</span>
                  <span className="font-mono font-bold text-lg text-[#635bff]">
                    RM {totalDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ================= COLUMN 2: Checkout Form & Stripe Panel ================= */}
        <section className={`lg:col-span-7 rounded-[16px] border overflow-hidden p-8 lg:p-10 transition-all duration-300 ${
          darkMode 
            ? 'bg-[#131926] border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-md' 
            : 'bg-white border-slate-200/80 shadow-[0_20px_48px_rgba(0,0,0,0.04)]'
        }`}>
          
          <div className="max-w-md mx-auto">
            
            {/* Header Form Detail */}
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">Pay with card</h2>
            </div>

            {/* Error System Warning */}
            {paymentError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50/10 border border-red-550/20 text-red-655 text-xs flex items-start space-x-3">
                <span className="text-base leading-none">⚠️</span>
                <div>
                  <p className="font-extrabold uppercase tracking-wider text-[9px]">Card Decline Alert</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-medium">{paymentError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-5">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-655 dark:text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-3 py-2.5 text-[13px] font-medium rounded-md border transition-all duration-150 ${
                    darkMode 
                      ? 'bg-[#0f131c] text-white border-white/10 placeholder-slate-500' 
                      : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'
                  } ${
                    focusedField === "email" 
                      ? 'border-[#635bff] ring-2 ring-[#635bff]/15 shadow-sm' 
                      : 'shadow-sm'
                  }`}
                  placeholder="customer@enterprise.com"
                />
              </div>

              {/* Card details combined layout (Stripe Style) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-655 dark:text-slate-400">
                  Card information
                </label>
                
                <div className={`rounded-md border overflow-hidden divide-y shadow-sm transition-all duration-150 ${
                  darkMode 
                    ? 'bg-[#0f131c] border-white/10 divide-white/5' 
                    : 'bg-white border-slate-200 divide-slate-200'
                } ${
                  focusedField === "card" 
                    ? 'border-[#635bff] ring-2 ring-[#635bff]/15' 
                    : ''
                }`}>
                  
                  {/* Row 1: Card Number */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-455">
                      <Icons.CreditCard className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="1234 5678 9101 1121"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      onFocus={() => setFocusedField("card")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-10 pr-12 py-3 text-[13px] font-medium bg-transparent border-none focus:outline-none focus:ring-0 ${
                        darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    
                    {/* Embedded Card Brand Icon */}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest text-[#635bff] bg-[#635bff]/10 px-2 py-0.5 rounded">
                      {cardBrand === 'generic' ? 'CARD' : cardBrand.toUpperCase()}
                    </span>
                  </div>

                  {/* Row 2: Split Expiry & CVC */}
                  <div className={`grid grid-cols-2 divide-x ${darkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="MM / YY"
                        value={cardExpiry}
                        maxLength={5}
                        onChange={handleExpiryChange}
                        onFocus={() => setFocusedField("card")}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full px-3 py-3 text-[13px] font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-center ${
                          darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                    
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="CVC"
                        maxLength={4}
                        value={cardCVC}
                        onChange={handleCvcChange}
                        onFocus={() => setFocusedField("card")}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-3 pr-8 py-3 text-[13px] font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-center font-mono ${
                          darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400/80">
                        <Icons.Lock className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Cardholder Identity */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-655 dark:text-slate-400">
                  Name on card
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-3 py-2.5 text-[13px] font-medium rounded-md border transition-all duration-150 ${
                    darkMode 
                      ? 'bg-[#0f131c] text-white border-white/10 placeholder-slate-500' 
                      : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'
                  } ${
                    focusedField === "name" 
                      ? 'border-[#635bff] ring-2 ring-[#635bff]/15 shadow-sm' 
                      : 'shadow-sm'
                  }`}
                  placeholder="Jane Wong"
                />
              </div>

              {/* Billing Location details */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-655 dark:text-slate-400">
                  Billing address
                </label>
                
                <div className={`rounded-md border overflow-hidden divide-y shadow-sm transition-all duration-150 ${
                  darkMode 
                    ? 'bg-[#0f131c] border-white/10 divide-white/5' 
                    : 'bg-white border-slate-200 divide-slate-200'
                } ${
                  focusedField === "address" 
                    ? 'border-[#635bff] ring-2 ring-[#635bff]/15' 
                    : ''
                }`}>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      onFocus={() => setFocusedField("address")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-3 py-2.5 text-[13px] font-medium bg-transparent border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer pr-10 ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      <option value="Malaysia MY" className="text-slate-900 bg-white">Malaysia (MY)</option>
                      <option value="Singapore SG" className="text-slate-900 bg-white">Singapore (SG)</option>
                      <option value="Japan JP" className="text-slate-900 bg-white">Japan (JP)</option>
                      <option value="United States US" className="text-slate-900 bg-white">United States (US)</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Icons.ChevronDown className="w-4 h-4" />
                    </span>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Postal Code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      onFocus={() => setFocusedField("address")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-3 py-2.5 text-[13px] font-medium bg-transparent border-none focus:outline-none focus:ring-0 ${
                        darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Pay Button (Stripe Purple #635BFF) */}
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-3.5 px-6 rounded-md text-sm font-semibold tracking-tight text-white transition-all duration-150 active:scale-[0.99] flex items-center justify-center ${
                  isProcessing 
                    ? 'bg-slate-800 text-slate-450 cursor-not-allowed border border-white/5' 
                    : 'bg-[#635bff] hover:bg-[#544ee0] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(99,91,255,0.25)]'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span className="flex items-center space-x-1.5">
                    <Icons.Lock className="w-3.5 h-3.5" />
                    <span>Pay RM {totalDue.toFixed(2)}</span>
                  </span>
                )}
              </button>

              <p className="text-[10px] text-slate-455 leading-relaxed text-center max-w-sm mx-auto">
                By confirming your payment, you authorize the gateway transaction in accordance with Stripe terms and Golden AI SLA policies.
              </p>
            </form>

          </div>
        </section>

      </main>

      {/* Success Transaction Overlay Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200/80 rounded-[20px] max-w-md w-full p-8 shadow-3xl text-center relative overflow-hidden">
            
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[50px]"></div>
            </div>

            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icons.CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
              TRANSACTION CONFIRMED
            </span>

            <h3 className="text-2xl font-black text-slate-900 mt-4 tracking-tight">
              Payment Completed
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 px-4 leading-relaxed">
              Your transaction of <strong className="text-slate-800 font-mono">RM {totalDue.toFixed(2)}</strong> was successfully authorized and completed.
            </p>

            {/* Invoiced Receipt inside Modal */}
            <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-left divide-y divide-slate-200/60">
              <div className="pb-2.5 flex justify-between">
                <span className="text-slate-500">Account</span>
                <span className="font-semibold text-slate-800">{email}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Merchant</span>
                <span className="font-semibold text-slate-800">GOLDEN AI RETAILER</span>
              </div>
              <div className="pt-2.5 flex justify-between">
                <span className="text-slate-500">Total Invoiced</span>
                <span className="font-mono font-bold text-emerald-600">RM {totalDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Back to store complete setup button */}
            <button
              onClick={resetFlow}
              className="w-full py-3 px-6 bg-[#635bff] hover:bg-[#544ee0] text-white font-bold text-xs tracking-widest uppercase rounded-lg transition-all shadow-sm"
            >
              COMPLETE SETUP
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
