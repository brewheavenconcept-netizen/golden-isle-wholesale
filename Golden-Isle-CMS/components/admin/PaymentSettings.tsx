'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { Save, CreditCard, Banknote, ShieldCheck, ChevronRight, ChevronDown, CheckCircle2, Wallet, Building2, ImageIcon, AlertCircle, X, Truck, Landmark, ChevronLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSettings, saveSettings } from '@/lib/storage';
import { useStore } from '@/context/StoreContext';
import { StoreSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/data/mockData';

const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
        {active ? 'Active' : 'Not configured'}
    </span>
);

export default function PaymentSettings() {
    const { storeId, settings: ctxSettings, reload } = useStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        stripe_publishable_key: '',
        stripe_secret_key: '',
        is_stripe_enabled: false,
        toyyibpay_secret_key: '',
        toyyibpay_category_code: '',
        is_toyyibpay_enabled: false,
        accept_cod: false,
        accept_bank_transfer: false,
        bank_name: '',
        bank_holder_name: '',
        bank_account_number: '',
        qr_code_url: ''
    });

    useEffect(() => {
        async function loadPaymentSettings() {
            if (!storeId) return;
            const settings = await getSettings(storeId);
            setFormData({
                stripe_publishable_key: settings.stripe_publishable_key || '',
                stripe_secret_key: settings.stripe_secret_key || '',
                is_stripe_enabled: settings.is_stripe_enabled || false,
                toyyibpay_secret_key: settings.toyyibpay_secret_key || '',
                toyyibpay_category_code: settings.toyyibpay_category_code || '',
                is_toyyibpay_enabled: settings.is_toyyibpay_enabled || false,
                accept_cod: settings.accept_cod ?? false,
                accept_bank_transfer: settings.accept_bank_transfer ?? false,
                bank_name: settings.bank_name || '',
                bank_holder_name: settings.bank_holder_name || '',
                bank_account_number: settings.bank_account_number || '',
                qr_code_url: settings.qr_code_url || ''
            });
            setLoading(false);
        }
        loadPaymentSettings();
    }, [storeId]);

    const handleSave = async () => {
        if (!storeId) {
            toast.error('Store not found. Please refresh.');
            return;
        }
        setSaving(true);
        try {
            // Merge payment-specific fields into full settings object and save
            const fullSettings: StoreSettings = {
                ...DEFAULT_SETTINGS,
                ...ctxSettings,
                ...formData,
            };
            await saveSettings(fullSettings, storeId);
            reload();
            toast.success('Payment Settings Saved!');
            setExpandedSection(null);
        } catch (error) {
            console.error('[PaymentSettings] Save failed:', error);
            toast.error('Failed to save settings. Please try again.');
        }
        setSaving(false);
    };

    const toggleSection = (section: string) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    // StatusBadge moved outside the component

    if (loading) return <div className="p-8 text-slate-400 flex items-center justify-center min-h-[50vh]">Loading Payment Profiles...</div>;

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 pb-24 animate-fade-in">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => window.history.back()} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">Payment Settings <ShieldCheck size={20} className="text-emerald-500" /></h1>
                        <p className="text-sm text-slate-500 py-0.5">Manage how you get paid</p>
                    </div>
                </div>
            </div>

            {/* COMING SOON INFO BANNER */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Online payments (Stripe, ToyyibPay) are coming soon.</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Your customers currently see: <strong>Cash on Delivery</strong> and <strong>Bank Transfer / DuitNow QR</strong>. You can save your Stripe & ToyyibPay keys now &mdash; they&apos;ll activate automatically when integration is ready.</p>
                </div>
            </div>
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">Cash Payments</h3>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Truck size={22} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">Cash on Delivery (COD)</p>
                                <p className="text-xs text-slate-500">Pay by cash when order arrives</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input type="checkbox" checked={formData.accept_cod} onChange={(e) => setFormData({ ...formData, accept_cod: e.target.checked })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* BANK TRANSFER */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1 mt-6">Bank Transfer</h3>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div onClick={() => toggleSection('bank')} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <Landmark size={22} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">{formData.bank_name || 'Bank Transfer / DuitNow'}</p>
                                <p className="text-xs text-slate-500">{formData.bank_account_number ? `Account: ${formData.bank_account_number}` : 'Accept direct transfers'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer mr-2" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={formData.accept_bank_transfer} onChange={(e) => setFormData({ ...formData, accept_bank_transfer: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                            {expandedSection === 'bank' ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                        </div>
                    </div>

                    {expandedSection === 'bank' && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Bank Name</label>
                                    <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="e.g. Maybank, CIMB" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Account Holder</label>
                                    <input type="text" value={formData.bank_holder_name} onChange={(e) => setFormData({ ...formData, bank_holder_name: e.target.value })} placeholder="BrewCart Sdn Bhd" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-blue-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Account Number</label>
                                    <input type="text" value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} placeholder="1234567890" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 font-mono" />
                                </div>
                            </div>

                            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                    <ImageIcon size={14} /> DuitNow QR Code
                                </label>
                                {formData.qr_code_url ? (
                                    <div className="relative inline-block border bg-white dark:bg-slate-800 p-2 rounded-xl">
                                        <Image src={formData.qr_code_url} alt="QR Code" width={128} height={128} className="w-32 h-32 object-contain" />
                                        <button onClick={() => setFormData({ ...formData, qr_code_url: '' })} className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => document.getElementById('qr-upload')?.click()} className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 transition-colors">
                                        <ImageIcon size={18} />
                                        <span className="text-sm font-medium">Upload QR Code (JPG/PNG)</span>
                                    </button>
                                )}
                                <input id="qr-upload" type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onloadend = () => setFormData({ ...formData, qr_code_url: reader.result as string });
                                    reader.readAsDataURL(file);
                                }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PAYMENT GATEWAYS */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1 mt-6">Payment Gateways</h3>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

                    {/* Stripe Card */}
                    <div>
                        <div onClick={() => toggleSection('stripe')} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">Stripe</p>
                                        <StatusBadge active={formData.is_stripe_enabled} />
                                    </div>
                                    <p className="text-xs text-slate-500">Cards, Apple Pay</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                {expandedSection === 'stripe' ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                            </div>
                        </div>
                        {expandedSection === 'stripe' && (
                            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 border p-3 rounded-lg mb-4">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enable Stripe Checkout</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={formData.is_stripe_enabled} onChange={(e) => setFormData({ ...formData, is_stripe_enabled: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Publishable Key</label>
                                    <input type="text" value={formData.stripe_publishable_key} onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 font-mono text-sm" placeholder="pk_test_..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Secret Key</label>
                                    <input type="password" value={formData.stripe_secret_key} onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 font-mono text-sm" placeholder="sk_test_..." />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ToyyibPay Card */}
                    <div>
                        <div onClick={() => toggleSection('toyyibpay')} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                                    <Banknote size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">ToyyibPay</p>
                                        <StatusBadge active={formData.is_toyyibpay_enabled} />
                                    </div>
                                    <p className="text-xs text-slate-500">FPX Online Banking</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                {expandedSection === 'toyyibpay' ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                            </div>
                        </div>
                        {expandedSection === 'toyyibpay' && (
                            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 border p-3 rounded-lg mb-4">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enable FPX via ToyyibPay</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={formData.is_toyyibpay_enabled} onChange={(e) => setFormData({ ...formData, is_toyyibpay_enabled: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">User Secret Key</label>
                                    <input type="password" value={formData.toyyibpay_secret_key} onChange={(e) => setFormData({ ...formData, toyyibpay_secret_key: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 font-mono text-sm" placeholder="e.g. 7d8f... (From Settings)" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Category Code</label>
                                    <input type="text" value={formData.toyyibpay_category_code} onChange={(e) => setFormData({ ...formData, toyyibpay_category_code: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 font-mono text-sm" placeholder="e.g. 8392hs21" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FIXED BOTTOM ACTION BAR */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex justify-end px-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex md:w-auto w-full justify-center items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
            </div>

        </div>
    );
}
