'use client';

import React, { useEffect, useState } from 'react';
import { getOrders } from '@/lib/storage';
import { Order } from '@/types';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import Skeleton from '@/components/system/Skeleton';
import { useStore } from '@/context/StoreContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
    const { storeId } = useStore();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [revenueData, setRevenueData] = useState({ today: 0, week: 0, month: 0, total: 0 });
    const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
    const [topProducts, setTopProducts] = useState<{ name: string; sales: number }[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<{ status: string; count: number }[]>([]);

    useEffect(() => {
        if (!storeId) return;
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

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {loading ? <Skeleton width="100px" height="32px" /> : `RM ${value.toFixed(2)}`}
                    </h3>
                </div>
                <div className={`p-3 rounded-lg ${color}`}><Icon size={24} className="text-white" /></div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="120px" rounded="lg" />)}
            </div>
            <Skeleton height="400px" rounded="lg" />
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Today's Revenue" value={revenueData.today} icon={DollarSign} color="bg-emerald-500" />
                <StatCard title="This Week" value={revenueData.week} icon={TrendingUp} color="bg-blue-600" />
                <StatCard title="This Month" value={revenueData.month} icon={Calendar} color="bg-orange-500" />
                <StatCard title="Total Revenue" value={revenueData.total} icon={ShoppingBag} color="bg-purple-600" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Daily Revenue (Last 30 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip formatter={(value: any) => `RM ${Number(value).toFixed(2)}`} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Top 5 Products</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="sales" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Order Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="count" label={({ status, percent }: any) => `${status} (${(percent * 100).toFixed(0)}%)`}>
                                {statusDistribution.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/10">
                            <span className="text-slate-600 dark:text-gray-400">Total Orders</span>
                            <span className="font-bold text-slate-900 dark:text-white">{orders.length}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/10">
                            <span className="text-slate-600 dark:text-gray-400">Average Order Value</span>
                            <span className="font-bold text-emerald-600">RM {orders.length > 0 ? (revenueData.total / orders.length).toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/10">
                            <span className="text-slate-600 dark:text-gray-400">Orders This Week</span>
                            <span className="font-bold text-blue-600">{orders.filter(o => new Date(o.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-gray-400">Orders Today</span>
                            <span className="font-bold text-orange-600">{orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
