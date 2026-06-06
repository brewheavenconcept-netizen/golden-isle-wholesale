'use client';

import React, { useEffect, useState } from 'react';
import { getOrders } from '@/lib/storage';
import { Order } from '@/types';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, BarChart3 } from 'lucide-react';
import Skeleton from '@/components/system/Skeleton';
import { useStore } from '@/context/StoreContext';
import { useTheme } from 'next-themes';

const PIE_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bae6fd'];

const StatCard = ({ title, value, icon: Icon, color, loading }: { title: string, value: string | number, icon: React.ElementType, color: string, loading?: boolean }) => (
    <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)] hover:border-blue-500/20 transition-all duration-300 flex items-start justify-between flex-1">
        <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{loading ? <Skeleton width="80px" height="28px" /> : value}</h3>
        </div>
        <div className={`p-3 rounded-xl border ${color} shadow-sm`}>
            <Icon size={20} strokeWidth={2.5} />
        </div>
    </div>
);

export default function Analytics() {
    const { storeId } = useStore();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [revenueData, setRevenueData] = useState({ today: 0, week: 0, month: 0, total: 0 });
    const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
    const [topProducts, setTopProducts] = useState<{ name: string; sales: number }[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<{ status: string; count: number }[]>([]);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!storeId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const load = async () => {
            try {
                const fetchedOrders = await getOrders(storeId);
                const safeOrders = Array.isArray(fetchedOrders) ? fetchedOrders : [];
                setOrders(safeOrders);
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const metrics = safeOrders.reduce((acc, order) => {
                    const orderDate = new Date(order.created_at);
                    const amount = Number(order.total) || 0;
                    acc.total += amount;
                    if (orderDate >= todayStart) acc.today += amount;
                    if (orderDate >= weekStart) acc.week += amount;
                    if (orderDate >= monthStart) acc.month += amount;
                    return acc;
                }, { today: 0, week: 0, month: 0, total: 0 });
                setRevenueData(metrics);
                const last30Days = Array.from({ length: 30 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (29 - i));
                    return date.toISOString().split('T')[0];
                });
                const revenueMap = new Map<string, number>();
                last30Days.forEach(date => revenueMap.set(date, 0));
                safeOrders.forEach(order => {
                    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                    if (revenueMap.has(orderDate)) revenueMap.set(orderDate, revenueMap.get(orderDate)! + (Number(order.total) || 0));
                });
                setDailyRevenue(last30Days.map(date => ({
                    date: new Date(date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }),
                    revenue: revenueMap.get(date) || 0,
                })));
                const productSales = new Map<string, number>();
                safeOrders.forEach(order => {
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach((item: any) => {
                            const name = item.product?.name || 'Unknown';
                            productSales.set(name, (productSales.get(name) || 0) + (item.qty || 0));
                        });
                    }
                });
                setTopProducts(Array.from(productSales.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales).slice(0, 5));
                const statusCount = new Map<string, number>();
                safeOrders.forEach(order => {
                    const status = order.status || 'pending';
                    statusCount.set(status, (statusCount.get(status) || 0) + 1);
                });
                setStatusDistribution(Array.from(statusCount.entries()).map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count })));
            } catch (e) {
                console.error("Failed to load analytics data", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [storeId]);

    if (loading) return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Analytics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="120px" rounded="lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton height="350px" rounded="lg" />
                <Skeleton height="350px" rounded="lg" />
            </div>
        </div>
    );

    if (!loading && orders.length === 0) return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Analytics</h2>
            <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 p-16 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-100/30 dark:border-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Data Yet</h3>
                <p className="text-slate-500 dark:text-gray-400 text-sm max-w-sm">Analytics will populate once you start receiving orders. Charts and revenue stats will appear here automatically.</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Analytics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Today's Revenue" value={`RM ${revenueData.today.toFixed(2)}`} icon={DollarSign} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100/30 dark:border-emerald-900/20" loading={loading} />
                <StatCard title="This Week" value={`RM ${revenueData.week.toFixed(2)}`} icon={TrendingUp} color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100/30 dark:border-blue-900/20" loading={loading} />
                <StatCard title="This Month" value={`RM ${revenueData.month.toFixed(2)}`} icon={Calendar} color="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 border-violet-100/30 dark:border-violet-900/20" loading={loading} />
                <StatCard title="Total Revenue" value={`RM ${revenueData.total.toFixed(2)}`} icon={ShoppingBag} color="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/20" loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-600" /> Daily Revenue (Last 30 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyRevenue}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#f1f5f9"} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                            <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 16,
                                    border: '1px solid rgba(59,130,246,0.1)',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                    color: isDark ? '#fff' : '#000',
                                    backdropFilter: 'blur(8px)'
                                }}
                                itemStyle={{ color: isDark ? '#fff' : '#000' }}
                                formatter={(value: any) => [`RM ${Number(value).toFixed(2)}`, 'Revenue']}
                            />
                            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb', strokeWidth: 1 }} activeDot={{ r: 5, fill: '#2563eb' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-600" /> Top 5 Products
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2563eb" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#f1f5f9"} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                            <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 16,
                                    border: '1px solid rgba(59,130,246,0.1)',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                    color: isDark ? '#fff' : '#000',
                                    backdropFilter: 'blur(8px)'
                                }}
                                itemStyle={{ color: isDark ? '#fff' : '#000' }}
                            />
                            <Bar dataKey="sales" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">Order Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie 
                                data={statusDistribution} 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={80} 
                                innerRadius={50} 
                                paddingAngle={4}
                                dataKey="count"
                            >
                                {statusDistribution.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: 16, 
                                    border: 'none', 
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                    color: isDark ? '#fff' : '#000'
                                }} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2.5 mt-2 justify-center">
                        {statusDistribution.map((s, i) => (
                            <div key={s.status} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="capitalize">{s.status} ({s.count})</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-6">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-gray-800">
                                <span className="text-sm text-slate-500 dark:text-gray-400">Total Orders</span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{orders.length}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-gray-800">
                                <span className="text-sm text-slate-500 dark:text-gray-400">Average Order Value</span>
                                <span className="font-bold text-sm text-emerald-600">RM {orders.length > 0 ? (revenueData.total / orders.length).toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-gray-800">
                                <span className="text-sm text-slate-500 dark:text-gray-400">Orders This Week</span>
                                <span className="font-bold text-sm text-blue-600">{orders.filter(o => new Date(o.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-gray-400">Orders Today</span>
                                <span className="font-bold text-sm text-orange-600">{orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
