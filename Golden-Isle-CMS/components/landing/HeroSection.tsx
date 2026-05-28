"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, CheckCircle2, GlassWater, Wine } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import PremiumBottle3D from "@/components/ui/PremiumBottle3D";
import { getWhatsAppLink } from '@/lib/config';
import { useState, useEffect } from "react";

// @ts-ignore
const MotionLink = motion.create ? motion.create(Link) : motion(Link);

const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 },
    },
};

export function HeroSection() {
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        const handleToggle = (e: Event) => {
            setIsChatOpen((e as CustomEvent).detail.isOpen);
        };
        window.addEventListener("golden-chat-toggle", handleToggle);
        return () => window.removeEventListener("golden-chat-toggle", handleToggle);
    }, []);

    return (
        <section className="relative min-h-[720px] lg:min-h-[820px] pt-24 pb-32 lg:pt-36 lg:pb-40 bg-[#faf9f6] overflow-hidden">

            {/* ── Ambient warm glow — radiates from right where bottles are ── */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 65% 80% at 80% 50%, rgba(212,175,55,0.11) 0%, rgba(212,175,55,0.04) 45%, transparent 70%)",
                }}
            />

            {/* ── Environmental bottle artwork — fills right half, bleeds edges ── */}
            <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[70%] lg:w-[52%] -z-0 opacity-25 sm:opacity-35 lg:opacity-100"
                style={{
                    // Gradient mask: left edge fades to transparent so bottles
                    // dissolve into the cream background — NO visible box edge
                    WebkitMaskImage:
                        "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.85) 38%, black 55%)",
                    maskImage:
                        "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 18%, rgba(0,0,0,0.85) 38%, black 55%)",
                }}
            >
                <PremiumBottle3D
                    src="/hero-bottles.png"
                    alt="Premium Wholesale Bottles"
                    className="w-full h-full"
                    imageClassName="object-cover object-right sm:object-left"
                />
            </motion.div>

            {/* ── Right-edge vignette — soft fade into page right ── */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-24 -z-0"
                style={{
                    background:
                        "linear-gradient(to right, transparent 0%, #faf9f6 100%)",
                }}
            />

            {/* ── Bottom vignette — bottles blend into the next section ── */}
            <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 inset-x-0 h-32 -z-0"
                style={{
                    background:
                        "linear-gradient(to bottom, transparent 0%, #faf9f6 100%)",
                }}
            />

            {/* ── Text column — left, above artwork layer ── */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="max-w-xl space-y-8"
                >
                    {/* Eyebrow */}
                    <motion.div
                        variants={fadeInUp}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-[#e8e4dd] shadow-sm backdrop-blur-sm"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-[#b8960c] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest">
                            Labuan Duty-Free Zone
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        variants={fadeInUp}
                        className="font-display text-5xl lg:text-[4.5rem] xl:text-[5rem] font-bold tracking-tight text-[#1a1a1a] leading-[1.04]"
                    >
                        Premium Whisky<br />
                        &amp; Rare Wines,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8960c] to-[#d4af37]">
                            Wholesale Prices
                        </span>
                    </motion.h1>

                    {/* Body */}
                    <motion.p
                        variants={fadeInUp}
                        className="text-[1.05rem] text-[#6b6b6b] leading-relaxed max-w-md"
                    >
                        Direct access to premium duty-free wholesale beverages for hotels,
                        restaurants, and fastidious collectors. Authentic provenance and
                        rapid logistics across Malaysia.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        variants={fadeInUp}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-2 w-full sm:w-auto"
                    >
                        <MotionLink
                            href="#products"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white font-bold px-9 py-4 rounded-full text-[0.95rem] transition-all shadow-xl"
                        >
                            Browse Products <ArrowDown className="w-4 h-4" />
                        </MotionLink>
                        <MotionLink
                            href={getWhatsAppLink("Hi, I'm interested in Golden Isle Wholesale products. Can you share your catalog?")}
                            target="_blank"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e8e4dd] text-[#1a1a1a] px-8 py-4 rounded-full text-[0.95rem] font-bold hover:border-[#b8960c] hover:text-[#b8960c] transition-all"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.522 5.854L.057 23.882l6.19-1.438A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.676.853.88-3.574-.234-.369A9.818 9.818 0 1112 21.818z" />
                            </svg>
                            WhatsApp Us
                        </MotionLink>
                    </motion.div>

                    {/* Trust badges */}
                    <motion.div
                        variants={fadeInUp}
                        className="pt-6 flex flex-wrap items-center gap-x-7 gap-y-3"
                    >
                        {["100% Authentic", "Fast Delivery", "Duty-Free Pricing"].map((text, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b8960c]/10">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#b8960c]" />
                                </div>
                                <span className="text-[12px] font-bold text-[#1a1a1a]/70 uppercase tracking-wide">
                                    {text}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>

            {/* ── Live Inventory Card — anchored bottom-right inside the scene ── */}
            <AnimatePresence>
                {!isChatOpen && (
                    <>
                        {/* Desktop version (Full Card) */}
                        <motion.div
                            initial={{ opacity: 0, y: 32, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.96 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="hidden lg:block absolute bottom-10 right-14 xl:right-20 z-20 w-[360px]"
                            style={{
                                background: "rgba(255,255,255,0.82)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                border: "1px solid rgba(255,255,255,0.55)",
                                borderRadius: "2rem",
                                boxShadow: "0 24px 56px -12px rgba(0,0,0,0.10), 0 0 0 1px rgba(232,228,221,0.5)",
                            }}
                        >
                            {/* Card inner */}
                            <div className="p-5">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-4 pb-3.5 border-b border-[#f3f0ea]">
                                    <h3 className="text-[10px] font-black text-[#1a1a1a] tracking-[0.18em] flex items-center gap-2.5 uppercase">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-[#b8960c]" />
                                        Live Inventory
                                    </h3>
                                    <span className="text-[9px] font-bold text-[#6b6b6b] bg-[#fafaf7] border border-[#e8e4dd] px-2.5 py-1 rounded-full uppercase tracking-widest">
                                        Updated just now
                                    </span>
                                </div>

                                {/* Items */}
                                <div className="space-y-3">
                                    <div className="group flex items-center justify-between bg-white hover:bg-[#faf9f6]/70 border border-[#eeebe4] p-3 rounded-2xl transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#faf9f6] border border-[#e8e4dd] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <GlassWater className="w-5 h-5 text-[#b8960c]" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#1a1a1a] text-[13px] leading-tight">Macallan 18yr</div>
                                                <div className="text-[10px] text-[#6b6b6b] mt-0.5">Single Malt Whisky</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-[#b8960c] text-[13px]">RM 850.00</div>
                                            <div className="text-[9px] font-black mt-1 bg-[#b8960c] text-white px-2 py-0.5 rounded uppercase tracking-tighter">Exclusive</div>
                                        </div>
                                    </div>

                                    <div className="group flex items-center justify-between bg-white hover:bg-[#faf9f6]/70 border border-[#eeebe4] p-3 rounded-2xl transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#faf9f6] border border-[#e8e4dd] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Wine className="w-5 h-5 text-[#b8960c]" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#1a1a1a] text-[13px] leading-tight">Penfolds Bin 389</div>
                                                <div className="text-[10px] text-[#6b6b6b] mt-0.5">Cabernet Shiraz</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-[#1a1a1a] text-[13px]">RM 320.00</div>
                                            <div className="text-[9px] font-black mt-1 bg-[#6b6b6b] text-white px-2 py-0.5 rounded uppercase tracking-tighter">Fast Moving</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-3.5 border-t border-[#f3f0ea] text-center">
                                    <span className="text-[9px] font-bold text-[#6b6b6b] uppercase tracking-widest flex items-center justify-center gap-2">
                                        More arrivals coming soon!
                                        <motion.span
                                            animate={{ x: [0, 5, 0] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        >
                                            <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
                                        </motion.span>
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile version (Compact Badge) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="lg:hidden absolute bottom-8 left-4 right-4 sm:left-auto sm:right-8 z-20 flex justify-center sm:block"
                        >
                            <div className="bg-white/90 backdrop-blur-md border border-[#e8e4dd] px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2.5">
                                <span className="flex h-2 w-2 rounded-full bg-[#b8960c] animate-pulse" />
                                <span className="text-[11px] font-bold text-[#1a1a1a] tracking-widest uppercase">
                                    120+ Premium Bottles In Stock
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </section>
    );
}