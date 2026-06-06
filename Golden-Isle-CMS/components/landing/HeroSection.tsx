"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, CheckCircle2, GlassWater, Wine } from "lucide-react";
import Link from "next/link";
import PremiumBottle3D from "@/components/ui/PremiumBottle3D";
import { getWhatsAppLink } from '@/lib/config';
import { useState, useEffect } from "react";

// @ts-ignore - framer-motion types are incompatible with next/link
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
                className="absolute inset-y-0 right-0 w-full sm:w-[70%] lg:w-[52%] -z-0 opacity-25 sm:opacity-35 lg:opacity-100"
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
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e8e4dd] text-[#1a1a1a] px-8 py-4 rounded-full text-[0.95rem] font-bold hover:border-[#008069] hover:text-[#008069] transition-all"
                        >
                            <WhatsAppBusinessIcon className="w-[18px] h-[18px]" />
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

export function WhatsAppBusinessIcon({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
    return (
        <svg 
            viewBox="0 0 2500 2500" 
            className={className} 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Outer speech bubble */}
            <path 
                fill={color} 
                d="M1912.32,591.45C1743.07,422.05,1518,328.72,1278.17,328.62c-494.13,0-896.28,402-896.48,896.14a894.32,894.32,0,0,0,119.66,448l-127.18,464.4,475.24-124.62a896.07,896.07,0,0,0,428.4,109.08h.37c494.07,0,896.27-402.05,896.47-896.18.09-239.46-93.07-464.63-262.33-634Z" 
            />
            {/* Inner white circle */}
            <path 
                fill="#ffffff" 
                d="M1278.18,1970.3h-.31a744.11,744.11,0,0,1-379.24-103.83l-27.21-16.14-282,74,75.27-274.87L647,1621.23A742.88,742.88,0,0,1,533,1224.81C533.2,814.12,867.46,480,1278.47,480c199,.08,386.1,77.66,526.78,218.46s218.11,327.94,218,527c-.16,410.73-334.41,744.89-745.1,744.89Z" 
            />
            {/* Inner B */}
            <path 
                fill={color} 
                d="M977.6,1658.86c6.31,3.8,19.27,3.8,49,3.77,126.15-.11,235.11-.49,312.62-.49,361.71,0,352.2-380.79,183.08-428.3,24.77-43.88,137.63-126.32,67.83-296.72-69-168.49-365.85-130.25-568.86-130.15-75.12,0-63.88,55.51-63.5,141.81.62,136.69.11,506.67,0,666.61C957.77,1647.81,967.56,1652.79,977.6,1658.86Zm156.51-139.55c34.15,0,114.71,0,183.77-.11,78.2-.12,147.83-36.7,146.09-114.55-1.27-73.33-50.06-97.4-117.78-104.12-64.5.62-138.27.62-212.08.62v218.16Zm0-365.44c136.05-1.87,188.54,5.48,262.82-13.12,51-29,73.34-136.42.29-172.92-50.75-25.35-200.71-16.68-263.11-14.08v200.12Z" 
            />
        </svg>
    );
}