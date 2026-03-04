'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import Dashboard from '@/components/admin/Dashboard';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    );
}
