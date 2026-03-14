"use client";

import Link from "next/link";
import { Menu, MessageCircle, GlassWater, X, User, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { getWhatsAppLink } from '@/lib/config';
import { useCart } from "@/context/CartContext";

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { totalItems, setIsCartOpen } = useCart();

    const navLinks = [
        { name: "Home", href: "#" },
        { name: "Products", href: "#products" },
        { name: "About", href: "#about" },
        { name: "Contact", href: "#contact" }
    ];

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isMobileMenuOpen]);

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="sticky top-0 z-50 w-full glass-panel border-b border-[#e8e4dd] bg-white/80 backdrop-blur-md"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#b8960c] flex items-center justify-center shadow-md">
                            <GlassWater className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-display font-bold text-xl tracking-tight text-[#1a1a1a] leading-tight">
                                Golden Isle
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#b8960c]">
                                Wholesale
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-8">
                        {navLinks.map((item) => (
                            <Link
                                key={item.name}
                                className="text-sm font-medium text-[#6b6b6b] hover:text-[#b8960c] transition-colors"
                                href={item.href}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2.5 text-[#1a1a1a] hover:bg-[#fafaf7] rounded-full transition-all group"
                        >
                            <ShoppingCart className="w-6 h-6 group-hover:text-[#b8960c]" />
                            {totalItems > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-0 right-0 w-5 h-5 bg-[#b8960c] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                                >
                                    {totalItems}
                                </motion.span>
                            )}
                        </motion.button>
                        <Link href="/admin/login">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-[#1a1a1a] hover:bg-[#fafaf7] text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer px-4 py-2 rounded-full"
                            >
                                Login
                            </motion.button>
                        </Link>
                        <Link href={getWhatsAppLink('Hi, I\'m interested in Golden Isle Wholesale products. Can you share your catalog?')} target="_blank" rel="noopener noreferrer">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-[#b8960c] hover:bg-[#d4af37] text-white font-bold px-5 py-2.5 rounded-full text-sm transition-all shadow-[0_4px_14px_rgba(184,150,12,0.3)] flex items-center gap-2 cursor-pointer"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.522 5.854L.057 23.882l6.19-1.438A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.676.853.88-3.574-.234-.369A9.818 9.818 0 1112 21.818z" />
                                </svg>
                                WhatsApp Us
                            </motion.button>
                        </Link>
                    </div>

                    {/* Mobile Actions & Hamburger */}
                    <div className="md:hidden flex items-center gap-3">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 text-[#1a1a1a] hover:bg-[#fafaf7] rounded-full"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#b8960c] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                        <Link href="/admin/login">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                className="text-[#1a1a1a] p-2 hover:bg-[#fafaf7] rounded-full flex items-center gap-1.5"
                            >
                                <User className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Login</span>
                            </motion.button>
                        </Link>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-[#1a1a1a] hover:text-[#b8960c] p-2 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                            aria-label="Toggle Menu"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-[#e8e4dd] overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-1">
                            {navLinks.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="block px-3 py-4 text-base font-medium text-[#1a1a1a] hover:bg-[#fafaf7] rounded-lg border-b border-transparent hover:border-[#d4af37]/20 transition-all"
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="pt-4 flex flex-col gap-3">
                                <Link href={getWhatsAppLink('Hi, I\'m interested in Golden Isle Wholesale products. Can you share your catalog?')} target="_blank" rel="noopener noreferrer" className="w-full">
                                    <button className="w-full bg-[#b8960c] text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.522 5.854L.057 23.882l6.19-1.438A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.676.853.88-3.574-.234-.369A9.818 9.818 0 1112 21.818z" />
                                        </svg>
                                        WhatsApp Us
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
