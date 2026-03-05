'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

const superAdminCache: Record<string, boolean> = {};
const superAdminPending: Record<string, Promise<boolean> | undefined> = {};

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const checkSuperAdmin = async (userId: string | undefined) => {
            if (!userId) {
                if (mounted) setIsSuperAdmin(false);
                return;
            }
            if (userId in superAdminCache) {
                if (mounted) setIsSuperAdmin(superAdminCache[userId]);
                return;
            }
            if (superAdminPending[userId]) {
                const result = await superAdminPending[userId];
                if (mounted) setIsSuperAdmin(result);
                return;
            }
            superAdminPending[userId] = (async () => {
                try {
                    const { data, error } = await supabase
                        .from('super_admins')
                        .select('id')
                        .eq('id', userId)
                        .maybeSingle();
                    const isSuper = !!data && !error;
                    superAdminCache[userId] = isSuper;
                    return isSuper;
                } catch (err) {
                    console.error('Super admin check failed:', err);
                    return false;
                }
            })();
            const result = await superAdminPending[userId];
            if (mounted) setIsSuperAdmin(result);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            checkSuperAdmin(session?.user?.id).then(() => {
                if (mounted) setLoading(false);
            });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            checkSuperAdmin(session?.user?.id).then(() => {
                if (mounted) setLoading(false);
            });
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        setLoading(true);
        setIsSuperAdmin(false);
        await supabase.auth.signOut();
        setLoading(false);
    };

    return { user, session, isSuperAdmin, loading, signOut };
}
