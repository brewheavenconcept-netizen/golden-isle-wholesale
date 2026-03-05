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

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

const StatCard = ({ title, value, icon: Icon, color, loading }: { title: string, value: string | number, icon: React.ElementType, color: string, loading?: boolean }) => (
    <div className="bg-white dark:bg-[#111111] p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-start justify-between transition-colors duration-300">
        <div>
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{loading ? <Skeleton width="80px" height="28px" /> : value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${color} text-white`}>
            <Icon size={20} />
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
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Business Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={`RM ${totalRevenue.toFixed(2)}`} icon={DollarSign} color="bg-emerald-500" loading={loading} />
                <StatCard title="Total Orders" value={ordersList.length} icon={ShoppingBag} color="bg-blue-600" loading={loading} />
                <StatCard title="Pending Orders" value={pendingOrders} icon={Clock} color="bg-orange-500" loading={loading} />
                <StatCard title="Today's Orders" value={todaysOrders} icon={Calendar} color="bg-purple-500" loading={loading} />
            </div>
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 transition-colors duration-300">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-blue-600" /> 7-Day Revenue
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={dailyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#f1f5f9"} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                                <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                        color: isDark ? '#fff' : '#000'
                                    }}
                                    itemStyle={{ color: isDark ? '#fff' : '#000' }}
                                    formatter={(v: number | string | undefined) => [`RM ${Number(v || 0).toFixed(2)}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 transition-colors duration-300">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={16} className="text-emerald-600" /> Top Products
                        </h3>
                        {topProducts.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No product data yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={topProducts}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#f1f5f9"} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                                    <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#333" : "#e2e8f0"} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            backgroundColor: isDark ? '#1a1a1a' : '#fff',
                                            color: isDark ? '#fff' : '#000'
                                        }}
                                        itemStyle={{ color: isDark ? '#fff' : '#000' }}
                                    />
                                    <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 transition-colors duration-300">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">Order Status</h3>
                        {statusDist.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No orders yet</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={statusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3}>
                                            {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-3 mt-2 justify-center">
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
                    <div className="bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 lg:col-span-2 transition-colors duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                <ShoppingBag size={16} className="text-blue-600" /> Recent Orders
                            </h3>
                            <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2 py-1 rounded">Avg Order: RM {avgOrder.toFixed(2)}</span>
                        </div>
                        {ordersList.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">No orders yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-gray-700">
                                {ordersList.slice(0, 10).map((order) => (
                                    <div key={order.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{order.customer_name}</p>
                                            <p className="text-xs text-slate-500 dark:text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-sm text-emerald-600">RM {(Number(order.total) || 0).toFixed(2)}</span>
                                            <p className="text-xs capitalize text-slate-400 dark:text-gray-500">{order.status}</p>
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
