'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import Analytics from '@/components/admin/Analytics';

export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <Analytics />
        </ProtectedRoute>
    );
}
