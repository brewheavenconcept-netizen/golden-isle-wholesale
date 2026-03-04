'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const PaymentSettings = lazy(() => import('@/components/admin/PaymentSettings'));

export default function PaymentPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                <PaymentSettings />
            </Suspense>
        </ProtectedRoute>
    );
}
