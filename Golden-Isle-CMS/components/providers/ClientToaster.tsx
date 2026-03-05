'use client';

import { Toaster } from 'react-hot-toast';
import { usePathname } from 'next/navigation';

/** Root-level Toaster — hidden on all /admin/* routes (the admin layout provides its own). */
export function ClientToaster() {
    const pathname = usePathname();
    if (!pathname || pathname.startsWith('/admin')) return null;
    return <Toaster position="top-right" toastOptions={{ duration: 3000 }} />;
}
