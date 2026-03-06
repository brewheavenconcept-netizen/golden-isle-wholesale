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
    Download
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10 mb-4" />
                <p className="text-slate-500 font-medium">Loading your order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4">
                    <AlertCircle className="mx-auto text-red-500 w-12 h-12" />
                    <h2 className="text-xl font-bold">Order Not Found</h2>
                    <p className="text-slate-500">Could not retrieve order details for ID: {orderId}</p>
                    <button onClick={() => router.push('/')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Back to Home</button>
                </div>
            </div>
        );
    }

    const currentStatus = order.payment_status || 'pending_payment';

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-xl mx-auto space-y-8">

                {/* 1. Success Header & Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
                >
                    <div className="bg-slate-900 p-8 text-center text-white relative">
                        <CheckCircle className="mx-auto w-16 h-16 mb-4 text-green-400 drop-shadow-md" />
                        <h1 className="text-3xl font-black italic tracking-tight">Order Confirmed!</h1>
                        <p className="opacity-70 font-medium mt-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Review Information</h2>
                            {currentStatus === 'pending_payment' || currentStatus === 'unpaid' ? (
                                <button
                                    onClick={() => router.push('/checkout')}
                                    className="text-slate-600 font-bold text-sm flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                                >
                                    <Edit size={14} /> Edit Info
                                </button>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-sm">
                            <div className="space-y-1">
                                <p className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Full Name</p>
                                <p className="font-bold text-slate-800">{order.customer_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Phone Number</p>
                                <p className="font-bold text-slate-800">{order.phone || order.customer_phone}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Delivery Address</p>
                                <p className="font-medium text-slate-700">{order.address || order.delivery_address}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1 pt-4 border-t border-slate-200 mt-2">
                                <p className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Total Amount</p>
                                <p className="text-3xl font-black text-slate-900">RM {Number(order.total).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* CONDITIONAL UI LOGIC BASED ON STATUS */}
                <AnimatePresence mode="wait">

                    {/* STATE 1: PENDING PAYMENT */}
                    {(currentStatus === 'pending_payment' || currentStatus === 'unpaid') && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 space-y-6"
                        >
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-slate-900">Select Payment Method</h2>
                                <p className="text-slate-500 text-sm mt-1">Please transfer the exact amount to complete your order</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPaymentMethod(paymentMethod === 'qr' ? null : 'qr')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'qr' ? 'border-slate-900 bg-slate-50 shadow-md transform scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <QrCode className={paymentMethod === 'qr' ? 'text-slate-900' : 'text-slate-400'} size={32} />
                                    <span className={`text-xs font-bold mt-3 ${paymentMethod === 'qr' ? 'text-slate-900' : 'text-slate-600'}`}>DuitNow QR</span>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod(paymentMethod === 'manual' ? null : 'manual')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'manual' ? 'border-slate-900 bg-slate-50 shadow-md transform scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <Banknote className={paymentMethod === 'manual' ? 'text-slate-900' : 'text-slate-400'} size={32} />
                                    <span className={`text-xs font-bold mt-3 ${paymentMethod === 'manual' ? 'text-slate-900' : 'text-slate-600'}`}>Bank Transfer</span>
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
                                        className="overflow-hidden bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-5 shadow-inner"
                                    >
                                        <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-slate-200">
                                            <img
                                                src={settings?.qr_code_url || "https://placeholder.com/200x200?text=DuitNow+QR"}
                                                alt="QR"
                                                className="w-48 h-48 mx-auto object-contain"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-lg">Scan to pay RM {Number(order.total).toFixed(2)}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-1">Use your banking app to scan the DuitNow QR</p>
                                        </div>
                                        <div className="pt-4 border-t border-slate-200">
                                            {renderUploadUI()}
                                        </div>
                                    </motion.div>
                                )}

                                {paymentMethod === 'manual' && (
                                    <motion.div
                                        key="manual"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 shadow-inner"
                                    >
                                        <div className="space-y-3">
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Bank Name</p>
                                                    <p className="font-black text-slate-800 text-lg mt-0.5">{settings?.bank_name || 'Maybank'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center group shadow-sm">
                                                <div className="flex-1">
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Account Information</p>
                                                    <p className="font-mono text-xl font-black text-slate-800 tracking-wider mt-1">{settings?.bank_account_number || '1234567890'}</p>
                                                    <p className="text-xs font-bold text-slate-500 mt-1">{settings?.bank_holder_name || 'GOLDEN ISLE WHOLESALE'}</p>
                                                </div>
                                                <button
                                                    onClick={handleCopyAccount}
                                                    className={`p-3 rounded-xl transition-all shadow-sm ${copySuccess ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                                >
                                                    {copySuccess ? <Check size={20} /> : <Copy size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-200">
                                            {renderUploadUI()}
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
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[2rem] shadow-xl border border-amber-100 p-10 text-center space-y-6 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 animate-pulse" />

                            <div className="bg-amber-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto relative">
                                <Hourglass className="text-amber-600 w-10 h-10 animate-pulse" />
                                <div className="absolute inset-0 border-4 border-amber-200 rounded-full animate-spin border-t-amber-500" style={{ animationDuration: '3s' }} />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Received & Verifying</h2>
                                <p className="text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                                    Our financial team is reviewing your transfer. You will receive an update via WhatsApp or email shortly.
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-full text-xs font-bold text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                Please wait for confirmation
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 3: PAID (CELEBRATION) */}
                    {currentStatus === 'paid' && (
                        <motion.div
                            key="paid"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[2rem] shadow-xl border border-emerald-100 p-10 text-center space-y-6 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />

                            <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="text-emerald-600 w-12 h-12" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Payment Successful!</h2>
                                <p className="text-slate-600 font-medium max-w-sm mx-auto">
                                    Your order is confirmed and will be processed right away.
                                </p>
                            </div>

                            <button className="mx-auto flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                                <Download size={18} />
                                Download Invoice
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>

                {(currentStatus === 'pending_payment' || currentStatus === 'unpaid') && (
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-4 text-slate-500 font-bold text-sm bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Save & Continue Shopping
                    </button>
                )}
                {(currentStatus === 'verifying_payment' || currentStatus === 'pending_verification' || currentStatus === 'paid') && (
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-4 text-slate-900 font-black text-sm bg-white rounded-2xl border-2 border-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Back to Store
                    </button>
                )}
            </div>
        </div>
    );

    // Reuseable Upload UI Section
    function renderUploadUI() {
        return (
            <div className="space-y-4 pt-2">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all group ${receipt ? 'border-slate-800 bg-slate-50' : 'border-slate-300 bg-white hover:border-slate-800 hover:bg-slate-50'
                        }`}
                >
                    {receipt ? (
                        <div className="flex items-center gap-3 text-slate-900">
                            <ImageIcon size={24} />
                            <div className="text-left">
                                <p className="text-sm font-bold truncate max-w-[200px]">{receipt.name}</p>
                                <p className="text-[10px] uppercase font-black text-green-600 mt-1">Ready to submit</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center group-hover:scale-105 transition-transform">
                            <Upload className="mx-auto text-slate-400 group-hover:text-slate-900 mb-2 transition-colors" size={28} />
                            <p className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">Click to upload receipt image</p>
                            <p className="text-[10px] font-medium text-slate-400 mt-1">Max 2MB (JPG, PNG)</p>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <button
                    onClick={handleSubmitPayment}
                    disabled={!receipt || uploading}
                    className={`w-full py-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg ${!receipt || uploading ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 shadow-slate-900/20'
                        }`}
                >
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    {uploading ? 'UPLOADING...' : 'SUBMIT PAYMENT'}
                </button>
            </div>
        );
    }
}
