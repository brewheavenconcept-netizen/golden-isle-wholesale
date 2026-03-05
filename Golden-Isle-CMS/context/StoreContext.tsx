'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { StoreSettings } from '@/types';
import { getSettings } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/data/mockData';
import { useStore as useStoreHook, generateSlug } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';

interface StoreContextType {
    settings: StoreSettings;
    storeId: string | null;
    settingsLoading: boolean;
    reload: () => void;
    superAdminStoreId: string | null;
    setSuperAdminStoreId: (id: string | null) => void;
    isSuperAdmin: boolean;
}

const StoreContext = createContext<StoreContextType>({
    settings: DEFAULT_SETTINGS,
    storeId: '00000000-0000-0000-0000-000000000000',
    settingsLoading: false,
    reload: () => { },
    superAdminStoreId: null,
    setSuperAdminStoreId: () => { },
    isSuperAdmin: false,
});

export const useStoreContext = () => useContext(StoreContext);
export const useStore = () => useContext(StoreContext);
export const useStore_Settings = () => useContext(StoreContext);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const { user, isSuperAdmin, loading: authLoading } = useAuth();
    const [superAdminStoreId, setSuperAdminStoreId] = useState<string | null>(null);
    const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
    const [settingsLoading, setSettingsLoading] = useState(false);

    const loadSettings = useCallback(async (storeId: string, canonicalName?: string) => {
        try {
            setSettingsLoading(true);
            const fetchedSettings = await getSettings(storeId);
            setSettings({
                ...DEFAULT_SETTINGS,
                ...fetchedSettings,
                store_name: canonicalName || fetchedSettings.store_name || DEFAULT_SETTINGS.store_name,
                operating_hours: {
                    ...DEFAULT_SETTINGS.operating_hours,
                    ...(fetchedSettings.operating_hours || {}),
                },
            });
        } catch (error) {
            console.error('[StoreContext] Failed to load settings:', error);
            setSettings(DEFAULT_SETTINGS);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        const timer = setTimeout(() => {
            setSettingsLoading(false);
        }, 0);
        return () => clearTimeout(timer);
    }, [authLoading]);

    const reload = useCallback(() => {
        loadSettings('00000000-0000-0000-0000-000000000000');
    }, [loadSettings]);

    return (
        <StoreContext.Provider value={{
            settings,
            storeId: '00000000-0000-0000-0000-000000000000',
            settingsLoading: settingsLoading || authLoading,
            reload,
            superAdminStoreId,
            setSuperAdminStoreId,
            isSuperAdmin
        }}>
            {children}
        </StoreContext.Provider>
    );
}
