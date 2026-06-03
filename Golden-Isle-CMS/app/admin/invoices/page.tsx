'use client';

import ProtectedRoute from '@/components/system/ProtectedRoute';
import InvoiceGenerator from '@/components/admin/InvoiceGenerator';

export default function InvoicesPage() {
    return (
        <ProtectedRoute>
            <InvoiceGenerator />
        </ProtectedRoute>
    );
}
