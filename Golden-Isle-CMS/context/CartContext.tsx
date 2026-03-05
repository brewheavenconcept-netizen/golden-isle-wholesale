'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, Product } from '@/types';
import { getCart, saveCart as saveToLocalStorage, addToCart as addToStorage, removeFromCart as removeFromStorage, updateCartQty as updateStorageQty, clearCart as clearStorage } from '@/lib/storage';

interface CartContextType {
    cart: CartItem[];
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    addToCart: (product: Product, qty?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQty: (productId: string, qty: number) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Initial load
    useEffect(() => {
        setCart(getCart());

        // Listen for external updates (e.g. from other tabs or if someone uses lib directly)
        const handleUpdate = () => setCart(getCart());
        window.addEventListener('cart-updated', handleUpdate);
        return () => window.removeEventListener('cart-updated', handleUpdate);
    }, []);

    const refreshCart = () => {
        const updated = getCart();
        setCart(updated);
        // Dispatch event for other components not using this context
        window.dispatchEvent(new Event('cart-updated'));
    };

    const handleAddToCart = (product: Product, qty: number = 1) => {
        addToStorage({ product, qty });
        refreshCart();
        setIsCartOpen(true); // Auto-open cart
    };

    const handleRemoveFromCart = (productId: string) => {
        removeFromStorage(productId);
        refreshCart();
    };

    const handleUpdateQty = (productId: string, qty: number) => {
        updateStorageQty(productId, qty);
        refreshCart();
    };

    const handleClearCart = () => {
        clearStorage();
        refreshCart();
    };

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

    return (
        <CartContext.Provider value={{
            cart,
            isCartOpen,
            setIsCartOpen,
            addToCart: handleAddToCart,
            removeFromCart: handleRemoveFromCart,
            updateQty: handleUpdateQty,
            clearCart: handleClearCart,
            totalItems,
            subtotal
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
