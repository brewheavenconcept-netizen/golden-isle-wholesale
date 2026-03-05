'use client';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const CartPage = lazy(() => import('@/components/store/CartPage'));

export default function CartRoute() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>}>
            <CartPage />
        </Suspense>
    );
}
