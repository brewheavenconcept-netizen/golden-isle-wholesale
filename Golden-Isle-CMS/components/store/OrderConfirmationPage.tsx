'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    CheckCircle,
    ShoppingBag,
    AlertCircle,
    Loader2,
    Edit,
    ArrowLeft,
    Hourglass,
    Download,
    MessageCircle,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { getOrder, uploadPaymentProof, updatePaymentProof } from '@/lib/storage';
import { usePublicStore } from '@/hooks/usePublicStore';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    const { settings, loading: storeLoading } = usePublicStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

    // MANTAP BACKDOOR STATE
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [showDevModal, setShowDevModal] = useState(false);
    const [devCode, setDevCode] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const handleSecretTrigger = () => {
        const now = Date.now();
        if (now - lastClickTime > 3000) {
            setClickCount(1);
        } else {
            const newCount = clickCount + 1;
            if (newCount >= 5) {
                setShowDevModal(true);
                setClickCount(0);
            } else {
                setClickCount(newCount);
            }
        }
        setLastClickTime(now);
    };

    const handleAuthorize = async () => {
        if (devCode === 'mantap') {
            setShowDevModal(false);
            setDevCode('');
            const loadingToast = toast.loading('Authorizing Developer Access...', {
                style: { background: '#0a0a0a', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
            });
            setTimeout(() => {
                toast.dismiss(loadingToast);
                router.push(`/fpx-gateway?orderId=${orderId}&amount=${order.total}`);
            }, 1000);
        } else {
            setIsShaking(true);
            toast.error('ACCESS DENIED', {
                style: { background: '#7f1d1d', color: '#fecaca' }
            });
        }
    };

    useEffect(() => {
        const fetchWhatsapp = async () => {
            const { data } = await supabase
                .from('store_settings')
                .select('whatsapp_number')
                .eq('store_id', '00000000-0000-0000-0000-000000000000')
                .single();
            if (data?.whatsapp_number) {
                setWhatsappNumber(data.whatsapp_number);
            }
        };
        fetchWhatsapp();
    }, []);


    useEffect(() => {
        const loadOrder = async () => {
            if (orderId) {
                const foundOrder = await getOrder(orderId);
                setOrder(foundOrder);
            }
            setLoading(false);
        };
        loadOrder();
    }, [orderId]);


    const handleFPXCheckout = () => {
        if (!orderId) {
            toast.error('Order ID is missing.');
            return;
        }

        // Transition user to the Simulated Bank Gateway
        toast.loading('Redirecting to secure FPX gateway...', { duration: 1500 });
        setTimeout(() => {
            router.push(`/fpx-gateway?orderId=${orderId}`);
        }, 1500);
    };

    if (loading || storeLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10 mb-4" />
                <p className="text-gray-500 font-medium tracking-wide">Loading your order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 max-w-sm w-full text-center space-y-4 shadow-sm">
                    <AlertCircle className="mx-auto text-red-500 w-12 h-12" />
                    <h2 className="text-xl font-bold text-gray-900 tracking-wide">Order Not Found</h2>
                    <p className="text-gray-500 tracking-wide">Could not retrieve order details for ID: {orderId}</p>
                    <button onClick={() => router.push('/')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold tracking-wide">Back to Home</button>
                </div>
            </div>
        );
    }

    const currentStatus = order.payment_status || 'pending_payment';

    const waMessage = `Hi Golden Isle Wholesale! 🍺
I have just placed an order:

🪪 Order ID: ${order.id}
👤 Name: ${order.customer_name}
📞 Phone: ${order.customer_phone}
📍 Address: ${order.delivery_address}
🛒 Items:
${order.items?.map((i: any) => `- ${i.product?.name || i.name} x${i.qty || i.quantity}`).join('\n') || ''}
💰 Total: RM ${order.total ? Number(order.total).toFixed(2) : '0.00'}
🔗 Track Order: https://goldenisle-wholesale.vercel.app/order-review/${order.id}

Please confirm my order. Thank you!`;

    const encodedMessage = waMessage
        .split('\n')
        .map(line => encodeURIComponent(line))
        .join('%0A');

    const waLink = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodedMessage}`
        : null;

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#F8F9FC] text-slate-900 antialiased flex flex-col font-sans">
            
            {/* Google Inter Font Injected */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                .font-sans {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                }
            `}</style>

            {/* Stripe Iconic Diagonal Mesh Gradient Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div 
                    className="absolute top-[25%] -left-[10%] w-[120%] h-[40%] origin-top-left -rotate-[6deg] opacity-[0.85] blur-[1px] transition-all"
                    style={{
                        background: 'linear-gradient(110deg, #F3F7FF 10%, #E8EFFF 30%, #E9D3FF 50%, #FFD6E8 75%, #FFF0D4 95%)'
                    }}
                />
            </div>

            {/* Header Panel */}
            <header className="px-6 py-4 flex items-center justify-between border-b relative z-20 border-slate-200/50 bg-white/70 backdrop-blur-md">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => router.push('/')}
                        className="flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Store</span>
                    </button>
                </div>
                
                {/* Brand Logo & Title */}
                <div className="flex items-center space-x-2" onClick={handleSecretTrigger}>
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-800 cursor-pointer">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
                        <path d="M50 20V80M20 50H80" stroke="currentColor" strokeWidth="0.5" />
                        <circle cx="50" cy="50" r="8" fill="currentColor" className="opacity-80" />
                    </svg>
                    <span className="font-sans text-[11px] tracking-[0.2em] font-extrabold uppercase opacity-90 text-slate-700">
                        GOLDEN AI RETAILER
                    </span>
                </div>

                <div className="w-16"></div> {/* spacer */}
            </header>

            {/* Main Grid Layout */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* ================= COLUMN 1: Order Details & Products ================= */}
                <section className="lg:col-span-5 flex flex-col gap-6">
                    
                    {/* Amount Paid / Due Panel */}
                    <div className="p-8 rounded-[16px] border bg-white border-slate-200/60 shadow-[0_12px_32px_rgba(0,0,0,0.03)] relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] tracking-[0.15em] font-bold text-slate-400 block mb-1">
                                    {currentStatus === 'paid' ? 'TOTAL PAID' : 'AMOUNT DUE'}
                                </span>
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tight tabular-nums text-slate-900 flex items-baseline">
                                    <span className="text-xl font-normal text-slate-400 mr-1.5">RM</span>
                                    {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h1>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-slate-105 text-slate-500">
                                    REF-{order.id.slice(-6).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Status badge in amount panel */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center">
                            {currentStatus === 'paid' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    Payment Confirmed
                                </span>
                            ) : currentStatus === 'verifying_payment' || currentStatus === 'pending_verification' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    Verifying Transfer
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                                    Awaiting Payment
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className="p-6 rounded-[16px] border bg-white border-slate-200/60 shadow-[0_12px_32px_rgba(0,0,0,0.02)]">
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                            02 / CUSTOMER DETAILS
                        </h3>
                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase text-[9px]">Full Name</span>
                                    <p className="font-semibold text-slate-800">{order.customer_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase text-[9px]">Phone</span>
                                    <p className="font-semibold text-slate-800">{order.customer_phone || order.phone}</p>
                                </div>
                            </div>
                            <div className="space-y-1 pt-3 border-t border-slate-100">
                                <span className="text-slate-400 font-bold uppercase text-[9px]">Delivery Address</span>
                                <p className="font-medium text-slate-700 leading-relaxed">{order.delivery_address || order.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Purchased Items Card */}
                    <div className="p-6 rounded-[16px] border bg-white border-slate-200/60 shadow-[0_12px_32px_rgba(0,0,0,0.02)]">
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                            03 / PRODUCTS PURCHASED
                        </h3>
                        <div className="space-y-3">
                            {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="w-10 h-10 bg-white border border-slate-200/40 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xs font-mono font-bold text-slate-400">
                                        {item.product?.images?.[0] || item.product?.image_url ? (
                                            <img src={item.product?.images?.[0] || item.product?.image_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            "BEER"
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-xs text-slate-800 truncate block max-w-[150px]">{item.product?.name || item.name}</span>
                                            <span className="font-mono font-bold text-xs text-slate-700">
                                                RM {Number(item.product?.price || item.price || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[10px] text-slate-400">Qty: {item.qty || item.quantity}</span>
                                            <span className="text-[10px] font-bold text-[#635bff] bg-[#635bff]/10 px-1.5 py-0.5 rounded">
                                                RM {(Number(item.product?.price || item.price || 0) * (item.qty || item.quantity)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </section>

                {/* ================= COLUMN 2: Status Action Center ================= */}
                <section className="lg:col-span-7 rounded-[16px] border bg-white border-slate-200/80 shadow-[0_20px_48px_rgba(0,0,0,0.04)] p-8 lg:p-10">
                    <div className="max-w-md mx-auto">
                        <AnimatePresence mode="wait">
                            {/* STATE 3: PAID */}
                            {currentStatus === 'paid' && (
                                <motion.div
                                    key="paid"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6 text-center"
                                >
                                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 text-left mb-6">
                                        01 / TRANSACTION STATUS
                                    </h2>
                                    
                                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Payment Completed</h3>
                                        <p className="text-xs text-slate-500 px-6 leading-relaxed">
                                            Your transaction was successfully processed. A copy of the receipt has been emailed to you.
                                        </p>
                                    </div>

                                    {/* Bento Receipt Box */}
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-left divide-y divide-slate-200/60 my-6">
                                        <div className="pb-2.5 flex justify-between">
                                            <span className="text-slate-500">Merchant</span>
                                            <span className="font-semibold text-slate-800">GOLDEN AI RETAILER</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-slate-500">Payment Mode</span>
                                            <span className="font-semibold text-slate-800">{order.payment_method || 'Online Transfer'}</span>
                                        </div>
                                        <div className="pt-2.5 flex justify-between">
                                            <span className="text-slate-500">Total Invoiced</span>
                                            <span className="font-mono font-bold text-emerald-600">RM {Number(order.total).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => window.open(`/api/invoice/${order.id}`, '_blank')}
                                            className="w-full py-3.5 px-6 rounded-md text-sm font-semibold tracking-tight text-white transition-all bg-[#635bff] hover:bg-[#544ee0] shadow-[0_2px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(99,91,255,0.25)] flex items-center justify-center gap-2"
                                        >
                                            <Download size={16} />
                                            <span>Download Invoice</span>
                                        </button>

                                        <button
                                            onClick={() => router.push('/')}
                                            className="w-full py-3 px-6 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs tracking-widest uppercase rounded-lg border border-slate-200 transition-all shadow-sm"
                                        >
                                            Back to Store
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STATE 2: VERIFYING */}
                            {(currentStatus === 'verifying_payment' || currentStatus === 'pending_verification') && (
                                <motion.div
                                    key="verifying"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6 text-center"
                                >
                                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 text-left mb-6">
                                        01 / TRANSACTION STATUS
                                    </h2>

                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto relative mb-4">
                                        <Hourglass className="text-[#c8a84b] w-8 h-8 animate-pulse" />
                                        <div className="absolute inset-0 border-[3px] border-amber-50 rounded-full animate-spin border-t-[#c8a84b]" style={{ animationDuration: '2.5s' }} />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Payment Verifying</h3>
                                        <p className="text-xs text-slate-500 px-6 leading-relaxed">
                                            Our finance team is currently validating your transfer. You will receive a notification email as soon as it's approved.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-left divide-y divide-slate-200/60 my-6">
                                        <div className="pb-2.5 flex justify-between">
                                            <span className="text-slate-500">Verification Status</span>
                                            <span className="font-semibold text-amber-600 flex items-center gap-1.5 animate-pulse">
                                                Pending Approval
                                            </span>
                                        </div>
                                        <div className="pt-2.5 flex justify-between">
                                            <span className="text-slate-500">Amount Sent</span>
                                            <span className="font-mono font-bold text-slate-800">RM {Number(order.total).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => router.push('/')}
                                        className="w-full py-3.5 px-6 rounded-md text-sm font-semibold tracking-tight text-white transition-all bg-[#635bff] hover:bg-[#544ee0] shadow-sm flex items-center justify-center"
                                    >
                                        Back to Store
                                    </button>
                                </motion.div>
                            )}

                            {/* STATE 1: UNPAID / PENDING */}
                            {(currentStatus === 'pending_payment' || currentStatus === 'unpaid') && (
                                <motion.div
                                    key="unpaid"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-6">
                                        01 / PAYMENT REQUIRED
                                    </h2>

                                    <div className="text-center space-y-2 mb-6">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Complete Payment</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Securely select your preferred payment mode below to settle the quotation.
                                        </p>
                                    </div>

                                    {/* Payment Methods Layout */}
                                    <div className="space-y-4">
                                        {/* DuitNow Transfer */}
                                        <div className="p-5 bg-white rounded-2xl border-2 border-slate-900 flex flex-col gap-3 relative shadow-sm">
                                            <div className="absolute -top-3 left-4 z-10 flex items-center gap-1 px-3 py-0.5 bg-[#1a1a1a] text-white rounded-full text-[8px] font-bold tracking-widest uppercase">
                                                ★ POPULAR
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800">Pay via Bank Transfer</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">DuitNow QR or manual bank transfer</p>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/payment/transfer/${orderId}`)}
                                                    className="py-2 px-4 bg-[#1a1a1a] text-white rounded-lg text-xs font-bold transition hover:bg-slate-800"
                                                >
                                                    Transfer
                                                </button>
                                            </div>
                                        </div>

                                        {/* Stripe card */}
                                        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 flex justify-between items-center shadow-sm">
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-805">Pay via Stripe</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Instant Visa, Mastercard, AMEX</p>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/payment/stripe/${orderId}`)}
                                                className="py-2 px-4 bg-[#635bff] text-white rounded-lg text-xs font-bold transition hover:bg-[#544ee0]"
                                            >
                                                Pay Card
                                            </button>
                                        </div>

                                        {/* WhatsApp Support */}
                                        {waLink && (
                                            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-850">WhatsApp Invoice</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Confirm order directly with sales agent</p>
                                                </div>
                                                <a
                                                    href={waLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2 px-4 bg-[#25D366] text-white rounded-lg text-xs font-bold transition hover:bg-emerald-600 text-center"
                                                >
                                                    Chat Sales
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </section>

            </main>

            {/* Developer Backdoor Modal */}
            <AnimatePresence>
                {showDevModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{
                                scale: 1,
                                opacity: 1,
                                x: isShaking ? [0, -10, 10, -10, 10, 0] : 0
                            }}
                            transition={{
                                scale: { duration: 0.3 },
                                opacity: { duration: 0.3 },
                                x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
                            }}
                            onAnimationComplete={() => setIsShaking(false)}
                            className="bg-[#0a0a0a] border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)] rounded-2xl max-w-sm w-full p-8 space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock className="text-amber-500 w-6 h-6" />
                                </div>
                                <h2 className="text-amber-500 font-bold tracking-[0.2em] text-sm uppercase">System Maintenance</h2>
                                <p className="text-gray-500 text-xs tracking-wide">Secure authorization required for gateway access.</p>
                            </div>
                            <div className="space-y-4">
                                <input
                                    type="password"
                                    value={devCode}
                                    onChange={(e) => setDevCode(e.target.value)}
                                    placeholder="Enter Access Code"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-center focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAuthorize();
                                    }}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDevModal(false);
                                            setDevCode('');
                                            setClickCount(0);
                                        }}
                                        className="py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold uppercase tracking-wider"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={handleAuthorize}
                                        className="py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        Authorize
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

const ShieldIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const LightningIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const CheckIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

const WhatsappIcon = ({ className = "" }: { className?: string }) => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
        <circle cx="12" cy="12" r="12" fill="#25D366"/>
        <path fill="white" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

const FpxIcon = ({ className = "" }: { className?: string }) => (
    <div style={{background: 'linear-gradient(135deg, #1a73e8, #0d47a1)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'}} className={`shrink-0 ${className}`}>
      <span style={{color: 'white', fontWeight: 700, fontSize: 12}}>FPX</span>
    </div>
);
