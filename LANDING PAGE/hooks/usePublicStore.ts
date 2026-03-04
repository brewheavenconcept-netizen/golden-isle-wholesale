'use client';

import { useState, useEffect } from 'react';
import { getSettings } from '@/lib/storage';
import { StoreSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

interface PublicStoreState {
    storeId: string | null;
    settings: StoreSettings;
    loading: boolean;
}

export function usePublicStore(slug?: string): PublicStoreState {
    const [storeId, setStoreId] = useState<string | null>(null);
    const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function resolve() {
            try {
                let storeQuery = supabase.from('stores').select('id, name');
                if (slug) {
                    storeQuery = storeQuery.eq('slug', slug);
                } else {
                    storeQuery = storeQuery.order('updated_at', { ascending: false });
                }
                const { data: storeData } = await storeQuery.limit(1).maybeSingle();
                if (cancelled) return;
                const id = storeData?.id ?? null;
                const canonicalName = storeData?.name;
                setStoreId(id);
                if (id) {
                    const fetchedSettings = await getSettings(id);
                    if (!cancelled) {
                        setSettings({
                            ...DEFAULT_SETTINGS,
                            ...fetchedSettings,
                            ...(canonicalName ? { store_name: canonicalName } : {}),
                        });
                    }
                }
            } catch (e) {
                console.error('[usePublicStore] Failed:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        resolve();
        return () => { cancelled = true; };
    }, [slug]);

    return { storeId, settings, loading };
}
