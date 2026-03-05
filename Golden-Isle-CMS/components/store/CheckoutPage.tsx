'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCart, getProducts, createOrderWithStockCheck, clearCart } from '@/lib/storage';
import { CartItem, Order, StoreSettings } from '@/types';
import { ChevronLeft, Truck, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentSection from '@/components/store/PaymentSection';
import { usePublicStore } from '@/hooks/usePublicStore';

export default function CheckoutPage() {
    const router = useRouter();
    // usePublicStore — no auth required, works for unauthenticated customers
    const { storeId, settings: publicSettings, loading: storeLoading } = usePublicStore();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    const [stockError, setStockError] = useState<string | null>(null);
    const [products, setProducts] = useState<any[]>([]);

    // Sync settings from public store hook
    useEffect(() => {
        if (publicSettings) setSettings(publicSettings as StoreSettings);
    }, [publicSettings]);

    useEffect(() => {
        if (storeLoading || !storeId) return;
        const init = async () => {
            const currentCart = getCart();
            setCart(currentCart);

            try {
                const fetchedProducts = await getProducts(storeId!);
                setProducts(fetchedProducts);

                if (currentCart.length === 0) {
                    router.push('/cart');
                    return;
                }

                validateStock(currentCart, fetchedProducts);
            } catch (error) {
                console.error("Failed to load checkout data", error);
                toast.error("Failed to load checkout data");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [storeId, storeLoading, router]);

    const validateStock = (currentCart: CartItem[], currentProducts: any[]) => {
        for (const item of currentCart) {
            const product = currentProducts.find(p => p.id === item.product.id);
            if (!product) continue;
            if (product.stock_status === 'out_of_stock') {
                setStockError(`${product.name} is currently out of stock. Please update your cart.`);
                return false;
            }
        }
        setStockError(null);
        return true;
    };

    const handleProcessPayment = async (method: string) => {
        if (!cart.length) return;
        if (!settings) return;

        const form = document.getElementById('checkout-form') as HTMLFormElement;
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!fullName || !phone || !address) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (!method) {
            toast.error('Please select a payment method');
            return;
        }

        setIsSubmitting(true);

        try {
            const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
            const deliveryFee = subtotal >= (settings.free_delivery_threshold || Infinity) ? 0 : (settings.delivery_fee || 0);
            const total = subtotal + deliveryFee;

            const newOrder: Order = {
                id: `ORD-${Date.now()}`,
                customer_name: fullName,
                customer_phone: phone,
                delivery_address: address,
                customer_notes: notes,
                items: cart.map(item => ({
                    product: item.product,
                    qty: item.qty
                })),
                subtotal,
                delivery_fee: deliveryFee,
                total: total,
                status: 'pending',
                created_at: new Date().toISOString(),
                payment_method: method,
                payment_proof: undefined,
                payment_status: 'unpaid'
            };

            // Atomic: validate stock + create order + deduct stock in one call
            const result = await createOrderWithStockCheck(newOrder, storeId!);

            if ('error' in result) {
                setStockError(result.error);
                setIsSubmitting(false);
                toast.error(result.error);
                return;
            }

            clearCart();

            const orderReviewLink = `${window.location.origin}/order-review/${newOrder.id}`;

            const itemsList = cart.map(c => `• ${c.product.name} x${c.qty}`).join('\n');
            const methodLabel = method === 'bank_transfer' ? 'Bank Transfer' : method === 'duitnow' ? 'DuitNow QR' : method === 'stripe' ? 'Credit/Debit Card' : method === 'toyyibpay' ? 'FPX Banking' : 'Cash on Delivery';
            const message = `✅ *New Order Received!* \n\n` +
                `*Order ID:* ${newOrder.id}\n` +
                `*Customer:* ${fullName}\n` +
                `*Phone:* ${phone}\n` +
                `*Address:* ${address}\n\n` +
                `*Items:*\n${itemsList}\n\n` +
                `*Total:* RM ${total.toFixed(2)}\n` +
                `*Payment:* ${methodLabel}\n` +
                `*Notes:* ${notes || 'None'}\n\n` +
                `📋 *Order Review Link:*\n${orderReviewLink}\n\n` +
                `Please process this request. Thank you!`;

            const whatsappNumber = settings?.whatsapp_number || '60123456789';
            const adminPhone = whatsappNumber.replace(/[^0-9]/g, '');

            // Commenting out the auto WhatsApp redirection so users see the payment QR / Bank info first.
            // if (adminPhone) {
            //     window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
            // }

            if (method === 'toyyibpay') {
                toast.loading('Initializing FPX Payment...', { id: 'payment' });

                const { data, error } = await supabase.functions.invoke('toyyibpay-create-bill', {
                    body: {
                        amount: total,
                        orderId: newOrder.id,
                        storeId: storeId || '1',
                        customerName: fullName,
                        customerEmail: 'customer@brewcart-demo.com',
                        customerPhone: phone
                    }
                });

                if (error || !data?.url) {
                    console.error("ToyyibPay Error:", error || data);
                    toast.error('Failed to connect to Bank. Please try again.', { id: 'payment' });
                    return;
                }

                toast.success('Redirecting to Bank...', { id: 'payment' });
                window.location.href = data.url;

            } else if (method === 'stripe') {
                toast.loading('Opening Secure Checkout...', { id: 'payment' });

                const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                    body: {
                        amount: total,
                        orderId: newOrder.id,
                        storeId: storeId || '1',
                        items: cart,
                        customerEmail: 'customer@brewcart-demo.com'
                    }
                });

                if (error || !data?.url) {
                    console.error("Stripe Error:", error || data);
                    toast.error('Failed to initialize secure checkout.', { id: 'payment' });
                    return;
                }

                toast.success('Redirecting to Stripe...', { id: 'payment' });
                window.location.href = data.url;

            } else {
                toast.success('Order Placed Successfully!');
                router.push(`/order-confirmation?orderId=${newOrder.id}`);
            }

        } catch (error: any) {
            console.error("Order Submission Error:", error);
            toast.error(`Failed to place order: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !settings) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
    const deliveryFee = subtotal >= (settings.free_delivery_threshold || Infinity) ? 0 : (settings.delivery_fee || 0);
    const total = subtotal + deliveryFee;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.push('/cart')} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-bold text-slate-800">Checkout</h1>
            </div>

            <div className="max-w-xl mx-auto p-4 space-y-6">

                {stockError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700">
                        <AlertCircle className="shrink-0 mt-0.5" size={20} />
                        <p className="text-sm font-medium">{stockError}</p>
                    </div>
                )}

                <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <h2 className="font-bold text-slate-800">Order Summary</h2>
                    </div>
                    <div className="p-4 space-y-3">
                        {cart.map((item, index) => (
                            <div key={`${item.product.id}-${index}`} className="flex gap-3">
                                <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                    {item.product.images?.[0] && <img src={item.product.images[0]} className="w-full h-full object-cover" alt={item.product.name} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-slate-900 truncate">{item.product.name}</h3>
                                    <p className="text-xs text-slate-500">Qty: {item.qty}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-slate-900">RM {(item.product.price * item.qty).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                        <div className="border-t border-slate-100 pt-3 space-y-1">
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Subtotal</span>
                                <span>RM {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Delivery</span>
                                <span>{deliveryFee === 0 ? 'FREE' : `RM ${deliveryFee.toFixed(2)}`}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 pt-1">
                                <span>Total</span>
                                <span>RM {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <form id="checkout-form" onSubmit={(e) => e.preventDefault()} className="space-y-6">
                    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <Truck size={18} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800">Delivery Details</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                    placeholder="e.g. 012-3456789"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={3}
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900"
                                    placeholder="Enter full address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Special Notes (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900"
                                    placeholder="Any specific instructions?"
                                />
                            </div>
                        </div>
                    </section>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        {isSubmitting ? (
                            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                                <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
                                <p>Processing your order...</p>
                            </div>
                        ) : (
                            <PaymentSection
                                storeId={storeId!}
                                amount={total}
                                onPay={handleProcessPayment}
                            />
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
