'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ChevronLeft } from 'lucide-react';
import PaymentSelection from '@/components/store/PaymentSelection';
import { getOrder } from '@/lib/storage';

export default function PaymentSelectionPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrder = async () => {
            if (orderId) {
                const foundOrder = await getOrder(orderId);
                setOrder(foundOrder);
            }
            setLoading(false);
        };
        loadOrder();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-gray-900 w-8 h-8" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white p-4 text-center">
                <h2 className="text-xl font-bold">Order Not Found</h2>
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-gray-900 text-white rounded-xl">Back to Store</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                <button onClick={() => router.push(`/order-confirmation?orderId=${orderId}`)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ChevronLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-lg font-bold text-gray-800">Payment Method</h1>
            </div>
            
            <div className="py-8">
                <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>}>
                    <PaymentSelection orderId={orderId} amount={order.total} />
                </Suspense>
            </div>
        </div>
    );
}
