'use client';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const ProductPage = lazy(() => import('@/components/store/ProductPage'));

export default function ProductRoute() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#d4a853]" />
                    <p className="text-[#6b6b6b] text-sm font-medium tracking-widest uppercase">Loading Product...</p>
                </div>
            </div>
        }>
            <ProductPage />
        </Suspense>
    );
}
