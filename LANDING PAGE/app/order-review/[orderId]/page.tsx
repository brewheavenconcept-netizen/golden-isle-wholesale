'use client';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const OrderReviewPage = lazy(() => import('@/components/store/OrderReviewPage'));

export default function OrderReviewRoute() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>}>
            <OrderReviewPage />
        </Suspense>
    );
}
