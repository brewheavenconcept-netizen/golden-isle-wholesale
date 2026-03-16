'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export interface NotificationItem {
    id: string;
    customerName: string;
    total: number;
    createdAt: string;
    read: boolean;
}

interface NotificationsContextType {
    unreadCount: number;
    notifications: NotificationItem[];
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
    fetchNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const STORAGE_KEY = 'golden_isle_notifications';
const STORE_ID = '00000000-0000-0000-0000-000000000000';

export function useNotifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const seenOrderIds = useRef<Set<string>>(new Set(notifications.map(n => n.id)));

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        }
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
            console.warn('Audio fallback error:', e);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        let channel: ReturnType<typeof supabase.channel> | null = null;

        const setupChannel = () => {
            channel = supabase
                .channel(`orders-changes-${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'orders'
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
                        playBeep();

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
                .subscribe((status) => {
                    console.log('[Realtime] Status:', status);
                    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setTimeout(setupChannel, 3000);
                    }
                });
        };

        setupChannel();
        fetchNotifications(); // catch any missed orders

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await supabase
                .from('orders')
                .select('id, customer_name, total, created_at')
                .order('created_at', { ascending: false })
                .limit(10);
                
            if (data && Array.isArray(data)) {
                let hasNew = false;
                const newNotes: NotificationItem[] = [];
                for (const order of data) {
                    if (!seenOrderIds.current.has(order.id)) {
                        seenOrderIds.current.add(order.id);
                        hasNew = true;
                        newNotes.push({
                            id: order.id,
                            customerName: order.customer_name || 'Unknown',
                            total: order.total || 0,
                            createdAt: order.created_at || new Date().toISOString(),
                            read: false
                        });
                    }
                }
                if (hasNew) {
                    setNotifications(prev => [...newNotes, ...prev]);
                    playBeep();
                }
            }
        } catch (e) {
            console.error('Failed to fetch missed notifications', e);
        }
    };

    return {
        unreadCount,
        notifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
        fetchNotifications,
    };
}

export function NotificationsProvider({ children, value }: { children: React.ReactNode, value: NotificationsContextType }) {
    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotificationsContext() {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotificationsContext must be used within a NotificationsProvider');
    }
    return context;
}
