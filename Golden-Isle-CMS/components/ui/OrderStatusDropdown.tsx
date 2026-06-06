'use client';

import React from 'react';
import { Order } from '@/types';
import { Loader2 } from 'lucide-react';

interface OrderStatusDropdownProps {
    currentStatus: Order['status'];
    orderId: string;
    onStatusChange: (orderId: string, newStatus: Order['status']) => void;
    isUpdating: boolean;
}

const statusConfig: Record<Order['status'], { label: string; bgColor: string; textColor: string }> = {
    pending: { label: '🟡 Pending', bgColor: 'bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md', textColor: 'text-yellow-600 dark:text-yellow-400' },
    payment_submitted: { label: '💵 Payment Submitted', bgColor: 'bg-amber-500/10 border border-amber-500/20 backdrop-blur-md', textColor: 'text-amber-600 dark:text-amber-400' },
    verifying_payment: { label: '🔍 Awaiting Verification', bgColor: 'bg-amber-500/10 border border-amber-500/20 backdrop-blur-md', textColor: 'text-amber-600 dark:text-amber-400' },
    processing: { label: '⚙️ Processing', bgColor: 'bg-blue-500/10 border border-blue-500/20 backdrop-blur-md', textColor: 'text-blue-600 dark:text-blue-400' },
    shipped: { label: '🚚 Shipped', bgColor: 'bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md', textColor: 'text-indigo-600 dark:text-indigo-400' },
    delivered: { label: '✅ Delivered', bgColor: 'bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md', textColor: 'text-emerald-600 dark:text-emerald-400' },
    confirmed: { label: '✔️ Confirmed', bgColor: 'bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md', textColor: 'text-emerald-600 dark:text-emerald-400' },
    cancelled: { label: '❌ Cancelled', bgColor: 'bg-red-500/10 border border-red-500/20 backdrop-blur-md', textColor: 'text-red-600 dark:text-red-400' },
};

export default function OrderStatusDropdown({ currentStatus, orderId, onStatusChange, isUpdating }: OrderStatusDropdownProps) {
    const config = statusConfig[currentStatus] || { label: currentStatus, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
    return (
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
            <select
                value={currentStatus}
                onChange={(e) => onStatusChange(orderId, e.target.value as Order['status'])}
                disabled={isUpdating}
                className={`px-3 py-1.5 pr-7 rounded-xl text-sm font-medium capitalize ${config.bgColor} ${config.textColor} cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 appearance-none border-0`}
            >
                <option value="pending">🟡 Pending</option>
                <option value="payment_submitted">💵 Payment Submitted</option>
                <option value="verifying_payment">🔍 Awaiting Verification</option>
                <option value="processing">⚙️ Processing</option>
                <option value="shipped">🚚 Shipped</option>
                <option value="delivered">✅ Delivered</option>
                <option value="confirmed">✔️ Confirmed</option>
                <option value="cancelled">❌ Cancelled</option>
            </select>
            {isUpdating && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
            )}
        </div>
    );
}
