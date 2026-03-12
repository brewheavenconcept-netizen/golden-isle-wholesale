'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, X, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotificationsContext, NotificationItem } from '@/hooks/useNotifications';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAllAsRead, markAsRead, clearNotification, fetchNotifications } = useNotificationsContext();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchNotifications]);

    const handleItemClick = (n: NotificationItem) => {
        markAsRead(n.id);
        setIsOpen(false);
        router.push(`/admin/orders?orderId=${n.id}`);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div ref={dropdownRef} className="w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer border-l-2 ${isOpen ? "bg-white/10 border-blue-500" : "hover:bg-white/5 border-transparent"}`}
            >
                <div className="relative mt-0.5">
                    {unreadCount > 0
                        ? <BellRing className="w-5 h-5 text-yellow-400 animate-bounce" />
                        : <Bell className="w-5 h-5 text-gray-400" />
                    }
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                </div>
                <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        {unreadCount > 0 && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">{unreadCount}</span>}
                    </div>
                    <p className="text-xs text-gray-400 tracking-wide mt-0.5">Real-time alerts</p>
                </div>
            </button>

            {isOpen && (
                <div className="mx-2 mt-1 mb-2 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow-lg">
                    <div className="p-3 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-300">Recent Orders</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                                <ShoppingBag className="mx-auto h-6 w-6 text-slate-500 mb-2" />
                                <p className="text-xs text-slate-400 font-medium">No new notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {notifications.map((n, index) => (
                                    <div key={`${n.id}-${index}`} className={`p-3 hover:bg-white/5 transition-colors cursor-pointer group ${!n.read ? 'bg-blue-500/10' : ''}`} onClick={() => handleItemClick(n)}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-bold text-xs truncate pr-2 ${!n.read ? 'text-white' : 'text-slate-300'}`}>{n.customerName}</span>
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatTime(n.createdAt)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1.5">
                                            <span className="text-[11px] text-blue-400 font-bold">RM {Number(n.total).toFixed(2)}</span>
                                            <button onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <div className="p-2 border-t border-slate-700">
                            <button onClick={() => { setIsOpen(false); router.push('/admin/orders'); }} className="w-full py-1.5 text-[11px] text-slate-400 font-bold hover:text-white transition-colors">
                                View all orders
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
