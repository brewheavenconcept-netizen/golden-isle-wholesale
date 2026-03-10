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
    pending: { label: '🟡 Pending', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    verifying_payment: { label: '🔍 Awaiting Verification', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
    processing: { label: '⚙️ Processing', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    shipped: { label: '🚚 Shipped', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    delivered: { label: '✅ Delivered', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    confirmed: { label: '✔️ Confirmed', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
    cancelled: { label: '❌ Cancelled', bgColor: 'bg-red-100', textColor: 'text-red-700' },
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
