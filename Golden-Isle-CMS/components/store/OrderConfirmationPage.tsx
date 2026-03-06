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
                // Update order status in DB
                await updatePaymentProof(orderId, proofUrl, 'pending_verification');
                toast.success('Payment submitted! We will verify it soon.', {
                    duration: 5000,
                    icon: '🚀'
                });
                // Update local UI state
                setOrder({ ...order, payment_status: 'pending_verification' });
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

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-xl mx-auto space-y-8">

                {/* 1. Success Header & Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
                >
                    <div className="bg-green-600 p-8 text-center text-white relative">
                        <CheckCircle className="mx-auto w-16 h-16 mb-4 drop-shadow-md" />
                        <h1 className="text-3xl font-black italic">Order Confirmed!</h1>
                        <p className="opacity-90 font-medium mt-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Review Information</h2>
                            <button
                                onClick={() => router.push('/checkout')}
                                className="text-blue-600 font-bold text-sm flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                            >
                                <Edit size={14} /> Edit Info
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm">
                            <div className="space-y-1">
                                <p className="text-slate-400 uppercase font-bold text-[10px]">Full Name</p>
                                <p className="font-bold">{order.customer_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-400 uppercase font-bold text-[10px]">Phone Number</p>
                                <p className="font-bold">{order.phone || order.customer_phone}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-slate-400 uppercase font-bold text-[10px]">Delivery Address</p>
                                <p className="font-medium text-slate-700">{order.address || order.delivery_address}</p>
                            </div>
                            <div className="md:col-span-2 space-y-1 pt-2 border-t border-slate-200">
                                <p className="text-slate-400 uppercase font-bold text-[10px]">Total Amount</p>
                                <p className="text-2xl font-black text-blue-600">RM {Number(order.total).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Payment Selection Section */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900">Select Payment Method</h2>
                        <p className="text-slate-500 text-sm">Please pay to one of the following to complete order</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod(paymentMethod === 'qr' ? null : 'qr')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'qr' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'
                                }`}
                        >
                            <QrCode className={paymentMethod === 'qr' ? 'text-blue-600' : 'text-slate-400'} size={32} />
                            <span className={`text-xs font-bold mt-2 ${paymentMethod === 'qr' ? 'text-blue-700' : 'text-slate-600'}`}>DuitNow QR</span>
                        </button>

                        <button
                            onClick={() => setPaymentMethod(paymentMethod === 'manual' ? null : 'manual')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'manual' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-slate-50'
                                }`}
                        >
                            <Banknote className={paymentMethod === 'manual' ? 'text-emerald-600' : 'text-slate-400'} size={32} />
                            <span className={`text-xs font-bold mt-2 ${paymentMethod === 'manual' ? 'text-emerald-700' : 'text-slate-600'}`}>Bank Transfer</span>
                        </button>
                    </div>

                    {/* 3. Slide-Down Logic using AnimatePresence */}
                    <AnimatePresence mode="wait">
                        {paymentMethod === 'qr' && (
                            <motion.div
                                key="qr"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-blue-50/50 rounded-2xl p-6 border border-blue-100 text-center space-y-4"
                            >
                                <div className="bg-white p-4 rounded-xl inline-block shadow-sm">
                                    <img
                                        src={settings?.qr_code_url || "https://placeholder.com/200x200?text=DuitNow+QR"}
                                        alt="QR"
                                        className="w-40 h-40 mx-auto"
                                    />
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900 leading-tight">Scan RM {Number(order.total).toFixed(2)}</p>
                                    <p className="text-[11px] text-blue-600/70">Scan this DuitNow QR with your banking app</p>
                                </div>
                                <div className="pt-4 border-t border-blue-100">
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
                                className="overflow-hidden bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 space-y-4"
                            >
                                <div className="space-y-3">
                                    <div className="bg-white p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-emerald-600/60">Bank Name</p>
                                            <p className="font-black text-slate-800">{settings?.bank_name || 'Maybank'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-emerald-100 flex justify-between items-center group">
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase font-bold text-emerald-600/60">Account Number</p>
                                            <p className="font-mono text-lg font-black text-slate-800 tracking-wider">{settings?.bank_account_number || '1234567890'}</p>
                                            <p className="text-[11px] font-bold text-slate-400 mt-1">{settings?.bank_holder_name || 'GOLDEN ISLE WHOLESALE'}</p>
                                        </div>
                                        <button
                                            onClick={handleCopyAccount}
                                            className={`p-3 rounded-xl transition-all ${copySuccess ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                        >
                                            {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-emerald-100">
                                    {renderUploadUI()}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={() => router.push('/')}
                    className="w-full py-4 text-slate-500 font-bold text-sm bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                    Continue Shopping
                </button>
            </div>
        </div>
    );

    // Reuseable Upload UI Section
    function renderUploadUI() {
        return (
            <div className="space-y-4 pt-2">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center transition-all ${receipt ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-white hover:border-blue-400'
                        }`}
                >
                    {receipt ? (
                        <div className="flex items-center gap-3 text-green-700">
                            <ImageIcon size={20} />
                            <span className="text-xs font-bold truncate max-w-[200px]">{receipt.name}</span>
                        </div>
                    ) : (
                        <div className="text-center">
                            <Upload className="mx-auto text-slate-400 mb-1" size={20} />
                            <p className="text-[11px] font-bold text-slate-500">Click to upload receipt image</p>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <button
                    onClick={handleSubmitPayment}
                    disabled={!receipt || uploading}
                    className={`w-full py-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2 ${!receipt || uploading ? 'bg-slate-300' : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    {uploading ? 'Processing...' : 'Submit Payment'}
                </button>
            </div>
        );
    }
}
