'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { Save, CreditCard, Banknote, ShieldCheck, CheckCircle2, Wallet, Building2, ImageIcon, AlertCircle, X, Truck, Landmark, ChevronLeft, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSettings, savePaymentSettings, uploadPaymentQR } from '@/lib/storage';
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
    const [uploading, setUploading] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);

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
        qr_code_url: '',
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
                qr_code_url: settings.qr_code_url || '',
            });
            
            // Auto-expand bank section if enabled
            if (settings.accept_bank_transfer) {
                setExpandedSection('bank');
            }
            
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
            const fullSettings: StoreSettings = {
                ...DEFAULT_SETTINGS,
                ...ctxSettings,
                ...formData,
            };

            await savePaymentSettings(fullSettings, storeId);
            reload();
            toast.success('Payment Settings Saved!');
        } catch (error: any) {
            console.error('[PaymentSettings] Save failed:', error);
            toast.error(error.message || 'Failed to save settings. Please try again.');
        }
        setSaving(false);
    };

    const handleQRUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storeId) return;

        setUploading(true);
        try {
            const url = await uploadPaymentQR(file, storeId);
            setFormData(prev => ({ ...prev, qr_code_url: url }));
            toast.success('QR Code uploaded!');
        } catch (err: any) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

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
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Your customers currently see: <strong>Bank Transfer / DuitNow QR</strong>. You can save your Stripe & ToyyibPay keys now &mdash; they&apos;ll activate automatically when integration is ready.</p>
                </div>
            </div>

            {/* BANK TRANSFER */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1 mt-6">Bank Transfer</h3>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.accept_bank_transfer} 
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setFormData({ ...formData, accept_bank_transfer: isChecked });
                                        setExpandedSection(isChecked ? 'bank' : null);
                                    }} 
                                    className="sr-only" 
                                />
                                <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out ${formData.accept_bank_transfer ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`absolute top-[2px] left-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${formData.accept_bank_transfer ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                            </label>
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
                                    <input 
                                        type="text" 
                                        value={formData.bank_account_number} 
                                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} 
                                        placeholder="1234567890" 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 font-mono" 
                                    />
                                </div>

                                <div className="md:col-span-2 pt-2">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">DuitNow QR Code</label>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                        {formData.qr_code_url ? (
                                            <div className="relative w-24 h-24 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0">
                                                <img src={formData.qr_code_url} alt="QR Code" className="w-full h-full object-contain p-1" />
                                                <button 
                                                    onClick={() => setFormData(prev => ({ ...prev, qr_code_url: '' }))}
                                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                        
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                ref={qrInputRef}
                                                onChange={handleQRUpload}
                                                accept="image/*"
                                                className="hidden" 
                                            />
                                            <button 
                                                onClick={() => qrInputRef.current?.click()}
                                                disabled={uploading}
                                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                            >
                                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                Upload DuitNow QR Code
                                            </button>
                                            <p className="text-[10px] text-slate-500 mt-2">Recommended: Square PNG/JPG, max 2MB.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PAYMENT GATEWAYS */}
            {/* ... (rest of the component remains similar but ensure it uses expandedSection correctly) */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1 mt-6">Payment Gateways</h3>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

                    {/* Stripe Card */}
                    <div>
                        <div onClick={() => setExpandedSection(expandedSection === 'stripe' ? null : 'stripe')} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
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
                                {expandedSection === 'stripe' ? <X size={20} className="text-slate-400" /> : <ChevronLeft size={20} className="text-slate-400 rotate-180" />}
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
                        <div onClick={() => setExpandedSection(expandedSection === 'toyyibpay' ? null : 'toyyibpay')} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
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
                                {expandedSection === 'toyyibpay' ? <X size={20} className="text-slate-400" /> : <ChevronLeft size={20} className="text-slate-400 rotate-180" />}
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
