'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const AdminProductPage = lazy(() => import('@/components/admin/AdminProductPage'));

export default function ProductsPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                <AdminProductPage />
            </Suspense>
        </ProtectedRoute>
    );
}
