'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ShoppingBag,
    AlertCircle,
    Loader2,
    Edit,
    ArrowLeft,
    CheckCircle,
    MapPin,
    Phone,
    User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getOrder } from '@/lib/storage';
import { usePublicStore } from '@/hooks/usePublicStore';

export default function OrderSummaryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    const { loading: storeLoading } = usePublicStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading || storeLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10 mb-4" />
                <p className="text-gray-500 font-medium tracking-wide">Preparing your order summary...</p>
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
                    <button onClick={() => router.push('/')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold tracking-wide transition-all hover:bg-black">Back to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-xl mx-auto space-y-8 tracking-wide"
            >
                {/* Header Section */}
                <div className="text-center space-y-3">
                    <div className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                        <ShoppingBag size={24} />
                    </div>
                    <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Order Summary</h1>
                    <p className="text-gray-500 font-medium text-sm">Review your order details before payment</p>
                    
                    <div className="mt-4 mx-auto inline-flex items-center justify-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-xs text-gray-600 font-medium">
                        <span>🔒 Secure checkout</span>
                        <span>•</span>
                        <span>⚡ Instant processing</span>
                        <span>•</span>
                        <span>🇲🇾 Malaysian</span>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 space-y-8">
                        {/* Order Items */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your Items</h3>
                            <div className="divide-y divide-gray-50">
                                {order.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="py-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-colors">
                                                <ShoppingBag size={20} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{item.product?.name || item.name}</p>
                                                <p className="text-sm text-gray-500">Quantity: {item.qty || item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="font-semibold text-gray-900">
                                            RM {( (item.price || 0) * (item.qty || item.quantity || 1) ).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Section */}
                        <div className="pt-6 border-t border-gray-100 flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</p>
                                <p className="text-4xl font-light text-gray-900 tracking-tighter">
                                    RM {Number(order.total).toFixed(2)}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    <CheckCircle size={10} /> Tax included
                                </span>
                            </div>
                        </div>

                        {/* Customer Information */}
                        <div className="pt-8 border-t border-gray-100 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Delivery Details</h3>
                                <button 
                                    onClick={() => router.push('/checkout')}
                                    className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors uppercase tracking-wider"
                                >
                                    <Edit size={12} /> Edit Details
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-50">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                        <User size={16} className="text-gray-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Name</p>
                                        <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-4">
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                        <Phone size={16} className="text-gray-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                                        <p className="text-sm font-semibold text-gray-900">{order.customer_phone}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-4">
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                        <MapPin size={16} className="text-gray-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Address</p>
                                        <p className="text-sm font-medium text-gray-700 leading-relaxed">{order.delivery_address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-8 bg-gray-50 border-t border-gray-100 space-y-4">
                        <button
                            onClick={() => router.push(`/payment/transfer/${order.id}`)}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                        >
                            Continue to payment
                        </button>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => router.push('/checkout')}
                                className="py-3 px-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-all text-center flex items-center justify-center gap-2"
                            >
                                <Edit size={12} /> Edit Order
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="py-3 px-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-all text-center flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={12} /> Back to Store
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Trust Section */}
                <div className="text-center pt-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Golden Isle Wholesale • Secure Portal</p>
                </div>
            </motion.div>
        </div>
    );
}
