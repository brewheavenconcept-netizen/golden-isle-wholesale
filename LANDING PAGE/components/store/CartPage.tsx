'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCart, updateCartQty, removeFromCart, clearCart } from '@/lib/storage';
import { CartItem } from '@/types';
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CartPage() {
    const [cart, setCart] = useState<CartItem[]>([]);

    const loadCart = () => setCart(getCart());

    useEffect(() => {
        loadCart();
    }, []);

    const notifyCartUpdate = () => window.dispatchEvent(new Event('cart-updated'));

    // Composite key for variant-aware cart operations
    const cartKey = (item: CartItem) =>
        item.product.id + (item.selectedVariant?.label || '');

    const handleQtyChange = (item: CartItem, delta: number) => {
        const newQty = item.qty + delta;
        if (newQty <= 0) {
            removeFromCart(item.product.id);
        } else {
            updateCartQty(item.product.id, newQty);
        }
        loadCart();
        notifyCartUpdate();
    };

    const handleRemove = (item: CartItem) => {
        removeFromCart(item.product.id);
        loadCart();
        notifyCartUpdate();
        toast.success('Item removed');
    };

    const handleClear = () => {
        clearCart();
        loadCart();
        notifyCartUpdate();
        toast.success('Cart cleared');
    };

    // Calculate item price including variant modifier
    const itemPrice = (item: CartItem) =>
        item.product.price + (item.selectedVariant?.priceModifier || 0);

    const total = cart.reduce((sum, c) => sum + itemPrice(c) * c.qty, 0);

    if (cart.length === 0) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-20 text-center">
                <ShoppingBag className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Your cart is empty</h2>
                <p className="text-slate-500 mb-6">Browse our products and add your favorites!</p>
                <Link href="/#products" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">
                    <ArrowLeft size={16} /> Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
                <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-700 font-medium transition">Clear Cart</button>
            </div>

            <div className="space-y-4 mb-8">
                {cart.map(item => (
                    <div key={cartKey(item)} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 w-full">
                        {/* Image */}
                        {item.product.images?.[0] ? (
                            <img src={item.product.images[0]} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 border border-slate-200">
                                <ShoppingBag size={20} />
                            </div>
                        )}

                        {/* Name + Variant + Price */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900 truncate">{item.product.name}</p>
                            {item.selectedVariant && (
                                <p className="text-xs text-slate-500 truncate">{item.selectedVariant.label}</p>
                            )}
                            <p className="text-blue-600 font-semibold text-sm">RM {itemPrice(item).toFixed(2)}</p>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 flex-shrink-0 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button onClick={() => handleQtyChange(item, -1)} className="px-2 py-1 text-slate-500 hover:bg-slate-200 transition">
                                <Minus size={14} />
                            </button>
                            <span className="w-6 text-center font-bold text-sm">{item.qty}</span>
                            <button onClick={() => handleQtyChange(item, 1)} className="px-2 py-1 text-slate-500 hover:bg-slate-200 transition">
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Total */}
                        <p className="text-sm font-bold flex-shrink-0 w-16 text-right text-slate-900 hidden sm:block">
                            RM {(itemPrice(item) * item.qty).toFixed(2)}
                        </p>

                        {/* Remove */}
                        <button onClick={() => handleRemove(item)} className="text-slate-400 hover:text-red-500 transition p-2 flex-shrink-0">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* TOTAL + CHECKOUT */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-medium text-slate-600">Total</span>
                    <span className="text-3xl font-bold text-slate-900">RM {total.toFixed(2)}</span>
                </div>
                <Link
                    href="/checkout"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 transition-all text-center"
                >
                    Proceed to Checkout
                </Link>
                <Link href="/#products" className="block text-center mt-4 text-sm text-slate-500 hover:text-slate-900 font-medium transition">
                    ← Continue Shopping
                </Link>
            </div>
        </div>
    );
}
