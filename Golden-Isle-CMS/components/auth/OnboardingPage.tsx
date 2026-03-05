'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Store, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export default function OnboardingPage() {
    const [storeName, setStoreName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [storeUrl, setStoreUrl] = useState('');
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) router.replace('/admin/login');
            else setUser(data.user);
        });
    }, [router]);

    // Auto-generate slug from store name
    useEffect(() => {
        if (!slugManuallyEdited && storeName) {
            setSlug(generateSlug(storeName));
        }
    }, [storeName, slugManuallyEdited]);

    const handleSlugChange = (val: string) => {
        setSlugManuallyEdited(true);
        setSlug(generateSlug(val));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!storeName.trim()) { setError('Store name is required.'); return; }
        if (!slug.trim()) { setError('Store URL is required.'); return; }
        if (!user) { setError('Session expired. Please log in again.'); return; }

        setLoading(true);
        try {
            const finalSlug = slug + '-' + user.id.slice(0, 6);

            const { data: store, error: storeErr } = await supabase
                .from('stores')
                .insert([{
                    owner_id: user.id,
                    name: storeName.trim(),
                    slug: finalSlug,
                    subdomain: finalSlug,
                }])
                .select()
                .single();

            if (storeErr) {
                if (storeErr.code === '23505') {
                    setError('That store name is already taken. Please choose a different one.');
                } else {
                    setError(storeErr.message);
                }
                return;
            }

            // Auto-create empty store_settings row
            await supabase.from('store_settings').insert([{
                store_id: store.id,
                store_name: storeName.trim(),
                currency: 'MYR',
                delivery_fee: 0,
                free_delivery_threshold: 0,
            }]);

            const url = `${window.location.origin}/#products`;
            setStoreUrl(url);
            setDone(true);
            toast.success('Your store is ready! 🎉');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
                <div className="w-full max-w-md text-center">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-3">You&apos;re live! 🚀</h2>
                    <p className="text-slate-400 mb-8">Your store has been created. Share your storefront link with customers.</p>

                    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 mb-6 text-left">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your Storefront URL</p>
                        <div className="flex items-center gap-3">
                            <p className="text-blue-400 font-mono text-sm flex-1 truncate">{storeUrl}</p>
                            <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                                <ExternalLink className="w-4 h-4 text-slate-300" />
                            </a>
                        </div>
                    </div>

                    <button suppressHydrationWarning
                        onClick={() => router.replace('/admin/dashboard')}
                        className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25"
                    >
                        Go to Dashboard →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="w-full max-w-md">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                        <Store className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Set Up Your Store</h1>
                    <p className="text-slate-400 mt-2 text-sm">You&apos;re one step away from selling online.</p>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500 text-blue-400 flex items-center justify-center text-xs">✓</div>
                        <span className="text-slate-400">Account created</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-700" />
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                        <span className="text-white font-medium">Store setup</span>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        <form suppressHydrationWarning onSubmit={handleSubmit} className="space-y-5">

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400 font-medium">{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Store Name <span className="text-red-400">*</span>
                                </label>
                                <input suppressHydrationWarning
                                    type="text"
                                    required
                                    maxLength={60}
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="e.g. Ali's Bottle Shop"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Store URL (slug)
                                </label>
                                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                                    <span className="px-3 text-slate-500 text-sm whitespace-nowrap">store/</span>
                                    <input suppressHydrationWarning
                                        type="text"
                                        value={slug}
                                        onChange={(e) => handleSlugChange(e.target.value)}
                                        className="flex-1 h-12 bg-transparent text-white placeholder:text-slate-500 focus:outline-none pr-4 text-sm"
                                        placeholder="ali-bottle-shop"
                                    />
                                </div>
                                {slug && (
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        Slug: <span className="text-blue-400">{slug}-{user?.id?.slice(0, 6) || '...'}</span>
                                    </p>
                                )}
                            </div>

                            <button suppressHydrationWarning
                                type="submit"
                                disabled={loading || !storeName.trim()}
                                className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 mt-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating your store...</>
                                ) : (
                                    'Launch My Store 🚀'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
