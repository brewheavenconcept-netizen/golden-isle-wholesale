'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrder } from '@/lib/storage';
import { Order } from '@/types';
import { Loader2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderReviewPage() {
    const params = useParams();
    const orderId = params?.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!orderId) return;
            try {
                // 1. Fetch order using central utility to ensure field mapping
                const orderData = await getOrder(orderId);
                console.log('DEBUG FULL ORDER OBJECT:', orderData);

                if (!orderData) throw new Error('Order not found');
                setOrder(orderData);

                // 2. Fetch whatsapp number
                const { data: settingsData } = await supabase
                    .from('store_settings')
                    .select('whatsapp_number')
                    .eq('store_id', '00000000-0000-0000-0000-000000000000')
                    .single();

                if (settingsData?.whatsapp_number) {
                    setWhatsappNumber(settingsData.whatsapp_number);
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

    const itemsList = order.items?.map((item: any) => `- ${item.product.name} x${item.qty}`).join('\n') || '';
    const orderReviewLink = `https://goldenisle-wholesale.vercel.app/order-review/${order.id}`;

    const waMessage = `Hi Golden Isle Wholesale! 🥃
I have just placed an order:

📋 Order ID: ${order.id}
👤 Name: ${order.customer_name}
📞 Phone: ${order.customer_phone}
📍 Address: ${order.delivery_address}
🛒 Items: 
${itemsList}
💰 Total: RM ${Number(order.total).toFixed(2)}
🔗 Details: ${orderReviewLink}

Please confirm my order. Thank you!`;

    const waLink = whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`
        : null;

    return (
        <div className="min-h-screen bg-white py-12 px-4 md:px-8 font-sans text-[#111111]">
            <div className="max-w-3xl mx-auto border border-black p-8 md:p-12 shadow-sm">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tighter uppercase mb-1">GOLDEN ISLE WHOLESALE</h1>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium">Official Order Receipt</p>
                </div>

                <div className="h-px bg-black w-full mb-6" />

                {/* Meta Info */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 text-sm uppercase font-bold">
                    <div className="space-y-1">
                        <p>Order ID: <span className="font-normal">{order.id}</span></p>
                        <p>Date: <span className="font-normal">{new Date(order.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
                    </div>
                    <div className="px-3 py-1 border border-black bg-white text-[10px] tracking-widest">
                        STATUS: CONFIRMED
                    </div>
                </div>

                <div className="h-px bg-black w-full mb-8" />

                {/* Billing Info */}
                <div className="mb-10">
                    <h2 className="text-xs font-bold uppercase tracking-widest mb-4 bg-black text-white px-2 py-1 inline-block">Bill To</h2>
                    <div className="text-sm space-y-1">
                        <p className="font-bold">{order.customer_name}</p>
                        <p>{order.customer_phone}</p>
                        <p className="max-w-md">{order.delivery_address}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8 overflow-hidden border border-black">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-black text-white uppercase text-[10px] tracking-widest">
                                <th className="p-3 border-r border-black font-bold">Item</th>
                                <th className="p-3 border-r border-black font-bold text-center">Qty</th>
                                <th className="p-3 border-r border-black font-bold text-right">Unit Price</th>
                                <th className="p-3 font-bold text-right">Subtotal</th>
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

                {/* Totals */}
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

                {/* Footer */}
                <div className="text-center space-y-8">
                    <p className="text-xs text-gray-400 font-medium">Thank you for your business.</p>

                    {waLink && (
                        <div className="flex flex-col items-center gap-4">
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-3 px-8 rounded-full transition-all shadow-md active:scale-95 text-sm"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Confirm via WhatsApp
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
