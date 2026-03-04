'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Store as StoreIcon, Activity, ExternalLink, Loader2, Search, MessageSquare, Clock, CheckCircle, RefreshCw, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStoreContext } from '@/context/StoreContext';
import { useRouter } from 'next/navigation';

interface StoreClient {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

interface SupportRequest {
    id: string;
    name: string;
    email: string;
    message: string;
    status: 'open' | 'resolved';
    created_at: string;
}

type TabType = 'stores' | 'support';

export default function SuperAdminDashboard() {
    const [stores, setStores] = useState<StoreClient[]>([]);
    const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
    const [loadingStores, setLoadingStores] = useState(true);
    const [loadingSupport, setLoadingSupport] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('stores');
    const [unreadSupport, setUnreadSupport] = useState(0);
    const { setSuperAdminStoreId } = useStoreContext();
    const router = useRouter();

    useEffect(() => {
        loadStores();
        loadSupportRequests();

        // Realtime listener for new support requests
        const channel = supabase
            .channel('super-admin-support')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_requests' },
                (payload) => {
                    const req = payload.new as SupportRequest;
                    setSupportRequests(prev => [req, ...prev]);
                    setUnreadSupport(prev => prev + 1);
                    toast(
                        `📩 Support Request from ${req.name}`,
                        {
                            duration: 8000,
                            icon: '🆘',
                            style: { background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #4338ca' },
                        }
                    );
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const loadStores = async () => {
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('id, name, slug, created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setStores(data || []);
        } catch (err: any) {
            console.error('Failed to load stores:', err);
            toast.error('Failed to load platform data');
        } finally {
            setLoadingStores(false);
        }
    };

    const loadSupportRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('support_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSupportRequests(data || []);
            setUnreadSupport((data || []).filter(r => r.status === 'open').length);
        } catch (err: any) {
            console.error('Failed to load support requests:', err);
        } finally {
            setLoadingSupport(false);
        }
    };

    const resolveRequest = async (id: string) => {
        try {
            const { error } = await supabase
                .from('support_requests')
                .update({ status: 'resolved' })
                .eq('id', id);
            if (error) throw error;
            setSupportRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' as const } : r));
            setUnreadSupport(prev => Math.max(0, prev - 1));
            toast.success('Marked as resolved');
        } catch (err: any) {
            toast.error('Failed to update');
        }
    };

    const filteredStores = stores.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.slug && s.slug.toLowerCase().includes(search.toLowerCase()))
    );

    const handleManageStore = (storeId: string, storeName: string) => {
        setSuperAdminStoreId(storeId);
        toast.success(`Accessing ${storeName}...`);
        router.push('/admin/dashboard');
    };

    return (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-indigo-500" />
                        Platform Super Admin
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all SaaS clients and stores</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <StoreIcon className="w-5 h-5 text-indigo-500" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Stores</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stores.length}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Activity className="w-5 h-5 text-green-500" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">System Status</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">All Systems Operational</p>
                    </div>
                </div>

                <div
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 cursor-pointer hover:border-indigo-400/50 transition-colors"
                    onClick={() => { setActiveTab('support'); setUnreadSupport(0); }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Support Requests</h3>
                        {unreadSupport > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                {unreadSupport} new
                            </span>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {supportRequests.filter(r => r.status === 'open').length}
                        <span className="text-sm text-slate-400 font-medium ml-1">open</span>
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('stores')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'stores'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-400/50'
                        }`}
                >
                    <StoreIcon className="inline w-4 h-4 mr-1.5" />
                    Registered Stores
                </button>
                <button
                    onClick={() => { setActiveTab('support'); setUnreadSupport(0); }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all relative ${activeTab === 'support'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-400/50'
                        }`}
                >
                    <MessageSquare className="inline w-4 h-4 mr-1.5" />
                    Support Requests
                    {unreadSupport > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {unreadSupport}
                        </span>
                    )}
                </button>
            </div>

            {/* ── STORES TAB ── */}
            {activeTab === 'stores' && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white">Registered Stores</h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search client..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {loadingStores ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="p-4 pl-6">Store Name</th>
                                        <th className="p-4">Slug</th>
                                        <th className="p-4">Joined Date</th>
                                        <th className="p-4 text-right pr-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                    {filteredStores.map((store, index) => (
                                        <tr key={`${store.id}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                            <td className="p-4 pl-6">
                                                <div className="font-medium text-slate-900 dark:text-white">{store.name}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5" title={store.id}>{store.id.slice(0, 8)}...</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-mono">
                                                        {store.slug}
                                                    </span>
                                                    <a
                                                        href={`${typeof window !== 'undefined' ? window.location.origin : ''}/store/${store.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-slate-400 hover:text-indigo-500 transition-colors"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                                    {new Date(store.created_at).toLocaleDateString('en-MY', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <button
                                                    onClick={() => handleManageStore(store.id, store.name)}
                                                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                                                >
                                                    <LogIn className="w-3.5 h-3.5" />
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStores.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500">No stores found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── SUPPORT TAB ── */}
            {activeTab === 'support' && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-amber-500" />
                            Support Requests
                        </h2>
                        <button
                            onClick={loadSupportRequests}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {loadingSupport ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : supportRequests.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No support requests yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {supportRequests.map((req, index) => (
                                <div key={`${req.id}-${index}`} className={`p-5 flex flex-col sm:flex-row sm:items-start gap-4 ${req.status === 'open' ? 'bg-amber-500/5' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold text-slate-900 dark:text-white">{req.name}</span>
                                            <span className="text-xs text-slate-400 font-mono">{req.email}</span>
                                            {req.status === 'open' ? (
                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Open
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Resolved
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{req.message}</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {new Date(req.created_at).toLocaleString('en-MY', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    {req.status === 'open' && (
                                        <button
                                            onClick={() => resolveRequest(req.id)}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Mark Resolved
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
