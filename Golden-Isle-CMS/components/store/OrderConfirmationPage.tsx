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
    QrCode,
    Banknote,
    Copy,
    Upload,
    Check,
    Image as ImageIcon,
    Hourglass,
    Download,
    MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { getOrder, uploadPaymentProof, updatePaymentProof } from '@/lib/storage';
import { usePublicStore } from '@/hooks/usePublicStore';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    const { settings, loading: storeLoading } = usePublicStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State management for toggle panels (qr or manual)
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'manual' | null>(null);
    const [receipt, setReceipt] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleCopyAccount = () => {
        const accNo = settings?.bank_account_number || '1234567890';
        navigator.clipboard.writeText(accNo);
        setCopySuccess(true);
        toast.success('Account number copied to clipboard!');
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Basic size check (2MB)
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

        setUploading(true);
        try {
            // Logic: Upload to Supabase 'receipts' bucket
            const proofUrl = await uploadPaymentProof(orderId, receipt);

            if (proofUrl) {
                // We use 'verifying_payment' for the new legit flow, but 'pending_verification' is also supported for backwards compatibility
                await updatePaymentProof(orderId, proofUrl, 'verifying_payment' as any);
                toast.success('Payment submitted! We will verify it soon.', {
                    duration: 5000,
                    icon: '🚀'
                });
                // Optimistic UI update
                setOrder({ ...order, payment_status: 'verifying_payment', payment_proof: proofUrl });
                setPaymentMethod(null);
                setReceipt(null);
            }
        } catch (error: any) {
            console.error('Submission error:', error);
            toast.error(error.message || 'Failed to submit payment. Please check your connection.');
        } finally {
            setUploading(false);
        }
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

    const waMessage = `Hi Golden Isle Wholesale! 🥃

I have just placed an order:
📋 Order ID: ${order.id}
👤 Name: ${order.customer_name}
💰 Total: RM ${Number(order.total).toFixed(2)}

Please confirm my order. Thank you!`;

    const waLink = settings?.whatsapp_number
        ? `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(waMessage)}`
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
                        <CheckCircle className="mx-auto w-16 h-16 mb-4 text-emerald-500" />
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

                {/* WHATSAPP CONFIRMATION BUTTON */}
                {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="block">
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md active:scale-[0.98]"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Confirm Order via WhatsApp
                        </motion.button>
                    </a>
                )}

                {/* CONDITIONAL UI LOGIC BASED ON STATUS */}
                <AnimatePresence mode="wait">

                    {/* STATE 1: PENDING PAYMENT */}
                    {(currentStatus === 'pending_payment' || currentStatus === 'unpaid') && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 shadow-sm"
                        >
                            <div className="text-center">
                                <h2 className="text-xl font-semibold text-gray-900 tracking-wide">Select Payment Method</h2>
                                <p className="text-gray-500 text-sm mt-1">Please transfer the exact amount to complete your order</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPaymentMethod(paymentMethod === 'qr' ? null : 'qr')}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all ${paymentMethod === 'qr' ? 'border-gray-900 bg-gray-50/50' : 'border-gray-100 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <QrCode className={paymentMethod === 'qr' ? 'text-gray-900' : 'text-gray-400'} size={28} />
                                    <span className={`text-xs font-semibold mt-3 tracking-wide ${paymentMethod === 'qr' ? 'text-gray-900' : 'text-gray-500'}`}>DuitNow QR</span>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod(paymentMethod === 'manual' ? null : 'manual')}
                                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all ${paymentMethod === 'manual' ? 'border-gray-900 bg-gray-50/50' : 'border-gray-100 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <Banknote className={paymentMethod === 'manual' ? 'text-gray-900' : 'text-gray-400'} size={28} />
                                    <span className={`text-xs font-semibold mt-3 tracking-wide ${paymentMethod === 'manual' ? 'text-gray-900' : 'text-gray-500'}`}>Bank Transfer</span>
                                </button>
                            </div>

                            {/* Slide-Down Logic using AnimatePresence */}
                            <AnimatePresence mode="wait">
                                {paymentMethod === 'qr' && (
                                    <motion.div
                                        key="qr"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-white rounded-2xl border border-gray-100 text-center shadow-sm"
                                    >
                                        <div className="p-8 space-y-6">
                                            <div className="bg-white p-2 rounded-2xl inline-block border border-gray-100 shadow-sm">
                                                <img
                                                    src={settings?.qr_code_url || "https://placeholder.com/200x200?text=DuitNow+QR"}
                                                    alt="QR"
                                                    className="w-48 h-48 mx-auto object-contain"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-lg tracking-wide">Scan to pay RM {Number(order.total).toFixed(2)}</p>
                                                <p className="text-xs font-medium text-gray-500 mt-1">Use your banking app to scan the DuitNow QR</p>
                                            </div>
                                            <div className="pt-6 border-t border-gray-100">
                                                {renderUploadUI()}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {paymentMethod === 'manual' && (
                                    <motion.div
                                        key="manual"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm"
                                    >
                                        <div className="p-6 space-y-4">
                                            <div className="bg-gray-50/50 p-5 rounded-2xl flex justify-between items-center text-left">
                                                <div>
                                                    <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Bank Name</p>
                                                    <p className="font-semibold text-gray-900 text-lg mt-0.5">{settings?.bank_name || 'Maybank'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50/50 p-5 rounded-2xl flex justify-between items-center group text-left">
                                                <div className="flex-1">
                                                    <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Account Information</p>
                                                    <p className="font-mono text-xl font-semibold text-gray-900 tracking-wider mt-1">{settings?.bank_account_number || '1234567890'}</p>
                                                    <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{settings?.bank_holder_name || 'GOLDEN ISLE WHOLESALE'}</p>
                                                </div>
                                                <button
                                                    onClick={handleCopyAccount}
                                                    className={`p-3 rounded-xl transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200 shadow-sm'}`}
                                                >
                                                    {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                                                </button>
                                            </div>
                                            <div className="pt-4 border-t border-gray-100">
                                                {renderUploadUI()}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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

                {(currentStatus === 'pending_payment' || currentStatus === 'unpaid') && (
                    <button
                        onClick={() => router.push('/')}
                        className="w-full mt-4 flex items-center justify-center py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl font-semibold text-sm tracking-widest uppercase hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Save & Continue Shopping
                    </button>
                )}
                {(currentStatus === 'verifying_payment' || currentStatus === 'pending_verification' || currentStatus === 'paid') && (
                    <button
                        onClick={() => router.push('/')}
                        className="w-full mt-4 flex items-center justify-center py-4 bg-black text-white rounded-2xl font-semibold text-sm tracking-widest uppercase hover:bg-gray-800 transition-colors shadow-md"
                    >
                        Back to Store
                    </button>
                )}
            </motion.div>
        </div>
    );

    // Reuseable Upload UI Section
    function renderUploadUI() {
        return (
            <div className="space-y-5 pt-2">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all group ${receipt ? 'border-gray-300 bg-gray-50/50' : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                        }`}
                >
                    {receipt ? (
                        <div className="flex items-center gap-3 text-gray-900">
                            <ImageIcon size={20} className="text-emerald-500" />
                            <div className="text-left">
                                <p className="text-sm font-medium truncate max-w-[200px] tracking-wide">{receipt.name}</p>
                                <p className="text-[10px] uppercase font-semibold text-emerald-500 mt-1 tracking-wider">Ready to submit</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center transition-transform">
                            <Upload className="mx-auto text-gray-400 group-hover:text-gray-900 mb-3 transition-colors" size={24} />
                            <p className="text-xs font-semibold text-gray-500 group-hover:text-gray-900 transition-colors tracking-wide">Upload receipt image</p>
                            <p className="text-[10px] font-medium text-gray-400 mt-1.5 uppercase tracking-widest">Max 2MB (JPG, PNG)</p>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <button
                    onClick={handleSubmitPayment}
                    disabled={!receipt || uploading}
                    className={`w-full py-4 rounded-xl font-semibold tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 ${!receipt || uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                        }`}
                >
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    {uploading ? 'Processing...' : 'Confirm Payment'}
                </button>
            </div>
        );
    }
}
