'use client';

import { useEffect, useState } from 'react';
import { getProducts, getOrders } from '@/lib/storage';
import { Product, Order } from '@/types';
import { Package, ShoppingBag, DollarSign, TrendingUp, BarChart3, Clock, Calendar } from 'lucide-react';
import Skeleton from '@/components/system/Skeleton';
import { useStore } from '@/context/StoreContext';
import { useTheme } from 'next-themes';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const PIE_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bae6fd'];

const StatCard = ({ title, value, icon: Icon, color, loading }: { title: string, value: string | number, icon: React.ElementType, color: string, loading?: boolean }) => (
    <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 p-6 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)] hover:border-blue-500/20 transition-all duration-300 flex items-start justify-between">
        <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{loading ? <Skeleton width="80px" height="28px" /> : value}</h3>
        </div>
        <div className={`p-3 rounded-xl border ${color} shadow-sm`}>
            <Icon size={20} strokeWidth={2.5} />
        </div>
    </div>
);

export default function Dashboard() {
    const { storeId } = useStore();
    const { theme } = useTheme();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!storeId) return;
        const loadData = async () => {
            const [fetchedProducts, fetchedOrders] = await Promise.all([
                getProducts(storeId),
                getOrders(storeId)
            ]);
            setProducts(fetchedProducts);
            setOrders(fetchedOrders);
            setLoading(false);
        };
        loadData();
    }, [storeId]);

    const ordersList = Array.isArray(orders) ? orders : [];
    const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgOrder = ordersList.length > 0 ? totalRevenue / ordersList.length : 0;
    const pendingOrders = ordersList.filter(o => o.status === 'pending').length;
    const todaysOrders = ordersList.filter(o => {
        if (!o.created_at) return false;
        return new Date(o.created_at).toDateString() === new Date().toDateString();
    }).length;

    const getDailyRevenue = () => {
        const days: { date: string; revenue: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            const rev = ordersList
                .filter(o => o.created_at?.startsWith(key))
                .reduce((s, o) => s + (Number(o.total) || 0), 0);
            days.push({ date: label, revenue: rev });
        }
        return days;
    };

    const getTopProducts = () => {
        const map: Record<string, number> = {};
        ordersList.forEach(o => {
            o.items?.forEach(item => {
                const name = item.product?.name || 'Unknown';
                map[name] = (map[name] || 0) + item.qty;
            });
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, sales]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, sales }));
    };

    const getStatusDist = () => {
        const map: Record<string, number> = {};
        ordersList.forEach(o => {
            const s = o.status || 'pending';
            map[s] = (map[s] || 0) + 1;
        });
        return Object.entries(map).map(([status, count]) => ({ status, count }));
    };

    const dailyRevenue = getDailyRevenue();
    const topProducts = getTopProducts();
    const statusDist = getStatusDist();

    // StatCard moved outside the component

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Business Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={`RM ${totalRevenue.toFixed(2)}`} icon={DollarSign} color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100/30 dark:border-blue-900/20" loading={loading} />
                <StatCard title="Total Orders" value={ordersList.length} icon={ShoppingBag} color="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/20" loading={loading} />
                <StatCard title="Pending Orders" value={pendingOrders} icon={Clock} color="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border-sky-100/30 dark:border-sky-900/20" loading={loading} />
                <StatCard title="Today's Orders" value={todaysOrders} icon={Calendar} color="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-100/30 dark:border-cyan-900/20" loading={loading} />
            </div>
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-blue-600" /> 7-Day Revenue
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={dailyRevenue}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#f1f5f9"} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
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
                                    formatter={(v: number | string | undefined) => [`RM ${Number(v || 0).toFixed(2)}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#2563eb' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={16} className="text-blue-600" /> Top Products
                        </h3>
                        {topProducts.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No product data yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
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
                        )}
                    </div>
                </div>
            )}
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all duration-300">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">Order Status</h3>
                        {statusDist.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No orders yet</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={statusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={4}>
                                            {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-2.5 mt-2 justify-center">
                                    {statusDist.map((s, i) => (
                                        <div key={s.status} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="capitalize">{s.status} ({s.count})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="backdrop-blur-md bg-white/70 dark:bg-[#111111]/70 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 lg:col-span-2 transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                <ShoppingBag size={16} className="text-blue-600" /> Recent Orders
                            </h3>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/30 dark:border-blue-900/20 px-3 py-1.5 rounded-lg">Avg Order: RM {avgOrder.toFixed(2)}</span>
                        </div>
                        {ordersList.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">No orders yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-gray-800">
                                {ordersList.slice(0, 10).map((order) => (
                                    <div key={order.id} className="py-3 flex justify-between items-center hover:bg-slate-50/40 dark:hover:bg-gray-800/10 px-2 rounded-xl transition-colors">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{order.customer_name}</p>
                                            <p className="text-xs text-slate-400 dark:text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-sm text-emerald-600">RM {(Number(order.total) || 0).toFixed(2)}</span>
                                            <p className="text-xs capitalize text-slate-400 dark:text-gray-500 font-medium">{order.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
