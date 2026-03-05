'use client';

import React, { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function CartDrawer() {
    const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQty, subtotal, totalItems } = useCart();

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isCartOpen]);

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                        <ShoppingBag size={40} className="text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Your cart is empty</p>
                                        <p className="text-sm text-slate-500 max-w-[200px] mx-auto mt-1">Looks like you haven't added anything to your order yet.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="text-blue-600 font-bold text-sm hover:underline"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.product.id} className="flex gap-4 group">
                                        {/* Image */}
                                        <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 relative">
                                            {item.product.images?.[0] ? (
                                                <img
                                                    src={item.product.images[0]}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <ShoppingBag size={24} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-sm text-slate-900 truncate pr-2">
                                                        {item.product.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => removeFromCart(item.product.id)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-blue-600 font-bold text-sm mt-1">
                                                    RM {item.product.price.toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Qty Controls */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 overflow-hidden border border-slate-200">
                                                    <button
                                                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                                                        className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md transition-all text-slate-500"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="w-8 text-center text-xs font-bold text-slate-700">
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                                                        className="p-1.5 hover:bg-white hover:text-blue-600 rounded-md transition-all text-slate-500"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <p className="font-bold text-slate-900 text-sm">
                                                    RM {(item.product.price * item.qty).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-500 font-medium">Subtotal</span>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-slate-900 tracking-tight">RM {subtotal.toFixed(2)}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Exc. Delivery</p>
                                    </div>
                                </div>

                                <Link
                                    href="/checkout"
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Proceed to Checkout
                                    <ArrowRight size={20} />
                                </Link>

                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Continue Shopping
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
