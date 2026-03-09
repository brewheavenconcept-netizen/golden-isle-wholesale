'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Store {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    custom_domain: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateStorePayload {
    name: string;
    slug: string;
    subdomain?: string;
}

interface UseStoreReturn {
    store: Store | null;
    loading: boolean;
    error: string | null;
    createStore: (payload: CreateStorePayload) => Promise<Store | null>;
    refetch: () => Promise<void>;
}

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function useStore(superAdminStoreId?: string | null): UseStoreReturn {
    const { user, isSuperAdmin, loading: authLoading } = useAuth();
    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStore = useCallback(async () => {
        if (authLoading) return;
        if (!user) {
            setStore(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);

            let query = supabase.from('stores').select('*');

            if (isSuperAdmin && superAdminStoreId) {
                // Impersonation mode
                query = query.eq('id', superAdminStoreId);
            } else {
                // Normal mode
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }

            const { data, error: fetchError } = await query.single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setStore(null);
                    setError(null);
                } else {
                    console.error('[useStore] Error fetching store:', fetchError.message);
                    setError(fetchError.message);
                    setStore(null);
                }
            } else {
                setStore(data as Store);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error fetching store';
            console.error('[useStore] Unexpected error:', msg);
            setError(msg);
            setStore(null);
        } finally {
            setLoading(false);
        }
    }, [user, authLoading, isSuperAdmin, superAdminStoreId]);

    useEffect(() => {
        fetchStore();
    }, [fetchStore, superAdminStoreId]);

    const createStore = useCallback(async (payload: CreateStorePayload): Promise<Store | null> => {
        if (!user) return null;
        try {
            setLoading(true);
            setError(null);
            const { data: existing, error: fetchErr } = await supabase
                .from('stores')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .maybeSingle();
            if (fetchErr) console.error('[useStore] Error checking for existing store:', fetchErr.message);
            if (existing) {
                setStore(existing as Store);
                return existing as Store;
            }
            const { data, error: insertError } = await supabase
                .from('stores')
                .insert([{
                    owner_id: user.id,
                    name: payload.name,
                    slug: payload.slug || generateSlug(payload.name),
                    subdomain: payload.subdomain || generateSlug(payload.name),
                }])
                .select()
                .single();
            if (insertError) {
                if (insertError.code === '23505') {
                    const { data: raceData } = await supabase
                        .from('stores')
                        .select('*')
                        .eq('id', '00000000-0000-0000-0000-000000000000')
                        .single();
                    if (raceData) {
                        setStore(raceData as Store);
                        return raceData as Store;
                    }
                }
                setError(insertError.message);
                return null;
            }
            const newStore = data as Store;
            setStore(newStore);
            await supabase.from('store_settings').insert([{
                store_id: newStore.id,
                store_name: newStore.name,
                currency: 'MYR',
                delivery_fee: 0,
                free_delivery_threshold: 0,
            }]);
            return newStore;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error creating store';
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [user]);

    const refetch = useCallback(async () => {
        await fetchStore();
    }, [fetchStore]);

    return { store, loading, error, createStore, refetch };
}
