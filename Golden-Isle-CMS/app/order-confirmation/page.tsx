'use client';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const OrderConfirmationPage = lazy(() => import('@/components/store/OrderConfirmationPage'));

export default function OrderConfirmationRoute() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>}>
            <OrderConfirmationPage />
        </Suspense>
    );
}
