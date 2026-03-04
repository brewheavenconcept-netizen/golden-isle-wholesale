'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreContext } from '@/context/StoreContext';
import { ChevronDown, Store, Check, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StoreOption {
    id: string;
    name: string;
}

export default function StoreSwitcher() {
    const { isSuperAdmin, storeId: currentStoreId, superAdminStoreId, setSuperAdminStoreId } = useStoreContext();
    const [isOpen, setIsOpen] = useState(false);
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (!isSuperAdmin) return;

        const fetchStores = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('stores')
                    .select('id, name')
                    .order('name');
                if (!error && data) {
                    setStores(data);
                }
            } catch (err) {
                console.error("Failed to fetch stores for switcher", err);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && stores.length === 0) {
            fetchStores();
        }
    }, [isSuperAdmin, isOpen, stores.length]);

    if (!isSuperAdmin) return null;

    const currentStore = stores.find(s => s.id === currentStoreId) || { name: 'Select Store', id: currentStoreId };
    if (!currentStore.name && currentStoreId) currentStore.name = "Loading..."; // Fallback while fetching

    const filteredStores = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (storeId: string) => {
        setSuperAdminStoreId(storeId);
        setIsOpen(false);
        setSearch(''); // Reset search
        // Optionally redirect to dashboard to ensure a clean view
        router.push('/admin/dashboard');
    };

    const handleReset = () => {
        setSuperAdminStoreId(null);
        setIsOpen(false);
        router.push('/admin/super');
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-sm"
            >
                <Store className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-white max-w-[120px] truncate">
                    {superAdminStoreId ? currentStore.name : "All Stores (Super)"}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 w-64 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">

                        <div className="p-2 border-b border-white/10">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search stores..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-black/50 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-1">
                            <button
                                onClick={handleReset}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${!superAdminStoreId ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
                            >
                                <span>All Stores Summary</span>
                                {!superAdminStoreId && <Check className="w-4 h-4 text-emerald-500" />}
                            </button>

                            <div className="h-px bg-white/5 my-1 mx-2" />

                            {loading ? (
                                <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
                            ) : filteredStores.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">No stores found.</div>
                            ) : (
                                filteredStores.map(store => (
                                    <button
                                        key={store.id}
                                        onClick={() => handleSelect(store.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${superAdminStoreId === store.id ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
                                    >
                                        <span className="truncate pr-2">{store.name}</span>
                                        {superAdminStoreId === store.id && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
