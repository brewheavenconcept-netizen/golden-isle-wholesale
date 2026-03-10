'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Loader2, Lock, QrCode, Truck } from 'lucide-react';
import { getSettings } from '@/lib/storage';

interface PaymentProps {
    storeId: string;
    amount: number;
    settings: any;
    onPay: (method: string) => void;
}

const IMPLEMENTED_METHODS = ['bank_transfer'] as const;

export default function PaymentSection({ storeId, amount, settings, onPay }: PaymentProps) {
    const [selectedMethod, setSelectedMethod] = useState<string>('');

    useEffect(() => {
        if (!settings) return;
        if (settings.accept_bank_transfer) setSelectedMethod('bank_transfer');
    }, [settings]);

    if (!settings) return <div className="p-4 flex gap-2 text-slate-400"><Loader2 className="animate-spin" /> Preparing payment...</div>;

    const hasAvailableMethods = settings?.accept_bank_transfer;

    if (!hasAvailableMethods) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                No payment methods available. Please contact admin.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <button
                onClick={() => onPay(selectedMethod)}
                disabled={!selectedMethod}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
            >
                <Lock size={16} />
                {selectedMethod === 'bank_transfer' ? `PAY NOW RM${amount.toFixed(2)}` : 'Choose Payment Method'}
            </button>
            <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                <Lock size={12} /> Payments are secure and encrypted.
            </p>
        </div>
    );
}
