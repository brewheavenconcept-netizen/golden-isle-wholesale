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
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#f5f0e8] shadow-2xl z-[101] flex flex-col font-sans"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[#1a1a0e]/10 flex items-center justify-between bg-[#1a1a0e] sticky top-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#C9A84C]/10 text-[#C9A84C] rounded-lg">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold font-serif text-[#f5f0e8]">Your Cart</h2>
                                    <p className="text-xs text-[#f5f0e8]/60 font-medium uppercase tracking-wider">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-[#f5f0e8]/10 rounded-full transition-colors text-[#f5f0e8]/60 hover:text-[#f5f0e8]"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                                    <div className="w-20 h-20 bg-[#1a1a0e]/5 rounded-full flex items-center justify-center">
                                        <ShoppingBag size={40} className="text-[#1a1a0e]/30" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1a1a0e]">Your cart is empty</p>
                                        <p className="text-sm text-[#1a1a0e]/60 max-w-[200px] mx-auto mt-1">Looks like you haven't added anything to your order yet.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="text-[#C9A84C] font-bold text-sm hover:underline"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.product.id} className="flex gap-4 group bg-white shadow-sm p-3 rounded-[12px] border border-[#1a1a0e]/5">
                                        {/* Image */}
                                        <div className="w-20 h-20 bg-[#f5f0e8] rounded-xl overflow-hidden border border-[#1a1a0e]/5 flex-shrink-0 relative">
                                            {item.product.images?.[0] ? (
                                                <img
                                                    src={item.product.images[0]}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover mix-blend-multiply"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#1a1a0e]/20">
                                                    <ShoppingBag size={24} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold font-serif text-[#1a1a0e] text-lg leading-tight truncate pr-2 mt-[-2px]">
                                                        {item.product.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => removeFromCart(item.product.id)}
                                                        className="text-[#1a1a0e]/30 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-[#C9A84C] font-bold text-sm mt-0.5 font-serif">
                                                    RM {item.product.price.toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Qty Controls */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center bg-[#f5f0e8] rounded-lg p-0.5 overflow-hidden border border-[#1a1a0e]/10">
                                                    <button
                                                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                                                        className="p-1.5 hover:bg-white hover:text-[#C9A84C] rounded-md transition-all text-[#1a1a0e]/60"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="w-8 text-center text-xs font-bold text-[#1a1a0e]">
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                                                        className="p-1.5 hover:bg-white hover:text-[#C9A84C] rounded-md transition-all text-[#1a1a0e]/60"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <p className="font-bold text-[#1a1a0e] text-sm font-serif">
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
                            <div className="p-6 bg-white border-t border-[#1a1a0e]/10 space-y-4">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[#1a1a0e]/60 font-medium tracking-wide">Subtotal</span>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold font-serif text-[#1a1a0e] tracking-tight">RM {subtotal.toFixed(2)}</p>
                                        <p className="text-[10px] text-[#1a1a0e]/40 uppercase tracking-widest font-bold mt-1">Exc. Delivery</p>
                                    </div>
                                </div>

                                <Link
                                    href="/checkout"
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-full py-4 bg-[#C9A84C] hover:brightness-110 text-[#1a1a0e] rounded-[12px] font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Proceed to Checkout
                                    <ArrowRight size={20} />
                                </Link>

                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-full text-center text-sm font-bold text-[#1a1a0e]/50 hover:text-[#1a1a0e] transition-colors"
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
