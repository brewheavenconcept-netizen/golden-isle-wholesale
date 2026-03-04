"use client";

import Link from "next/link";
import { Menu, MessageCircle, GlassWater, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { getWhatsAppLink } from '@/lib/config';

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: "Whisky", href: "#products" },
        { name: "Wine", href: "#products" },
        { name: "Craft Beer", href: "#products" }
    ];

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
                                <MessageCircle className="w-4 h-4" /> WhatsApp Us
                            </motion.button>
                        </Link>
                    </div>

                    {/* Mobile Actions & Hamburger */}
                    <div className="md:hidden flex items-center gap-3">
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
                            className="text-[#1a1a1a] hover:text-[#b8960c] p-1 transition-colors"
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
                                    <button className="w-full bg-[#b8960c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                                        <MessageCircle className="w-5 h-5" /> WhatsApp Us
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
