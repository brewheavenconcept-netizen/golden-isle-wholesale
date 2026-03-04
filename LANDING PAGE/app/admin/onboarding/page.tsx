'use client';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const OnboardingPage = lazy(() => import('@/components/auth/OnboardingPage'));

export default function OnboardingRoute() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}>
            <OnboardingPage />
        </Suspense>
    );
}
