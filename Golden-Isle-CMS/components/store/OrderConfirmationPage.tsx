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
    Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { getOrder, uploadPaymentProof, updatePaymentProof } from '@/lib/storage';
import { usePublicStore } from '@/hooks/usePublicStore';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    const { settings, storeId, loading: storeLoading } = usePublicStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'bank' | null>(null);
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
        toast.success('Account number copied!');
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceipt(e.target.files[0]);
        }
    };

    const handleSubmitPayment = async () => {
        if (!orderId || !receipt) {
            toast.error('Please upload a payment receipt first');
            return;
        }

        setUploading(true);
        try {
            const proofUrl = await uploadPaymentProof(orderId, receipt);
            if (proofUrl) {
                await updatePaymentProof(orderId, proofUrl, 'pending_verification');
                toast.success('Payment receipt submitted successfully!');
                // Update local status
                setOrder({ ...order, payment_status: 'pending_verification' });
                setPaymentMethod(null);
            } else {
                toast.error('Failed to upload receipt. Please try again.');
            }
        } catch (error) {
            console.error('Payment submission error:', error);
            toast.error('Generic submission error. Please contact support.');
        } finally {
            setUploading(false);
        }
    };

    if (loading || storeLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                <p className="text-slate-500 font-medium animate-pulse">Loading order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
                    <p className="text-slate-600">We couldn't find the order you're looking for. It might have expired or doesn't exist.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={18} />
                        Back to Shop
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-xl mx-auto space-y-8">

                {/* 1. Order Summary Section */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="bg-green-600 p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-400/20 rounded-full -ml-12 -mb-12 blur-xl" />

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/20"
                        >
                            <CheckCircle className="text-green-600 w-12 h-12" />
                        </motion.div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Order Confirmed!</h1>
                        <p className="text-green-50/90 mt-1 font-medium italic">Thank you for shopping with Golden Isle</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ShoppingBag className="text-blue-600" size={20} />
                                Order Summary
                            </h2>
                            <button
                                onClick={() => router.push('/checkout')}
                                className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors group"
                            >
                                <Edit size={14} className="group-hover:rotate-12 transition-transform" />
                                Edit Info
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Order ID</p>
                                <p className="text-sm font-mono font-bold text-slate-900 bg-white/50 px-2 py-0.5 rounded-md inline-block">#{order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Full Name</p>
                                <p className="text-sm font-bold text-slate-900">{order.customer_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Phone Number</p>
                                <p className="text-sm font-bold text-slate-900">{order.phone || order.customer_phone}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Total Amount</p>
                                <p className="text-lg font-black text-blue-600">RM {Number(order.total).toFixed(2)}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Delivery Address</p>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed">{order.address || order.delivery_address}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Payment Selection Section */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Secure Your Order</h2>
                        <p className="text-slate-500">Select a payment method below to complete your order</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod(paymentMethod === 'qr' ? null : 'qr')}
                            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group ${paymentMethod === 'qr'
                                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-600/10'
                                    : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-white'
                                }`}
                        >
                            <div className={`p-4 rounded-xl mb-3 transition-colors ${paymentMethod === 'qr' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 group-hover:text-blue-500 group-hover:shadow-sm'
                                }`}>
                                <QrCode size={32} />
                            </div>
                            <span className={`font-bold transition-colors ${paymentMethod === 'qr' ? 'text-blue-700' : 'text-slate-600'}`}>DuitNow QR</span>
                        </button>

                        <button
                            onClick={() => setPaymentMethod(paymentMethod === 'bank' ? null : 'bank')}
                            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group ${paymentMethod === 'bank'
                                    ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-4 ring-emerald-600/10'
                                    : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                                }`}
                        >
                            <div className={`p-4 rounded-xl mb-3 transition-colors ${paymentMethod === 'bank' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 group-hover:text-emerald-500 group-hover:shadow-sm'
                                }`}>
                                <Banknote size={32} />
                            </div>
                            <span className={`font-bold transition-colors ${paymentMethod === 'bank' ? 'text-emerald-700' : 'text-slate-600'}`}>Manual Bank Transfer</span>
                        </button>
                    </div>

                    {/* 3. Payment Details Panels (Accordion) */}
                    <AnimatePresence mode="wait">
                        {paymentMethod === 'qr' && (
                            <motion.div
                                key="qr-panel"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100 flex flex-col items-center text-center space-y-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
                                        {settings?.qr_code_url ? (
                                            <img
                                                src={settings.qr_code_url}
                                                alt="DuitNow QR"
                                                className="w-48 h-48 object-contain"
                                            />
                                        ) : (
                                            <div className="w-48 h-48 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400">
                                                <QrCode size={48} className="mb-2 opacity-50" />
                                                <span className="text-[10px] uppercase tracking-widest font-bold">QR Image Missing</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-blue-900 font-bold text-lg">Scan to pay RM {Number(order.total).toFixed(2)}</p>
                                        <p className="text-blue-700/70 text-sm max-w-[250px] mx-auto">Scan the DuitNow QR above with your banking app to complete payment.</p>
                                    </div>
                                    <div className="w-full pt-4 border-t border-blue-100">
                                        {renderUploadSection()}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {paymentMethod === 'bank' && (
                            <motion.div
                                key="bank-panel"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100 space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase tracking-widest text-emerald-600/60 font-black">Bank Name</p>
                                                <p className="text-lg font-black text-slate-900">{settings?.bank_name || 'Maybank'}</p>
                                            </div>
                                            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                                                <Banknote size={24} />
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase tracking-widest text-emerald-600/60 font-black">Account Name</p>
                                                <p className="text-lg font-black text-slate-900">{settings?.bank_holder_name || 'Golden Isle Wholesale'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between group">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase tracking-widest text-emerald-600/60 font-black">Account Number</p>
                                                <p className="text-xl font-mono font-black text-slate-900 tracking-wider">
                                                    {settings?.bank_account_number || '1234567890'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleCopyAccount}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${copySuccess
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95'
                                                    }`}
                                            >
                                                {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                                                {copySuccess ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full pt-4 border-t border-emerald-100">
                                        {renderUploadSection()}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Order Review Footer */}
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"
                        >
                            <ShoppingBag size={20} />
                            Continue Shopping
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-blue-500/20">
                    <div className="bg-white/20 p-4 rounded-2xl shrink-0 backdrop-blur-sm">
                        <AlertCircle size={32} />
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="font-black text-xl mb-1">Payment Confirmation</h4>
                        <p className="text-blue-100 leading-relaxed font-medium">Once you've made the payment, please upload your receipt. Our team will verify it and update your order status within 1-2 hours.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    function renderUploadSection() {
        return (
            <div className="space-y-4">
                <div className="flex flex-col items-center">
                    <p className="text-sm font-bold text-slate-700 mb-3">Upload Payment Receipt</p>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full max-w-sm cursor-pointer group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all ${receipt
                                ? 'border-green-400 bg-green-50/30'
                                : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/20'
                            }`}
                    >
                        {receipt ? (
                            <div className="flex items-center gap-3 text-green-700">
                                <ImageIcon size={24} className="shrink-0" />
                                <div className="text-left overflow-hidden">
                                    <p className="font-bold text-sm truncate">{receipt.name}</p>
                                    <p className="text-[10px] uppercase font-black opacity-60">Success! Click to change</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500">
                                <Upload size={28} />
                                <p className="text-xs font-bold">Click to select receipt (JPG, PNG)</p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSubmitPayment}
                        disabled={!receipt || uploading}
                        className={`w-full max-w-sm py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 ${!receipt || uploading
                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                            }`}
                    >
                        {uploading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Check size={20} />
                        )}
                        {uploading ? 'Processing...' : 'Submit Payment'}
                    </button>
                </div>
            </div>
        );
    }
}
