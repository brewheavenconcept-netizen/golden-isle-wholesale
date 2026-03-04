'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Loader2, Lock, QrCode, Truck } from 'lucide-react';
import { getSettings } from '@/lib/storage';

interface PaymentProps {
    storeId: string;
    amount: number;
    onPay: (method: string) => void;
}

const IMPLEMENTED_METHODS = ['cod', 'bank_transfer'] as const;

export default function PaymentSection({ storeId, amount, onPay }: PaymentProps) {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState<string>('');

    useEffect(() => {
        async function loadSettings() {
            if (!storeId) return;
            const data = await getSettings(storeId);
            setSettings(data);
            if (IMPLEMENTED_METHODS.includes('bank_transfer') && data.accept_bank_transfer) setSelectedMethod('bank_transfer');
            else if (IMPLEMENTED_METHODS.includes('cod') && data.accept_cod) setSelectedMethod('cod');
            setLoading(false);
        }
        loadSettings();
    }, [storeId]);

    if (loading) return <div className="p-4 flex gap-2 text-slate-400"><Loader2 className="animate-spin" /> Checking payment gates...</div>;

    const hasAvailableMethods =
        (IMPLEMENTED_METHODS.includes('cod') && settings?.accept_cod) ||
        (IMPLEMENTED_METHODS.includes('bank_transfer') && settings?.accept_bank_transfer);

    if (!hasAvailableMethods) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                No payment methods available. Please contact admin.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Select Payment Method</h3>
            <div className="grid gap-3">
                {settings.accept_bank_transfer && (
                    <label className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'bank_transfer' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-200'}`}>
                        <input type="radio" name="payment" value="bank_transfer" className="hidden" checked={selectedMethod === 'bank_transfer'} onChange={() => setSelectedMethod('bank_transfer')} />
                        <div className={`p-3 rounded-full ${selectedMethod === 'bank_transfer' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <QrCode size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">Bank Transfer / DuitNow QR</div>
                            <div className="text-xs text-slate-500">Manual verification required</div>
                        </div>
                        {selectedMethod === 'bank_transfer' && <div className="absolute right-4 text-sky-600 font-bold">✓</div>}
                    </label>
                )}
                {settings.accept_cod && (
                    <label className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'cod' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}>
                        <input type="radio" name="payment" value="cod" className="hidden" checked={selectedMethod === 'cod'} onChange={() => setSelectedMethod('cod')} />
                        <div className={`p-3 rounded-full ${selectedMethod === 'cod' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Truck size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">Cash on Delivery (COD)</div>
                            <div className="text-xs text-slate-500">Pay when your order arrives</div>
                        </div>
                        {selectedMethod === 'cod' && <div className="absolute right-4 text-emerald-600 font-bold">✓</div>}
                    </label>
                )}
            </div>
            <button
                onClick={() => onPay(selectedMethod)}
                disabled={!selectedMethod}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
            >
                <Lock size={16} />
                {selectedMethod === 'bank_transfer' ? `Pay RM${amount.toFixed(2)} via Transfer` :
                    selectedMethod === 'cod' ? 'Confirm COD Order' :
                        'Choose Payment Method'}
            </button>
            <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                <Lock size={12} /> Payments are secure and encrypted.
            </p>
        </div>
    );
}
