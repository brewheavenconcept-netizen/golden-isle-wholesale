'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, Inbox, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

type Inquiry = {
    id: string;
    business_name: string;
    contact_person: string | null;
    email: string;
    phone: string | null;
    message: string | null;
    status: 'new' | 'contacted' | 'closed';
    created_at: string;
};

export default function InquiriesDashboard() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        loadInquiries().then((data) => {
            if (data && data.some((i: Inquiry) => i.status === 'new')) {
                markAllAsRead();
            }
        });
    }, []);

    const loadInquiries = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInquiries(data || []);
            return data;
        } catch (error: any) {
            toast.error("Failed to load inquiries: " + error.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('inquiries')
                .update({ status: 'contacted' })
                .eq('status', 'new');

            if (error) throw error;
            
            setInquiries(prev => prev.map(i => i.status === 'new' ? { ...i, status: 'contacted' } : i));
        } catch (error) {
            console.error("Failed to mark inquiries as read:", error);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('inquiries')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success("Status updated!");

            setInquiries(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus as any } : inv));
        } catch (error: any) {
            toast.error("Failed to update status: " + error.message);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRow(prev => prev === id ? null : id);
    };

    const filteredInquiries = inquiries.filter(i =>
        i.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <span className="bg-blue-100/10 text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-1"><Inbox size={12} /> New</span>;
            case 'contacted': return <span className="bg-amber-100/10 text-amber-400 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-1"><Clock size={12} /> Contacted</span>;
            case 'closed': return <span className="bg-green-100/10 text-green-400 border border-green-400/30 px-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-1"><CheckCircle size={12} /> Closed</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inquiries</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage wholesale pricing requests and messages from the Landing Page CTA.</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by business or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm focus:shadow-md"
                    />
                </div>
            </div>

            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300">
                {loading ? (
                    <div className="p-12 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="p-12 text-center">
                        <Inbox className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No inquiries yet</h3>
                        <p className="text-slate-500 dark:text-slate-400">When potential wholesale clients submit the "Get Catalog" form, they will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/40 dark:bg-black/20 backdrop-blur-md border-b border-white/40 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Business</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                                {filteredInquiries.map((inquiry) => (
                                    <React.Fragment key={inquiry.id}>
                                        <tr className={`hover:bg-white/50 dark:hover:bg-white/5 transition-colors ${inquiry.status === 'new' ? 'bg-blue-500/10 dark:bg-blue-500/20 shadow-inner' : ''}`}>
                                            <td className="p-4 whitespace-nowrap">
                                                {new Date(inquiry.created_at).toLocaleDateString()}
                                                <div className="text-xs text-slate-500">{new Date(inquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-slate-900 dark:text-white">{inquiry.business_name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{inquiry.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <div>{inquiry.contact_person || '—'}</div>
                                                <div className="text-xs text-slate-400">{inquiry.phone || '—'}</div>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={inquiry.status}
                                                    onChange={e => updateStatus(inquiry.id, e.target.value)}
                                                    className="bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/40 dark:border-white/10 text-slate-900 dark:text-white text-xs rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                                >
                                                    <option value="new">New</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                                <div className="mt-2 block md:hidden">
                                                    {getStatusBadge(inquiry.status)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="hidden md:block">
                                                        {getStatusBadge(inquiry.status)}
                                                    </div>
                                                    <button
                                                        onClick={() => toggleRow(inquiry.id)}
                                                        className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-400"
                                                    >
                                                        {expandedRow === inquiry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded Row for Message */}
                                        {expandedRow === inquiry.id && (
                                            <tr className="bg-white/40 dark:bg-black/20 backdrop-blur-md">
                                                <td colSpan={5} className="p-4 border-l-4 border-blue-500">
                                                    <div className="pl-2">
                                                        <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">Message Content</h4>
                                                        <p className="text-slate-700 dark:text-white text-sm whitespace-pre-wrap leading-relaxed">
                                                            {inquiry.message || <span className="text-slate-400 dark:text-slate-500 italic">No message provided.</span>}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
