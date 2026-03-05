'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Phone, User, ShoppingBag, ChevronDown, ChevronUp, Clock, Search, Download, Printer, MapPin, CreditCard, FileText, Save, Trash2, CheckSquare, Square, Image, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { getOrders, updateOrderStatus, updateOrderNotes, getSettings, deleteOrders, updatePaymentStatus } from '@/lib/storage';
import { Order } from '@/types';
import { DEFAULT_SETTINGS } from '@/data/mockData';
import toast from 'react-hot-toast';
import OrderStatusDropdown from '@/components/ui/OrderStatusDropdown';
import { useStore } from '@/context/StoreContext';

export default function OrderList() {
    const { storeId } = useStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});

    const [highlightId, setHighlightId] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (storeId) loadData();
        else setLoading(false); // storeId not ready yet — show empty state immediately
    }, [storeId]);

    useEffect(() => {
        const orderId = searchParams.get('orderId');
        if (orderId && orders.length > 0) {
            setHighlightId(orderId);
            setExpandedOrderIds(prev => new Set(prev).add(orderId));

            setTimeout(() => {
                const el = document.getElementById(`order-${orderId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);

            const timer = setTimeout(() => {
                setHighlightId(null);
                router.push('/admin/orders');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [searchParams, orders.length, router]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedOrders, fetchedSettings] = await Promise.all([
                getOrders(storeId!),
                getSettings(storeId!)
            ]);
            setOrders(fetchedOrders);
            setSettings(fetchedSettings);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        setUpdatingOrderId(orderId);
        try {
            await updateOrderStatus(orderId, newStatus, storeId!);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectOrder = (id: string) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (filteredIds: string[]) => {
        if (filteredIds.every(id => selectedOrderIds.has(id))) {
            // Deselect all
            setSelectedOrderIds(prev => {
                const newSet = new Set(prev);
                filteredIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } else {
            // Select all
            setSelectedOrderIds(prev => {
                const newSet = new Set(prev);
                filteredIds.forEach(id => newSet.add(id));
                return newSet;
            });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedOrderIds.size === 0) return;

        if (window.confirm(`Delete ${selectedOrderIds.size} selected orders? This cannot be undone.`)) {
            const idsToDelete: string[] = Array.from(selectedOrderIds);
            try {
                await deleteOrders(idsToDelete, storeId!);

                // Update local state
                setOrders(prev => prev.filter(o => !selectedOrderIds.has(o.id)));
                setSelectedOrderIds(new Set());
                toast.success(`Deleted ${idsToDelete.length} orders`);
            } catch (error) {
                toast.error("Failed to delete orders");
            }
        }
    };

    const handleSaveNotes = async (orderId: string) => {
        const notes = editingNotes[orderId] || '';
        try {
            await updateOrderNotes(orderId, notes, storeId!);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, admin_notes: notes } : o));
            toast.success('Note saved!');
        } catch (error) {
            toast.error("Failed to save note");
        }
    };

    const handlePrint = (order: Order) => {
        setOrderToPrint(order);
        setTimeout(() => {
            window.print();
            setOrderToPrint(null);
        }, 100);
    };

    const exportToCSV = () => {
        const headers = ['Order ID', 'Customer', 'Phone', 'Date', 'Items', 'Total', 'Status'];
        const rows = filteredOrders.map(order => [
            order.id,
            order.customer_name,
            order.customer_phone,
            formatDate(order.created_at),
            order.items?.map(i => `${i.product.name} (x${i.qty})`).join('; ') || '',
            `RM ${(Number(order.total) || 0).toFixed(2)}`,
            order.status
        ]);
        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `brewcart-orders-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported successfully!');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-MY', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Filter by status, search, and date range
    let filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredOrders = filteredOrders.filter(order =>
            order.customer_name?.toLowerCase().includes(q) ||
            order.customer_phone?.includes(searchQuery)
        );
    };

    if (dateFrom) {
        filteredOrders = filteredOrders.filter(order => new Date(order.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filteredOrders = filteredOrders.filter(order => new Date(order.created_at) <= endDate);
    }

    const filteredIds = filteredOrders.map(o => o.id);
    const isAllSelected = filteredOrders.length > 0 && filteredIds.every(id => selectedOrderIds.has(id));

    if (loading) return (
        <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-gray-500">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading orders...</p>
        </div>
    );

    const statusTabs: Array<{ label: string; value: Order['status'] | 'all' }> = [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
    ];



    return (
        <>
            {/* PRINT RECEIPT (hidden, only shows when printing) */}
            {orderToPrint && (
                <div className="print-only hidden">
                    <div className="max-w-2xl mx-auto p-8 bg-white">
                        <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
                            <h1 className="text-3xl font-bold text-slate-900">{settings.store_name}</h1>
                            <p className="text-sm text-slate-600 mt-1">Order Receipt</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                            <div>
                                <p className="font-bold text-slate-700">Order ID:</p>
                                <p className="font-mono text-xs">{orderToPrint.id}</p>
                            </div>
                            <div>
                                <p className="font-bold text-slate-700">Date:</p>
                                <p>{formatDate(orderToPrint.created_at)}</p>
                            </div>
                            <div>
                                <p className="font-bold text-slate-700">Customer:</p>
                                <p>{orderToPrint.customer_name}</p>
                            </div>
                            <div>
                                <p className="font-bold text-slate-700">Phone:</p>
                                <p>{orderToPrint.customer_phone}</p>
                            </div>
                        </div>

                        {orderToPrint.delivery_address && (
                            <div className="mb-6 text-sm">
                                <p className="font-bold text-slate-700">Delivery Address:</p>
                                <p className="text-slate-600">{orderToPrint.delivery_address}</p>
                            </div>
                        )}

                        <table className="w-full mb-6 border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="text-left py-2 font-bold">Item</th>
                                    <th className="text-center py-2 font-bold">Qty</th>
                                    <th className="text-right py-2 font-bold">Price</th>
                                    <th className="text-right py-2 font-bold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderToPrint.items?.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-200">
                                        <td className="py-2">{item.product.name}</td>
                                        <td className="text-center py-2">{item.qty}</td>
                                        <td className="text-right py-2">RM {item.product.price.toFixed(2)}</td>
                                        <td className="text-right py-2">RM {(item.product.price * item.qty).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t-2 border-slate-900 pt-4 space-y-2 text-sm">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>RM {(Number(orderToPrint.total) || 0).toFixed(2)}</span>
                            </div>
                            {orderToPrint.payment_method && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Payment Method:</span>
                                    <span>{orderToPrint.payment_method}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-600">
                                <span>Status:</span>
                                <span className="capitalize">{orderToPrint.status}</span>
                            </div>
                        </div>

                        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
                            <p>Thank you for your order!</p>
                            <p>{settings.whatsapp_number}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT (hidden when printing) */}
            <div className="space-y-6 no-print">
                {/* HEADER WITH SEARCH & EXPORT */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Order History</h2>
                        <span className="text-sm text-slate-500 dark:text-gray-400 mt-1 block">{filteredOrders.length} orders</span>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 text-sm bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            />
                        </div>
                        {selectedOrderIds.size > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-2 h-11 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors"
                            >
                                <Trash2 size={16} />
                                <span className="hidden sm:inline">Delete ({selectedOrderIds.size})</span>
                            </button>
                        )}
                        <button
                            onClick={exportToCSV}
                            disabled={filteredOrders.length === 0}
                            className="flex items-center gap-2 h-11 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* STATUS FILTER TABS */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`h-11 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${statusFilter === tab.value
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white dark:bg-[#111111] text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-200 dark:border-white/10'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* DATE RANGE FILTER & SELECT ALL */}
                <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300">

                    {/* Select All */}
                    <button
                        onClick={() => handleSelectAll(filteredIds)}
                        className="flex items-center gap-3 group"
                    >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isAllSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-gray-600 bg-white dark:bg-[#111111] group-hover:border-blue-400'}`}>
                            {isAllSelected && <CheckSquare size={14} className="text-white" />}
                        </div>
                        <span className={`text-sm font-bold transition-colors ${isAllSelected ? 'text-blue-600' : 'text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>Select All</span>
                    </button>

                    {/* Date Inputs - Grouped Pill */}
                    <div className="flex items-center bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl p-1.5 gap-2 w-full md:w-auto overflow-x-auto">
                        <div className="flex items-center gap-2 pl-2">
                            <Calendar size={16} className="text-slate-400 dark:text-gray-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider hidden sm:inline">From</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-gray-200 focus:ring-0 p-0 w-32 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

                        <div className="flex items-center gap-2 px-2">
                            <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider hidden sm:inline">To</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-gray-200 focus:ring-0 p-0 w-32 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                className="ml-auto p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                        <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-gray-400 font-medium">No orders yet</p>
                        <p className="text-slate-400 dark:text-gray-500 text-sm mt-1">Orders from your customers will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredOrders.map((order, index) => (
                            <div
                                id={`order-${order.id}`}
                                key={`${order.id}-${index}`}
                                className={`rounded-2xl shadow-sm overflow-hidden transition-all duration-500 ${highlightId === order.id
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700'
                                    : selectedOrderIds.has(order.id)
                                        ? 'bg-white dark:bg-[#111111] ring-2 ring-blue-500'
                                        : 'bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10'
                                    }`}
                            >

                                {/* CARD HEADER */}
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => toggleExpand(order.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.has(order.id)}
                                            onChange={() => toggleSelectOrder(order.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white text-base truncate">{order.customer_name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(order.created_at)}</p>
                                        </div>
                                        {expandedOrderIds.has(order.id) ? <ChevronUp size={16} className="text-gray-400 mt-1" /> : <ChevronDown size={16} className="text-gray-400 mt-1" />}
                                    </div>

                                    <div className="my-3 border-t border-gray-100"></div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-bold text-emerald-600 tracking-tight">
                                            RM {(Number(order.total) || 0).toFixed(2)}
                                        </p>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePrint(order);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                title="Print"
                                            >
                                                <Printer size={14} />
                                            </button>
                                            <OrderStatusDropdown
                                                currentStatus={order.status}
                                                orderId={order.id}
                                                onStatusChange={handleStatusChange}
                                                isUpdating={updatingOrderId === order.id}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* DETAIL */}
                                {expandedOrderIds.has(order.id) && (
                                    <div className="border-t border-slate-100 dark:border-white/10 p-3 bg-white dark:bg-[#111111]/50">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {/* LEFT COLUMN */}
                                            <div className="space-y-6">
                                                {/* Customer Details */}
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                                        <User size={16} /> Customer Details
                                                    </h4>
                                                    <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2 text-sm">
                                                        <p><span className="text-slate-500 dark:text-gray-400 w-20 inline-block">Name:</span> <span className="text-slate-900 dark:text-white font-medium">{order.customer_name}</span></p>
                                                        <p><span className="text-slate-500 dark:text-gray-400 w-20 inline-block">Phone:</span>
                                                            <a href={`https://wa.me/${order.customer_phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                                                                <Phone size={12} /> {order.customer_phone}
                                                            </a>
                                                        </p>
                                                        <p><span className="text-slate-500 dark:text-gray-400 w-20 inline-block">Order ID:</span> <span className="font-mono text-xs text-slate-400">{order.id}</span></p>
                                                    </div>
                                                </div>

                                                {/* Delivery Address */}
                                                {order.delivery_address && (
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                                            <MapPin size={16} /> Delivery Address
                                                        </h4>
                                                        <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg text-sm text-slate-700 dark:text-gray-300">
                                                            {order.delivery_address}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Method */}
                                                {order.payment_method && (
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                                            <CreditCard size={16} /> Payment Method
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-medium">
                                                                {order.payment_method === 'bank_transfer' ? 'Bank Transfer' : order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                                                            </div>

                                                            {/* Payment Status */}
                                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${order.payment_status === 'paid' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                                                order.payment_status === 'pending_verification' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                                    'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                                }`}>
                                                                {order.payment_status === 'paid' ? <CheckCircle size={14} /> :
                                                                    order.payment_status === 'pending_verification' ? <Loader2 size={14} className="animate-spin" /> :
                                                                        <AlertCircle size={14} />}
                                                                {order.payment_status === 'paid' ? 'Verified & Paid' :
                                                                    order.payment_status === 'pending_verification' ? 'Pending Verification' :
                                                                        'Unpaid'}
                                                            </div>

                                                            {/* Receipt Image */}
                                                            {order.payment_proof && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                                        <Image size={12} /> Payment Receipt
                                                                    </p>
                                                                    <a
                                                                        href={order.payment_proof}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="block"
                                                                    >
                                                                        <img
                                                                            src={order.payment_proof}
                                                                            alt="Payment Receipt"
                                                                            className="w-full max-w-xs max-h-48 object-contain rounded-lg border border-slate-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                                                                        />
                                                                    </a>
                                                                </div>
                                                            )}

                                                            {/* Verify Payment Button */}
                                                            {order.payment_status === 'pending_verification' && (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        try {
                                                                            await updatePaymentStatus(order.id, 'paid', storeId!);
                                                                            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: 'paid' } : o));
                                                                            toast.success(`Payment verified for ${order.customer_name}`);
                                                                        } catch (err) {
                                                                            toast.error('Failed to verify payment');
                                                                        }
                                                                    }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm transition-colors shadow-sm"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    Verify Payment
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Customer Notes */}
                                                {order.customer_notes && (
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                                            <FileText size={16} /> Customer Notes
                                                        </h4>
                                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg text-sm text-slate-700 dark:text-amber-200">
                                                            {order.customer_notes}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* RIGHT COLUMN */}
                                            <div className="space-y-6">
                                                {/* Items Purchased */}
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                                        <ShoppingBag size={16} /> Items Purchased
                                                    </h4>
                                                    <div className="border border-slate-100 dark:border-white/10 rounded-lg divide-y divide-slate-100 dark:divide-gray-700">
                                                        {order.items && Array.isArray(order.items) ? (
                                                            order.items.map((item: any, idx: number) => (
                                                                <div key={idx} className="p-3 flex justify-between items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-slate-100 dark:bg-gray-700 rounded overflow-hidden">
                                                                            {item.product.images?.[0] && <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-sm text-slate-800 dark:text-gray-200">{item.product.name}</p>
                                                                            <p className="text-xs text-slate-500 dark:text-gray-400">Qty: {item.qty} × RM {item.product.price.toFixed(2)}</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-bold text-sm text-slate-600 dark:text-gray-300">RM {(item.product.price * item.qty).toFixed(2)}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="p-3 text-sm text-slate-400">No item data available.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Admin Notes */}
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                                        <FileText size={16} /> Admin Notes
                                                    </h4>
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={editingNotes[order.id] ?? order.admin_notes ?? ''}
                                                            onChange={(e) => setEditingNotes({ ...editingNotes, [order.id]: e.target.value })}
                                                            placeholder="Add internal notes (e.g., 'Called customer, out for delivery')"
                                                            className="w-full p-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                            rows={3}
                                                        />
                                                        <button
                                                            onClick={() => handleSaveNotes(order.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                                                        >
                                                            <Save size={16} />
                                                            Save Note
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
