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
        <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
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
                        <p className="text-gray-500 font-medium mt-2 text-sm uppercase tracking-widest">Order #{order?.id?.slice(0, 8) || ''}</p>
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
                                <p className="font-medium text-gray-900">{order?.customer_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Phone Number</p>
                                <p className="font-medium text-gray-900">{order?.phone || order?.customer_phone}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Delivery Address</p>
                                <p className="font-medium text-gray-700 leading-relaxed">{order?.address || order?.delivery_address}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1 pt-4 border-t border-gray-100 mt-2">
                                <p className="text-gray-400 uppercase font-semibold tracking-wider text-[10px]">Total Amount</p>
                                <p className="text-3xl font-light text-gray-900 tracking-tight">RM {order?.total ? Number(order?.total).toFixed(2) : '0.00'}</p>
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
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6 relative"
                        >
                            <div className="text-center pt-2">
                                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Secure payment</h1>
                                <p className="text-gray-500 font-medium mt-1 text-sm">Choose your preferred payment method</p>
                                
                                <div className="mt-4 mx-auto inline-flex items-center justify-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-xs text-gray-600 font-medium">
                                    <span>🔒 Secure checkout</span>
                                    <span>•</span>
                                    <span>⚡ Instant processing</span>
                                    <span>•</span>
                                    <span>🇲🇾 Malaysian</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* CARD 1: PAY VIA TRANSFER */}
                                <div
                                    className="relative group p-6 bg-white rounded-2xl border-2 border-gray-900 transition-all"
                                >
                                    <div className="absolute -top-3 left-6 z-20">
                                        <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                                            <span>⚡</span> Most popular
                                        </div>
                                    </div>
                                    
                                    <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mt-2">
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-lg">Pay via transfer</h3>
                                                <p className="text-gray-500 text-sm mt-0.5">DuitNow QR or bank transfer</p>
                                            </div>
                                            <div className="space-y-2 mt-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <CheckIcon className="w-4 h-4 text-black" />
                                                    <span>Instant verification</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <CheckIcon className="w-4 h-4 text-black" />
                                                    <span>No extra fees</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => router.push(`/payment/transfer/${orderId}`)} 
                                            className="w-full sm:w-auto py-3 px-8 rounded-xl font-medium text-sm bg-gray-900 text-white transition-all text-center"
                                        >
                                            Transfer Now
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* CARD 2: ORDER VIA WHATSAPP */}
                                    {waLink ? (
                                        <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={handleSecretTrigger}
                                            className="group p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all cursor-pointer flex flex-col gap-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                                                    <WhatsappIcon className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold text-gray-900 text-base">Order via WhatsApp</h3>
                                            </div>
                                            <div className="w-full py-2.5 px-4 bg-[#25D366] text-white rounded-xl font-medium text-sm flex items-center justify-center transition-colors">
                                                Chat Now
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 opacity-60">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                                                <h3 className="font-semibold text-gray-400 text-base">Order via WhatsApp</h3>
                                            </div>
                                            <div className="w-full py-2.5 px-4 bg-gray-200 text-gray-400 rounded-xl font-medium text-sm text-center">
                                                Connecting...
                                            </div>
                                        </div>
                                    )}

                                    {/* CARD 3: PAY VIA FPX */}
                                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 opacity-60">
                                        <div className="flex items-center gap-3">
                                            <img src="/fpx_logo.svg" width={40} height={16} alt="FPX" className="shrink-0" />
                                            <h3 className="font-semibold text-gray-900 text-base">FPX online banking</h3>
                                        </div>
                                        <button disabled onClick={handleFPXCheckout} className="w-full py-2.5 px-4 bg-gray-100 text-gray-400 rounded-xl font-medium text-sm text-center transition-colors">
                                            Coming Soon
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    {/* CARD 4: CREDIT CARD */}
                                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 opacity-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 shrink-0">
                                                 <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-base">Credit card</h3>
                                                <p className="text-gray-500 text-xs mt-0.5">Visa, Mastercard</p>
                                            </div>
                                        </div>
                                        <button disabled className="w-full sm:w-auto py-2.5 px-8 bg-gray-100 text-gray-400 rounded-xl font-medium text-sm text-center">
                                            Coming Soon
                                        </button>
                                    </div>
                                </div>

                                {/* WHY CHOOSE US */}
                                <div className="pt-6 pb-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                            <CheckIcon className="w-4 h-4 text-black shrink-0" />
                                            Secure payments
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                            <CheckIcon className="w-4 h-4 text-black shrink-0" />
                                            Fast order processing
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                            <CheckIcon className="w-4 h-4 text-black shrink-0" />
                                            Trusted by customers
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                            <CheckIcon className="w-4 h-4 text-black shrink-0" />
                                            24/7 dedicated support
                                        </div>
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
                            className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-8 shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#c8a84b] via-amber-200 to-[#c8a84b] animate-pulse" />
                            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto relative">
                                <Hourglass className="text-[#c8a84b] w-10 h-10 animate-pulse" />
                                <div className="absolute inset-0 border-[3px] border-amber-50 rounded-full animate-spin border-t-[#c8a84b]" style={{ animationDuration: '2.5s' }} />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-2xl font-light text-gray-900 tracking-tight">Payment Verifying</h2>
                                <p className="text-gray-500 font-medium leading-relaxed max-w-sm mx-auto text-sm tracking-wide">
                                    Our financial team is reviewing your transfer. You will receive an update via WhatsApp or email shortly.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin text-[#c8a84b]" />
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
