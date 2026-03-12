'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrder } from '@/lib/storage';
import { Order } from '@/types';
import { Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderReviewClient() {
    const params = useParams();
    const orderId = params?.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orderId) return;
            try {
                const orderData = await getOrder(orderId);
                if (!orderData) throw new Error('Order not found');
                setOrder(orderData);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load order");
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        if (!orderId) return;

        const channel = supabase
            .channel(`order-sync-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`,
                },
                (payload) => {
                    console.log('REALTIME UPDATE RECEIVED:', payload.new);
                    setOrder((prev) => {
                        if (!prev) return prev;
                        const updated = { ...prev };
                        Object.keys(payload.new).forEach((key) => {
                            if ((payload.new as any)[key] !== undefined) {
                                (updated as any)[key] = (payload.new as any)[key];
                            }
                        });
                        if ((payload.new as any).phone) updated.customer_phone = (payload.new as any).phone;
                        if ((payload.new as any).address) updated.delivery_address = (payload.new as any).address;
                        return updated;
                    });
                    setTimeout(async () => {
                        try {
                            const freshData = await getOrder(orderId);
                            if (freshData) setOrder(freshData);
                        } catch (err) {
                            console.error("Fallback fetch failed:", err);
                        }
                    }, 500);
                    if ((payload.new as any).status === 'confirmed') {
                        toast.success("Payment confirmed! Your receipt is now available.", {
                            icon: '🎉',
                            duration: 5000
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Supabase Realtime Status for order ${orderId}:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-black w-8 h-8" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-black font-sans">
                Order not found
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-12 px-4 md:px-8 font-sans text-[#111111]">
            <div className="max-w-3xl mx-auto border border-black p-8 md:p-12 shadow-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tighter uppercase mb-1">GOLDEN ISLE WHOLESALE</h1>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium">Official Order Receipt</p>
                </div>
                <div className="h-px bg-black w-full mb-6" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 text-sm uppercase font-bold">
                    <div className="space-y-1">
                        <p>Order ID: <span className="font-normal">{order.id}</span></p>
                        <p>Date: <span className="font-normal">{new Date(order.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
                    </div>
                    {order.status === 'confirmed' ? (
                        <div className="px-3 py-1 border border-black bg-white text-[10px] tracking-widest">
                            STATUS: CONFIRMED
                        </div>
                    ) : order.status === 'payment_submitted' ? (
                        <div className="px-3 py-1 border border-amber-500 bg-amber-50 text-amber-700 text-[10px] tracking-widest">
                            STATUS: VERIFYING PAYMENT
                        </div>
                    ) : (
                        <div className="px-3 py-1 border border-gray-400 bg-gray-50 text-gray-500 text-[10px] tracking-widest">
                            STATUS: {order.status.replace('_', ' ')}
                        </div>
                    )}
                </div>
                {order.status === 'payment_submitted' && (
                    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800">
                        <div className="mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                        <div>
                            <p className="font-bold text-sm uppercase tracking-wide mb-0.5">Pending Verification</p>
                            <p className="text-sm opacity-90">Your payment is being verified by our finance team. We will notify you once confirmed.</p>
                        </div>
                    </div>
                )}
                <div className="h-px bg-black w-full mb-8" />
                {order.status === 'confirmed' ? (
                    <>
                        <div className="mb-10">
                            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 bg-black text-white px-2 py-1 inline-block">Bill To</h2>
                            <div className="text-sm space-y-1">
                                <p><span className="font-bold">Buyer:</span> {order.customer_name}</p>
                                <p><span className="font-bold">Phone Number:</span> {order.customer_phone}</p>
                                <p className="max-w-md"><span className="font-bold">Address:</span> {order.delivery_address}</p>
                            </div>
                        </div>
                        <div className="mb-8 border border-black overflow-x-auto w-full">
                            <table className="w-full text-left text-sm border-collapse min-w-[400px]">
                                <thead>
                                    <tr className="bg-black text-white uppercase text-[9px] md:text-[11px] tracking-widest shrink-0">
                                        <th className="p-3 border-r border-black font-bold whitespace-nowrap">Item</th>
                                        <th className="p-3 border-r border-black font-bold text-center whitespace-nowrap">Qty</th>
                                        <th className="p-3 border-r border-black font-bold text-right whitespace-nowrap">Price</th>
                                        <th className="p-3 font-bold text-right whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black">
                                    {(order.items as any[]).map((item, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}>
                                            <td className="p-3 border-r border-black font-medium">{item.product.name}</td>
                                            <td className="p-3 border-r border-black text-center">{item.qty}</td>
                                            <td className="p-3 border-r border-black text-right">RM {Number(item.product.price).toFixed(2)}</td>
                                            <td className="p-3 text-right">RM {(item.product.price * item.qty).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mb-12">
                            <div className="w-full md:w-64 border-2 border-black p-4 space-y-3">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Subtotal</span>
                                    <span>RM {Number(order.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Delivery</span>
                                    <span>RM {Number(order.delivery_fee || 0).toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-black w-full" />
                                <div className="flex justify-between text-lg font-bold">
                                    <span className="uppercase tracking-tighter">Total</span>
                                    <span>RM {Number(order.total).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl mb-12">
                        <p className="text-gray-400 font-medium">Full receipt details will be available once payment is confirmed.</p>
                    </div>
                )}
                <div className="text-center space-y-8">
                    <p className="text-xs text-gray-400 font-medium">Thank you for your business.</p>
                    <div className="flex flex-col items-center gap-4 no-print">
                        {(order.notified_at || (order.status !== 'pending' && order.status !== 'payment_submitted')) ? (
                            <button
                                disabled
                                className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-bold py-4 px-12 w-full max-w-sm rounded-full transition-all text-sm cursor-not-allowed border border-gray-200"
                            >
                                ✓ Seller Notified
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    try {
                                        const { error } = await supabase
                                            .from('orders')
                                            .update({ status: 'processing' })
                                            .eq('id', order.id);
                                        if (error) throw error;
                                        setOrder({ ...order, status: 'processing' });
                                        toast.success("Seller has been notified");
                                    } catch (e) {
                                        console.error(e);
                                        toast.error("Failed to notify seller");
                                    }
                                }}
                                className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebc5a] text-white font-bold py-4 px-12 w-full max-w-sm rounded-full transition-all shadow-md shadow-[#25D366]/30 active:scale-95 text-base uppercase tracking-wider"
                            >
                                <span>Notify Seller</span>
                                <svg viewBox="0 0 48 48" width="24" height="24">
                                    <path fill="white" d="M24 6C14.06 6 6 14.06 6 24c0 3.19.84 6.17 2.3 8.75L6 42l9.5-2.27A17.94 17.94 0 0024 42c9.94 0 18-8.06 18-18S33.94 6 24 6zm9.27 25.08c-.38 1.07-2.24 2.04-3.07 2.1-.83.07-1.6.37-5.4-1.13-4.55-1.77-7.43-6.37-7.65-6.67-.22-.3-1.78-2.37-1.78-4.52s1.13-3.2 1.53-3.63c.4-.44.87-.55 1.16-.55h.83c.27 0 .63-.1.99.75.38.9 1.29 3.13 1.4 3.35.12.22.2.48.04.77-.15.3-.23.48-.45.74-.22.26-.46.58-.66.78-.22.22-.45.46-.19.9.26.44 1.15 1.9 2.47 3.08 1.7 1.52 3.13 1.99 3.57 2.21.44.22.7.19.96-.11.26-.3 1.1-1.28 1.39-1.72.3-.44.6-.37 1-.22.4.15 2.54 1.2 2.98 1.42.44.22.73.33.84.51.1.19.1 1.07-.28 2.14z" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            disabled={order.status !== 'confirmed'}
                            className={`no-print inline-flex items-center justify-center gap-2 font-bold py-3 px-8 w-full max-w-sm rounded-full transition-all border active:scale-95 text-sm uppercase tracking-wider ${
                                order.status === 'confirmed' 
                                ? 'bg-white hover:bg-gray-50 text-black border-black/80' 
                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            }`}
                        >
                            {order.status === 'confirmed' && <Download size={16} />}
                            <span>{order.status === 'confirmed' ? 'Download Receipt' : 'Receipt available after confirmation'}</span>
                        </button>
                    </div>
                </div>
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; }
                        .min-h-screen { padding: 0 !important; }
                        .max-w-3xl { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: none !important; }
                    }
                `}</style>
            </div>
        </div>
    );
}
