'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const MarketingSettings = lazy(() => import('@/components/admin/MarketingSettings'));

export default function MarketingPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                <MarketingSettings />
            </Suspense>
        </ProtectedRoute>
    );
}
