'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export interface NotificationItem {
    id: string;
    customerName: string;
    total: number;
    createdAt: string;
    read: boolean;
}

interface NotificationsContextValue {
    notifications: NotificationItem[];
    unreadCount: number;
    markAllAsRead: () => void;
    markAsRead: (id: string) => void;
    clearNotification: (id: string) => void;
    addNotification: (n: NotificationItem) => void;
}

const STORAGE_KEY = 'brewcart_notifications';

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

interface NotificationsProviderProps {
    children: React.ReactNode;
    storeId?: string | null;
}

export function NotificationsProvider({ children, storeId }: NotificationsProviderProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
        try {
            if (typeof window === 'undefined') return [];
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const seenOrderIds = useRef<Set<string>>(new Set(notifications.map(n => n.id)));

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }, [notifications]);

    const playBeep = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.warn('[NotificationBell] Audio fallback error:', e);
        }
    };

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => playBeep());
        } else {
            playBeep();
        }
    };

    useEffect(() => {
        // Audio fallback is handled by playBeep() since audioRef.current is null

        if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        let channel: ReturnType<typeof supabase.channel>;

        const setupChannel = () => {
            const insertFilter = storeId ? `store_id=eq.${storeId}` : undefined;
            channel = supabase
                .channel(`orders-notifications-${storeId ?? 'global'}-${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'orders',
                        ...(insertFilter ? { filter: insertFilter } : {}),
                    },
                    (payload) => {
                        const order = payload.new as any;
                        if (seenOrderIds.current.has(order.id)) return;
                        seenOrderIds.current.add(order.id);
                        const newNotification: NotificationItem = {
                            id: order.id,
                            customerName: order.customer_name || 'Unknown',
                            total: order.total_amount || order.total || 0,
                            createdAt: order.created_at || new Date().toISOString(),
                            read: false
                        };
                        setNotifications(prev => [newNotification, ...prev]);
                        playSound();
                        toast.success(
                            `New Order from ${newNotification.customerName}! RM ${Number(newNotification.total).toFixed(2)}`,
                            { duration: 6000, position: 'top-center' }
                        );
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('New Order!', {
                                body: `${newNotification.customerName} - RM ${Number(newNotification.total).toFixed(2)}`,
                                icon: '/pwa-192x192.png',
                            });
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'orders',
                        ...(storeId ? { filter: `store_id=eq.${storeId}` } : {}),
                    },
                    (payload) => {
                        const order = payload.new as any;
                        if (order.status !== 'pending') {
                            setNotifications(prev => prev.filter(n => n.id !== order.id));
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setTimeout(setupChannel, 3000);
                    }
                });
        };

        setupChannel();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [storeId]);

    const unreadCount = notifications.filter(n => !n.read).length;
    const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const clearNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
    const addNotification = (n: NotificationItem) => setNotifications(prev => [n, ...prev]);

    return (
        <NotificationsContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, clearNotification, addNotification }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
    return ctx;
}
