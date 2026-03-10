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
💰 Total: RM ${order.total_amount || (order.total ? Number(order.total).toFixed(2) : '0.00')}
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
        <div className="min-h-screen bg-white py-12 px-4 font-sans text-gray-900">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-xl mx-auto space-y-8 tracking-wide"
            >
                {/* 1. Success Header & Summary Card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="bg-white p-8 text-center border-b border-gray-100 relative">
                        <CheckCircle
                            className="mx-auto w-16 h-16 mb-4 text-emerald-500 cursor-pointer hover:scale-105 transition-transform"
                            onClick={handleSecretTrigger}
                        />
                        <h1 className="text-3xl font-light tracking-tight text-gray-900">Order Confirmed</h1>
                        <p className="text-gray-500 font-medium mt-2 text-sm uppercase tracking-widest">Order #{order.id.slice(0, 8)}</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800 tracking-wide">Review Information</h2>
                            {currentStatus === 'pending_payment' || currentStatus === 'unpaid' ? (
                                <button
                                    onClick={() => router.push('/checkout')}
                                    className="text-gray-500 font-medium text-sm flex items-center gap-1 hover:text-gray-900 transition-colors"
                                >
                                    <Edit size={14} /> Edit
                                </button>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-2xl text-sm">
                            <div className="space-y-1">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Full Name</p>
                                <p className="font-medium text-gray-900">{order.customer_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Phone Number</p>
                                <p className="font-medium text-gray-900">{order.phone || order.customer_phone}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Delivery Address</p>
                                <p className="font-medium text-gray-700 leading-relaxed">{order.address || order.delivery_address}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1 pt-4 border-t border-gray-100 mt-2">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Total Amount</p>
                                <p className="text-3xl font-light text-gray-900 tracking-tight">RM {Number(order.total).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONDITIONAL UI LOGIC BASED ON STATUS */}
                <AnimatePresence mode="wait">
                    {/* STATE 1: PENDING PAYMENT / UNPAID */}
                    {(currentStatus === 'pending_payment' || currentStatus === 'unpaid') && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select Payment Method</h1>
                                <p className="text-gray-500 font-medium mt-2 text-base">Choose how you would like to proceed with your payment</p>
                            </div>

                            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                {/* CARD 1: PAY VIA TRANSFER */}
                                <div
                                    onClick={() => router.push(`/payment/transfer/${orderId}`)}
                                    className="relative group flex flex-row md:flex-col p-4 bg-white rounded-2xl shadow-md transition-all duration-300 cursor-pointer gap-4 hover:shadow-lg hover:ring-2 hover:ring-emerald-500"
                                >
                                    <div className="flex-shrink-0 w-28 h-28 md:w-full md:h-40 overflow-hidden rounded-2xl bg-emerald-50">
                                        <img
                                            src="/payment/transfer.png"
                                            alt="Transfer"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between md:text-center gap-3">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-gray-900 text-lg">Pay via Transfer</h3>
                                            <p className="text-gray-500 text-xs font-medium leading-tight">DuitNow QR or Manual Bank Transfer</p>
                                        </div>
                                        <button className="w-full py-2 px-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 bg-emerald-500 text-white">
                                            TRANSFER NOW
                                        </button>
                                    </div>
                                </div>

                                {/* CARD 2: ORDER VIA WHATSAPP (TOP) */}
                                {waLink ? (
                                    <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={handleSecretTrigger}
                                        className="relative group flex flex-row md:flex-col p-4 bg-white rounded-2xl shadow-md transition-all duration-300 cursor-pointer gap-4 hover:shadow-lg"
                                    >
                                        <div className="flex-shrink-0 w-28 h-28 md:w-full md:h-40 overflow-hidden rounded-2xl bg-green-50">
                                            <img
                                                src="/payment/whatsapp.png"
                                                alt="WhatsApp"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between md:text-center gap-3">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-900 text-lg">Order via WhatsApp</h3>
                                                <p className="text-gray-500 text-xs font-medium leading-tight">Chat with us to confirm order details</p>
                                            </div>
                                            <div className="w-full py-2 px-4 bg-green-500 text-white rounded-full font-bold text-xs uppercase tracking-wider text-center">
                                                CHAT NOW
                                            </div>
                                        </div>
                                    </a>
                                ) : (
                                    <div className="relative flex flex-row md:flex-col p-4 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 opacity-60 gap-4">
                                        <div className="flex-shrink-0 w-28 h-28 md:w-full md:h-40 bg-gray-200 rounded-2xl" />
                                        <div className="flex-1 flex flex-col justify-between md:text-center gap-3">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-gray-400 text-lg">Order via WhatsApp</h3>
                                                <p className="text-gray-400 text-xs text-center">Connecting...</p>
                                            </div>
                                            <div className="w-full py-2 bg-gray-200 text-gray-400 rounded-full font-bold text-xs uppercase tracking-widest text-center">
                                                ...
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CARD 3: PAY VIA FPX (COMING SOON) */}
                                <div className="relative group flex flex-row md:flex-col p-4 bg-white rounded-2xl shadow-md border border-slate-100 opacity-60 transition-all duration-300 cursor-not-allowed gap-4">
                                    <div className="absolute -top-2.5 right-4 z-20">
                                        <div className="bg-amber-500/50 text-white text-[9px] font-black px-3 py-1 rounded-full tracking-widest uppercase shadow-sm">
                                            RECOMMENDED
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 w-28 h-28 md:w-full md:h-40 overflow-hidden rounded-2xl bg-slate-50">
                                        <img
                                            src="/payment/fpx.png"
                                            alt="FPX"
                                            className="w-full h-full object-cover grayscale"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between md:text-center gap-3">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-400 text-lg">Pay via FPX</h3>
                                            <p className="text-slate-400 text-xs font-medium leading-tight">Instant verification, safe and secure</p>
                                        </div>
                                        <button className="w-full py-2 px-4 bg-slate-200 text-slate-400 rounded-full font-bold text-xs uppercase tracking-wider">
                                            Coming Soon
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 2: VERIFYING PAYMENT (LEGIT STYLE) */}
                    {(currentStatus === 'verifying_payment' || currentStatus === 'pending_verification') && (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-8 shadow-md relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 animate-pulse" />
                            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto relative">
                                <Hourglass className="text-amber-500 w-10 h-10 animate-pulse" />
                                <div className="absolute inset-0 border-[3px] border-amber-50 rounded-full animate-spin border-t-amber-400" style={{ animationDuration: '2.5s' }} />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-2xl font-light text-gray-900 tracking-tight">Payment Verifying</h2>
                                <p className="text-gray-500 font-medium leading-relaxed max-w-sm mx-auto text-sm tracking-wide">
                                    Our financial team is reviewing your transfer. You will receive an update via WhatsApp or email shortly.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                Please wait for confirmation
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 3: PAID (CELEBRATION) */}
                    {currentStatus === 'paid' && (
                        <motion.div
                            key="paid"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-8 shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                            <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="text-emerald-500 w-10 h-10" />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-light text-gray-900 tracking-tight">Payment Successful</h2>
                                <p className="text-gray-500 font-medium max-w-sm mx-auto tracking-wide">
                                    Your order is confirmed and will be processed right away.
                                </p>
                            </div>
                            <button className="mx-auto flex items-center gap-3 bg-black text-white px-8 py-3.5 rounded-full font-semibold tracking-wide hover:bg-gray-800 transition-colors shadow-sm text-sm">
                                <Download size={16} />
                                Download Invoice
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {(currentStatus === 'verifying_payment' || currentStatus === 'pending_verification' || currentStatus === 'paid') && (
                    <button
                        onClick={() => router.push('/')}
                        className="w-full mt-4 flex items-center justify-center py-4 bg-black text-white rounded-2xl font-semibold text-sm tracking-widest uppercase hover:bg-gray-800 transition-colors shadow-md"
                    >
                        Back to Store
                    </button>
                )}

                {/* Developer Backdoor Modal */}
                <AnimatePresence>
                    {showDevModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
