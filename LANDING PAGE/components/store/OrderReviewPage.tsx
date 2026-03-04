'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getOrder, getSettings, uploadPaymentProof, updatePaymentProof } from '@/lib/storage';
import { Order, StoreSettings } from '@/types';
import { Loader2, CheckCircle, AlertCircle, Copy, MessageSquare, CreditCard, Truck, Upload, X, Camera, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const methodLabels: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    duitnow: 'DuitNow QR',
    cod: 'Cash on Delivery',
};

export default function OrderReviewPage() {
    const params = useParams();
    const orderId = params?.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch order + settings from DB (no auth context needed — customer-facing)
    useEffect(() => {
        const fetchData = async () => {
            if (!orderId) return;
            try {
                // 1. Fetch order (public — no storeId filter)
                const found = await getOrder(orderId);
                if (!found) {
                    setLoading(false);
                    return;
                }
                setOrder(found);

                // 2. Fetch settings using the order's store_id
                if (found.store_id) {
                    const storeSettings = await getSettings(found.store_id);
                    setSettings(storeSettings);
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to load order");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orderId]);


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be under 5MB');
            return;
        }

        setReceiptFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setReceiptFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setReceiptPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const clearReceipt = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUploadReceipt = async () => {
        if (!order || !receiptFile || !settings) return;
        setUploading(true);
        setUploadProgress(10);

        try {
            setUploadProgress(30);
            const publicUrl = await uploadPaymentProof(order.id, receiptFile);
            setUploadProgress(70);

            if (!publicUrl) {
                throw new Error('Upload failed');
            }

            await updatePaymentProof(order.id, publicUrl, 'pending_verification');
            setUploadProgress(100);

            setOrder({
                ...order,
                payment_proof: publicUrl,
                payment_status: 'pending_verification'
            });

            toast.success('Receipt uploaded successfully!');

            const adminPhone = settings.whatsapp_number?.replace(/[^0-9]/g, '');
            if (adminPhone) {
                const message = `📸 *Payment Receipt Uploaded!*\n\n` +
                    `*Order ID:* ${order.id}\n` +
                    `*Customer:* ${order.customer_name}\n` +
                    `*Total:* RM ${(order.total || 0).toFixed(2)}\n` +
                    `*Payment:* ${methodLabels[order.payment_method || ''] || order.payment_method}\n\n` +
                    `Please verify the payment in your admin dashboard.\n` +
                    `📋 Receipt: ${publicUrl}`;

                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
            }

            clearReceipt();
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload receipt. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
    if (!order || !settings) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Order not found</div>;

    const hasReceipt = !!order.payment_proof;
    const paymentStatus = order.payment_status || 'unpaid';
    const pm = order.payment_method || 'pending';

    const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
        unpaid: { bg: 'bg-red-50', text: 'text-red-700', label: 'Unpaid', icon: AlertCircle },
        pending_verification: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Verification', icon: Loader2 },
        paid: { bg: 'bg-green-50', text: 'text-green-700', label: 'Verified & Paid', icon: CheckCircle },
    };

    const currentStatus = statusConfig[paymentStatus] || statusConfig.unpaid;
    const StatusIcon = currentStatus.icon;

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Order Review</h1>
                    <p className="text-slate-500 text-sm">Order ID: <span className="font-mono text-slate-700">{order.id}</span></p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        {order.status}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Truck size={18} /> Delivery Details
                        </h3>
                        <div className="space-y-3 text-sm text-slate-600">
                            <p><span className="font-medium text-slate-900">Name:</span> {order.customer_name}</p>
                            <p><span className="font-medium text-slate-900">Phone:</span> {order.customer_phone}</p>
                            <p><span className="font-medium text-slate-900">Address:</span><br />{order.delivery_address}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <CreditCard size={18} /> Payment Info
                        </h3>
                        <div className="space-y-3">
                            <div className={`p-3 ${currentStatus.bg} ${currentStatus.text} rounded-lg text-sm flex items-start gap-2`}>
                                <StatusIcon size={16} className={`shrink-0 mt-0.5 ${paymentStatus === 'pending_verification' ? 'animate-spin' : ''}`} />
                                <div>
                                    <span className="font-bold">{currentStatus.label}</span>
                                    {(pm === 'bank_transfer' || pm === 'duitnow') && !hasReceipt && paymentStatus === 'unpaid' && (
                                        <p className="mt-1 text-xs opacity-80">Please upload your payment receipt below.</p>
                                    )}
                                    {paymentStatus === 'pending_verification' && (
                                        <p className="mt-1 text-xs opacity-80">Receipt submitted. Awaiting admin verification.</p>
                                    )}
                                    {paymentStatus === 'paid' && (
                                        <p className="mt-1 text-xs opacity-80">Payment has been verified. Thank you!</p>
                                    )}
                                </div>
                            </div>

                            {pm !== 'pending' ? (
                                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                                    <span className="text-slate-500">Method: </span>
                                    <span className="font-bold text-slate-900">{methodLabels[pm] || pm}</span>
                                </div>
                            ) : (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm flex items-center gap-2 text-yellow-700">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span className="font-medium">No payment method selected</span>
                                </div>
                            )}

                            <p className="text-sm text-slate-500">Total Amount</p>
                            <p className="text-2xl font-bold text-emerald-600">RM {(order.total || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
                        Order Items
                    </div>
                    <div className="divide-y divide-slate-100">
                        {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden">
                                        {item.product.images?.[0] && <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-slate-900">{item.product.name}</p>
                                        <p className="text-xs text-slate-500">Qty: {item.qty}</p>
                                    </div>
                                </div>
                                <span className="font-medium text-slate-900">RM {((item.product.price * item.qty) || 0).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Total</span>
                        <span className="font-bold text-slate-900">RM {(order.total || 0).toFixed(2)}</span>
                    </div>
                </div>

                {/* SECTION A — Bank Transfer Details */}
                {pm === 'bank_transfer' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <CreditCard size={18} /> Bank Transfer Details
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500">Bank Name</p>
                                    <p className="font-bold text-sm text-slate-900">{settings.bank_name || 'Not configured'}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500">Account Number</p>
                                    <p className="font-bold text-sm text-slate-900 font-mono">{settings.bank_account_number || 'Not configured'}</p>
                                </div>
                                {settings.bank_account_number && (
                                    <button onClick={() => copyToClipboard(settings.bank_account_number)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                                        <Copy size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500">Account Holder</p>
                                    <p className="font-bold text-sm text-slate-900">{settings.bank_holder_name || 'Not configured'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION B — DuitNow QR Payment */}
                {pm === 'duitnow' && settings.qr_code_url && (
                    <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-6 space-y-4">
                        <h3 className="font-bold text-purple-600 flex items-center gap-2">
                            <QrCode size={18} /> DuitNow QR Payment
                        </h3>
                        <div className="text-center space-y-3">
                            <div className="inline-block p-3 bg-white rounded-xl border-2 border-purple-200 shadow-sm">
                                <img
                                    src={settings.qr_code_url}
                                    alt="DuitNow QR Code"
                                    className="w-56 h-56 object-contain mx-auto"
                                />
                            </div>
                            <p className="text-sm text-slate-500">Scan using any Malaysian banking app</p>
                        </div>
                    </div>
                )}

                {/* SECTION C — Upload Payment Receipt (bank_transfer or duitnow, not paid) */}
                {(pm === 'bank_transfer' || pm === 'duitnow') && paymentStatus !== 'paid' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Camera size={18} /> Upload Payment Receipt
                        </h3>

                        {hasReceipt && paymentStatus === 'pending_verification' && (
                            <div className="space-y-3">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                                    <Loader2 size={16} className="shrink-0 mt-0.5 animate-spin" />
                                    <div>
                                        <p className="font-bold">Receipt Submitted!</p>
                                        <p className="text-xs mt-1 opacity-80">Your payment receipt is being verified by our team. You'll be notified once confirmed.</p>
                                    </div>
                                </div>
                                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                                    <img
                                        src={order.payment_proof}
                                        alt="Payment Receipt"
                                        className="w-full max-h-80 object-contain bg-slate-100"
                                    />
                                    <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                                        Pending Verification
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 text-center">You can upload a new receipt to replace the current one.</p>
                            </div>
                        )}

                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${receiptPreview
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {receiptPreview ? (
                                <div className="space-y-3">
                                    <div className="relative inline-block">
                                        <img
                                            src={receiptPreview}
                                            alt="Receipt Preview"
                                            className="max-h-48 rounded-lg shadow-md mx-auto"
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); clearReceipt(); }}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-blue-600 font-medium">{receiptFile?.name}</p>
                                    <p className="text-xs text-slate-400">Click to change or drop a new image</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                                        <Upload size={24} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Tap to upload receipt</p>
                                        <p className="text-xs text-slate-400 mt-1">or drag & drop an image here</p>
                                        <p className="text-xs text-slate-400">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {uploading && (
                            <div className="space-y-2">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 text-center">Uploading receipt... {uploadProgress}%</p>
                            </div>
                        )}

                        {receiptFile && !uploading && (
                            <button
                                onClick={handleUploadReceipt}
                                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Upload size={20} />
                                Submit Payment Receipt
                            </button>
                        )}
                    </div>
                )}

                {/* SECTION D — Cash on Delivery */}
                {pm === 'cod' && (
                    <div className="bg-green-50 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                            <Truck size={20} className="text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-green-800">Cash on Delivery</p>
                                <p className="text-sm text-green-700 mt-1">Please prepare exact amount upon delivery. Our team will contact you to confirm delivery time.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Action */}
                <div className="text-center pt-8">
                    <p className="text-slate-500 text-sm mb-4">Need help?</p>
                    <button
                        onClick={() => window.open(`https://wa.me/${settings.whatsapp_number?.replace(/[^0-9]/g, '')}`, '_blank')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <MessageSquare size={18} className="text-green-600" />
                        Contact Support
                    </button>
                </div>

            </div>
        </div>
    );
}
