'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import ErrorBoundary from '@/components/system/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from '@/context/StoreContext';
import { NotificationsProvider } from '@/hooks/useNotifications';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { storeId } = useStore();
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register');

    useEffect(() => {
        if (!loading && !user && !isAuthPage) {
            router.push('/admin/login');
        }
    }, [user, loading, isAuthPage, router]);

    if (loading) {
        return <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center text-emerald-500">Loading...</div>;
    }

    if (!user && !isAuthPage) {
        return null; // Prevents flashing the protected content before redirect
    }

    // Auth pages (login/register) don't get the sidebar layout
    if (isAuthPage) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-300">
                <main className="w-full">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
                <Toaster position="top-right" />
            </div>
        );
    }

    return (
        <NotificationsProvider storeId={storeId}>
            <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-300">
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="w-full min-w-0 ml-0 p-6 md:ml-64 mt-14 md:mt-0 bg-slate-50 dark:bg-[#0a0a0a] min-h-screen transition-colors duration-300">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
                <Toaster position="top-right" />
            </div>
        </NotificationsProvider>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <StoreProvider>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </StoreProvider>
    );
}
