'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const MetaCatalogPortal = lazy(() => import('@/components/admin/MetaCatalogPortal'));

export default function MetaCatalogPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                <MetaCatalogPortal />
            </Suspense>
        </ProtectedRoute>
    );
}
