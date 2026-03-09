'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    DollarSign,
    ArrowUpRight,
    ShieldCheck,
    Clock,
    Search,
    LayoutDashboard,
    Banknote,
    User
} from 'lucide-react';

interface Transaction {
    id: string;
    order_id: string;
    amount: number;
    bank_name: string;
    payer_name: string;
    status: string;
    created_at: string;
    is_ai_verified: boolean;
}

export default function PaymentsDashboard() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [totalVolume, setTotalVolume] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Initial Fetch
        fetchInitialData();

        // 2. Real-time Subscription (The RM8k Magic)
        const channel = supabase
            .channel('live_payments')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'simulated_transactions' },
                (payload) => {
                    const newTx = payload.new as Transaction;
                    setTransactions(prev => [newTx, ...prev]);
                    setTotalVolume(prev => prev + Number(newTx.amount));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchInitialData = async () => {
        const { data, error } = await supabase
            .from('simulated_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setTransactions(data);
            const total = data.reduce((acc, curr) => acc + Number(curr.amount), 0);
            setTotalVolume(total);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white p-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Banknote className="text-black" />
                        </div>
                        Fintech <span className="text-amber-500">Ledger</span>
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Real-time gateway monitoring system</p>
                </div>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Gateway Live</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                        <Activity size={18} className="text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full group-hover:bg-amber-500/20 transition-all" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Verified Volume</p>
                    <h2 className="text-4xl font-black">RM {totalVolume.toFixed(2)}</h2>
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-bold">
                        <ArrowUpRight size={16} />
                        <span>+12.5% from last month</span>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] relative overflow-hidden group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Active Transactions</p>
                    <h2 className="text-4xl font-black">{transactions.length}</h2>
                    <p className="text-gray-500 text-sm mt-4">Across all simulated banks</p>
                </div>

                <div className="bg-amber-500 p-8 rounded-[2rem] text-black relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                    <p className="text-black/60 text-xs font-bold uppercase tracking-widest mb-2">System Health</p>
                    <h2 className="text-4xl font-black text-black">99.9%</h2>
                    <p className="text-black/60 text-sm mt-4 font-bold">AI Verification Active</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
                <div className="p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Clock size={20} className="text-amber-500" />
                        Live Transaction Stream
                    </h3>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search Order ID..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:border-amber-500 outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Order ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Bank & User</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence initial={false}>
                                {transactions.map((tx) => (
                                    <motion.tr
                                        key={tx.id}
                                        initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                                        animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                                <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">{tx.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-mono text-xs text-gray-400">
                                            {tx.order_id}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-bold text-lg">RM {Number(tx.amount).toFixed(2)}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500">
                                                    <LayoutDashboard size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{tx.bank_name}</p>
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-wider font-medium">
                                                        <User size={10} /> {tx.payer_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-xs text-gray-500 font-medium whitespace-nowrap">
                                            {new Date(tx.created_at).toLocaleTimeString()}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>

                    {loading && (
                        <div className="p-20 text-center text-gray-500">
                            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                            Synchronizing ledger...
                        </div>
                    )}

                    {!loading && transactions.length === 0 && (
                        <div className="p-20 text-center text-gray-600">
                            No live transactions detected. Start a checkout to see data flow.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
