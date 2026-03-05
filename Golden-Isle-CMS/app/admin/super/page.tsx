'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const SuperAdminDashboard = lazy(() => import('@/components/admin/SuperAdminDashboard'));

export default function SuperAdminPage() {
    return (
        <ProtectedRoute requireSuperAdmin>
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                <SuperAdminDashboard />
            </Suspense>
        </ProtectedRoute>
    );
}
