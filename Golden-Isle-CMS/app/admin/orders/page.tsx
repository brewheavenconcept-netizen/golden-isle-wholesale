'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const OrderList = lazy(() => import('@/components/admin/OrderList'));

export default function OrdersPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                <OrderList />
            </Suspense>
        </ProtectedRoute>
    );
}
