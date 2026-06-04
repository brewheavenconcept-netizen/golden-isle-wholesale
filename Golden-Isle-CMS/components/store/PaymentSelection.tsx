'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, CreditCard, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface PaymentSelectionProps {
    orderId: string;
    amount: number;
}

export default function PaymentSelection({ orderId, amount }: PaymentSelectionProps) {
    const router = useRouter();
    const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('store_settings')
                .select('whatsapp_number')
                .eq('store_id', '00000000-0000-0000-0000-000000000000')
                .single();
            if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
        };
        fetchSettings();
    }, []);

    const waLink = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=Hi! I want to confirm my order: ${orderId}`
        : '#';

    return (
        <div className="w-full max-w-xl mx-auto px-4 py-6 space-y-4 overflow-hidden">

            {/* Header */}
            <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">Secure payment</h2>
                <p className="text-[13px] text-gray-500">Choose your preferred payment method</p>
                <div className="flex items-center justify-center gap-2 flex-wrap max-w-md mx-auto">
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] text-gray-500 shadow-sm whitespace-nowrap">🔒 Secure checkout</span>
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] text-gray-500 shadow-sm whitespace-nowrap">⚡ Instant processing</span>
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] text-gray-500 shadow-sm whitespace-nowrap">🇲🇾 Malaysian</span>
                </div>
            </div>

            {/* Transfer Card */}
            <div className="relative pt-3">
                <div className="absolute top-0 left-5 z-10 flex items-center gap-1 px-3 py-1 bg-[#1a1a1a] text-white rounded-t-lg text-[9px] font-bold tracking-widest">
                    <Zap size={10} className="fill-amber-400 text-amber-400" />
                    Most popular
                </div>
                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white rounded-2xl border-2 border-gray-900 p-5 flex flex-col gap-4 shadow-sm overflow-hidden"
                >
                    <div className="flex-1 min-w-0 space-y-3 text-left">
                        <div className="space-y-1">
                            <h3 className="font-bold text-base text-gray-900">Pay via transfer</h3>
                            <p className="text-[11px] text-gray-500">DuitNow QR / Bank transfer</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium whitespace-nowrap">
                                <CheckCircle2 size={13} className="text-gray-700 shrink-0" />
                                <span>Instant verification</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium whitespace-nowrap">
                                <CheckCircle2 size={13} className="text-gray-700 shrink-0" />
                                <span>No extra fees</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/payment/transfer/${orderId}`)}
                        className="jelly-btn btn-transfer w-full shrink-0"
                    >
                        Transfer Now
                    </button>
                </motion.div>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 min-w-0 text-left">
                    <div className="w-12 h-12 bg-[#25D366] rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-100">
                        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.527 5.845L.057 23.882l6.19-1.624A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.724.977.995-3.635-.234-.374A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm text-gray-900">Order via WhatsApp</h3>
                        <p className="text-[11px] text-gray-400">Chat with us to confirm</p>
                    </div>
                </div>
                <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="jelly-btn btn-whatsapp w-full shrink-0"
                >
                    Chat Now
                </a>
            </div>

            {/* FPX */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 opacity-60 overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-white border border-gray-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm p-1.5">
                        <img src="/fpx-logo.png" alt="FPX" className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-[#0055aa] italic font-black text-base">FPX</span>'; }} />
                    </div>
                    <h3 className="font-semibold text-sm text-gray-400 whitespace-nowrap">FPX online banking</h3>
                </div>
                <span className="px-3 py-1.5 bg-gray-100 rounded-full text-[10px] text-gray-400 shrink-0 whitespace-nowrap">Coming Soon</span>
            </div>

            {/* Credit Card (Stripe Mockup) */}
            <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm overflow-hidden"
            >
                <div className="flex items-center gap-4 min-w-0 text-left">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
                        <CreditCard size={24} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-gray-900">Pay via Stripe</h3>
                        <p className="text-[11px] text-gray-500">Visa, Mastercard, American Express</p>
                    </div>
                </div>
                <button
                    onClick={() => router.push(`/payment/stripe/${orderId}`)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-100"
                >
                    Pay with Card
                </button>
            </motion.div>

            {/* Footer */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
                {
                    ['Secure payments', 'Fast order processing', 'Trusted by customers', '24/7 dedicated support'].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-[11px] text-gray-400">
                            <CheckCircle2 size={11} className="text-gray-300 shrink-0" />
                            <span>{item}</span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}