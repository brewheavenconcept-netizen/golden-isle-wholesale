"use client";

import Link from "next/link";
import { Menu, GlassWater, X, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getWhatsAppLink } from '@/lib/config';
import { useCart } from "@/context/CartContext";
import ChatWidget from "@/components/ChatWidget";

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [pin, setPin] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');
    const [logoClicks, setLogoClicks] = useState(0);
    const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { totalItems, setIsCartOpen } = useCart();
    const router = useRouter();

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const next = logoClicks + 1;
        setLogoClicks(next);
        if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
        if (next >= 5) {
            setLogoClicks(0);
            handleLockPress();
        } else {
            logoClickTimer.current = setTimeout(() => setLogoClicks(0), 2000);
        }
    };

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
        return () => { document.body.style.overflow = "unset"; };
    }, [isMobileMenuOpen]);

    const handleLockPress = () => {
        setIsMobileMenuOpen(false);
        setShowOverlay(true);
        setPin('');
        setStatus('idle');
        setTimeout(() => setShowPin(true), 1800);
    };

    const pressNum = (n: string) => {
        if (pin.length >= 4 || status === 'checking') return;
        const next = pin + n;
        setPin(next);
        if (next.length === 4) verifyPin(next);
    };

    const delNum = () => {
        if (status === 'checking') return;
        setPin(p => p.slice(0, -1));
        setStatus('idle');
    };

    const verifyPin = async (code: string) => {
        setStatus('checking');
        try {
            const res = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: code }),
            });
            if (res.ok) {
                setStatus('success');
                setTimeout(() => {
                    setShowOverlay(false);
                    setShowPin(false);
                    setPin('');
                    setStatus('idle');
                    router.push('/admin/login?ref=giv');
                }, 1200);
            } else {
                setStatus('error');
                setTimeout(() => {
                    setPin('');
                    setStatus('idle');
                }, 1200);
            }
        } catch {
            setStatus('error');
            setTimeout(() => { setPin(''); setStatus('idle'); }, 1200);
        }
    };

    const closeOverlay = () => {
        setShowOverlay(false);
        setShowPin(false);
        setPin('');
        setStatus('idle');
    };

    return (
        <>
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="sticky top-0 z-50 w-full glass-panel border-b border-[#e8e4dd] bg-white/80 backdrop-blur-md"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo — click 5x to access admin */}
                        <div onClick={handleLogoClick} className="flex-shrink-0 flex items-center gap-3 cursor-pointer select-none">
                            <img 
                                src="https://uvnngzfhxeeggmaocbws.supabase.co/storage/v1/object/public/product-images/logo_crest.png" 
                                alt="Golden Isle Logo" 
                                className="h-11 w-auto object-contain"
                            />
                            <div className="flex flex-col">
                                <span className="font-display font-extrabold text-lg tracking-wider text-[#1a1a1a] leading-none">
                                    GOLDEN ISLE
                                </span>
                                <span className="text-[9px] uppercase font-black tracking-[0.25em] text-[#b8960c] mt-0.5">
                                    WHOLESALE
                                </span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex space-x-8">
                            {navLinks.map((item) => (
                                <Link key={item.name} className="text-sm font-medium text-[#6b6b6b] hover:text-[#b8960c] transition-colors" href={item.href}>
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
                                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="absolute top-0 right-0 w-5 h-5 bg-[#b8960c] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                        {totalItems}
                                    </motion.span>
                                )}
                            </motion.button>
                            <Link href={getWhatsAppLink("Hi, I'm interested in Golden Isle Wholesale products. Can you share your catalog?")} target="_blank" rel="noopener noreferrer">
                                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    className="bg-[#b8960c] hover:bg-[#d4af37] text-white font-bold px-5 py-2.5 rounded-full text-sm transition-all shadow-[0_4px_14px_rgba(184,150,12,0.3)] flex items-center gap-2 cursor-pointer inline-flex">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.522 5.854L.057 23.882l6.19-1.438A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.676.853.88-3.574-.234-.369A9.818 9.818 0 1112 21.818z" />
                                    </svg>
                                    WhatsApp Us
                                </motion.span>
                            </Link>
                        </div>

                        {/* Mobile Actions & Hamburger */}
                        <div className="md:hidden flex items-center gap-2">
                            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-[#1a1a1a] hover:bg-[#fafaf7] rounded-full">
                                <ShoppingCart className="w-6 h-6" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#b8960c] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {totalItems}
                                    </span>
                                )}
                            </button>
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
                                    <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                                        className="block px-3 py-4 text-base font-medium text-[#1a1a1a] hover:bg-[#fafaf7] rounded-lg border-b border-transparent hover:border-[#d4af37]/20 transition-all">
                                        {item.name}
                                    </Link>
                                ))}
                                <div className="pt-4 flex flex-col gap-3">
                                    <Link href={getWhatsAppLink("Hi, I'm interested in Golden Isle Wholesale products. Can you share your catalog?")} target="_blank" rel="noopener noreferrer" className="w-full">
                                        <span className="w-full bg-[#b8960c] text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.522 5.854L.057 23.882l6.19-1.438A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.676.853.88-3.574-.234-.369A9.818 9.818 0 1112 21.818z" />
                                            </svg>
                                            WhatsApp Us
                                        </span>
                                    </Link>

                                    {/* 🔒 Hidden Admin Access */}
                                    <button
                                        onClick={handleLockPress}
                                        className="w-full flex items-center justify-center gap-2 py-3 text-[#c8c0b0] hover:text-[#b8960c] transition-colors"
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="opacity-40">
                                            <path d="M18 11H6V8a6 6 0 0112 0v3zm-6 8a2 2 0 110-4 2 2 0 010 4zM4 11V8a8 8 0 1116 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1h1z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>

            {/* ── MYSTERIOUS OVERLAY ── */}
            <AnimatePresence>
                {showOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center"
                    >
                        {/* Hex background */}
                        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
                            <g fill="none" stroke="#c8a84b" strokeWidth="0.5">
                                {Array.from({ length: 8 }).map((_, row) =>
                                    Array.from({ length: 6 }).map((_, col) => {
                                        const x = col * 70 + (row % 2 === 0 ? 0 : 35);
                                        const y = row * 60;
                                        const pts = [
                                            `${x + 20},${y}`, `${x + 50},${y}`, `${x + 65},${y + 25}`,
                                            `${x + 50},${y + 50}`, `${x + 20},${y + 50}`, `${x + 5},${y + 25}`
                                        ].join(' ');
                                        return <polygon key={`${row}-${col}`} points={pts} />;
                                    })
                                )}
                            </g>
                        </svg>

                        {/* Close button */}
                        <button onClick={closeOverlay} className="absolute top-6 right-6 text-[#444] hover:text-[#c8a84b] transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        {/* Phase 1: Scanning */}
                        <AnimatePresence mode="wait">
                            {!showPin ? (
                                <motion.div key="scan" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center">
                                    <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                                        <div className="absolute w-28 h-28 rounded-full border border-[#c8a84b]/60" />
                                        <div className="absolute w-36 h-36 rounded-full border border-[#c8a84b]/20" />
                                        <div className="absolute w-44 h-44 rounded-full border border-[#c8a84b]/10" />
                                        <motion.div className="absolute w-32 h-32 rounded-full border-t-[1.5px] border-[#c8a84b]"
                                            animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                                        <svg viewBox="0 0 24 24" fill="#c8a84b" width="40" height="40">
                                            <path d="M18 11H6V8a6 6 0 0112 0v3zm-6 8a2 2 0 110-4 2 2 0 010 4zM4 11V8a8 8 0 1116 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1h1z" />
                                        </svg>
                                    </div>
                                    <p className="text-[#c8a84b] text-[10px] tracking-[4px] uppercase mb-2">Authorised access only</p>
                                    <p className="text-[#c8a84b]/30 text-[8px] tracking-[3px] uppercase">Restricted zone</p>
                                </motion.div>
                            ) : (
                                /* Phase 2: PIN Input */
                                <motion.div key="pin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center w-full px-10">
                                    <p className="text-[#c8a84b]/40 text-[8px] tracking-[4px] uppercase mb-5">Security verification</p>
                                    <p className="text-[#e8d9a0] text-sm text-center italic mb-7 leading-relaxed">
                                        "What is your<br />lucky number?"
                                    </p>

                                    {/* Digit boxes */}
                                    <div className="flex gap-3 mb-6">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className={`w-12 h-14 rounded-lg border flex items-center justify-center text-2xl font-semibold transition-all
                                        ${status === 'error' ? 'border-red-500 text-red-500 bg-red-500/5' :
                                                    status === 'success' ? 'border-green-500 text-green-400 bg-green-500/5' :
                                                        pin.length === i ? 'border-[#c8a84b] bg-[#c8a84b]/10 text-[#c8a84b]' :
                                                            pin[i] ? 'border-[#c8a84b]/40 text-[#c8a84b]' :
                                                                'border-white/10 text-transparent'}`}>
                                                {pin[i] ? '•' : ''}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Status */}
                                    <p className={`text-[9px] tracking-[2px] uppercase mb-5 h-4 transition-all
                                ${status === 'error' ? 'text-red-500' :
                                            status === 'success' ? 'text-green-400' :
                                                status === 'checking' ? 'text-[#c8a84b]/60' :
                                                    'text-[#c8a84b]/20'}`}>
                                        {status === 'error' ? 'Access denied' :
                                            status === 'success' ? 'Identity confirmed' :
                                                status === 'checking' ? 'Verifying...' :
                                                    'Enter 4-digit code'}
                                    </p>

                                    {/* Numpad */}
                                    <div className="grid grid-cols-3 gap-2 w-52">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                                            <button key={n} onClick={() => pressNum(n)}
                                                className="h-12 bg-white/4 border border-white/8 rounded-lg text-[#ccc] text-lg font-medium hover:bg-[#c8a84b]/10 hover:text-[#c8a84b] hover:border-[#c8a84b]/30 active:scale-95 transition-all">
                                                {n}
                                            </button>
                                        ))}
                                        <button onClick={() => pressNum('0')}
                                            className="h-12 bg-white/4 border border-white/8 rounded-lg text-[#ccc] text-lg font-medium hover:bg-[#c8a84b]/10 hover:text-[#c8a84b] hover:border-[#c8a84b]/30 active:scale-95 transition-all">
                                            0
                                        </button>
                                        <button onClick={delNum}
                                            className="col-span-2 h-12 bg-white/4 border border-white/8 rounded-lg text-[#888] text-sm hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all">
                                            ⌫ Del
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Floating Chat Widget ── */}
            <ChatWidget />
        </>
    );
}