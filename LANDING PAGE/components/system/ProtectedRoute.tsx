'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/context/StoreContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireSuperAdmin }: ProtectedRouteProps) {
    const { user, isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const loading = authLoading;

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace(`/admin/login?from=${encodeURIComponent(pathname)}`);
            return;
        }
        if (requireSuperAdmin && !isSuperAdmin) {
            router.replace('/admin/dashboard');
        }
    }, [loading, user, isSuperAdmin, requireSuperAdmin, pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Verifying access...</p>
            </div>
        );
    }

    if (!user) return null;
    if (requireSuperAdmin && !isSuperAdmin) return null;

    return <>{children}</>;
}
