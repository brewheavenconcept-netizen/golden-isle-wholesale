"use client";

import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2, GlassWater, Wine, Beer } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getWhatsAppLink } from '@/lib/config';

// @ts-ignore
const MotionLink = motion.create ? motion.create(Link) : motion(Link);

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut" as const,
    },
};

export function HeroSection() {
    return (
        <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 bg-[#faf9f6]">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-[#d4af37]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Column - Text Content */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8 max-w-2xl"
                    >
                        <motion.div
                            variants={fadeInUp}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#e8e4dd] shadow-sm"
                        >
                            <span className="flex h-2.5 w-2.5 rounded-full bg-[#b8960c] animate-pulse"></span>
                            <span className="text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest">
                                Labuan Duty-Free Zone
                            </span>
                        </motion.div>

                        <motion.h1
                            variants={fadeInUp}
                            className="font-display text-5xl lg:text-7xl font-bold tracking-tight text-[#1a1a1a] leading-[1.05]"
                        >
                            Premium Whisky <br />
                            <span className="flex items-center gap-4">
                                & Rare Wines,
                            </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8960c] to-[#d4af37]">
                                Wholesale Prices
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-lg text-[#6b6b6b] max-w-xl leading-relaxed"
                        >
                            Direct access to premium duty-free wholesale beverages for hotels, restaurants, and fastidious collectors. Authentic provenance and rapid logistics across Malaysia.
                        </motion.p>

                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row gap-4 pt-4"
                        >
                            <MotionLink
                                href="#products"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#333333] text-white font-bold px-10 py-4 rounded-full text-base transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                                Browse Products <ArrowDown className="w-5 h-5" />
                            </MotionLink>
                            <MotionLink
                                href={getWhatsAppLink('Hi, I\'m interested in Golden Isle Wholesale products. Can you share your catalog?')}
                                target="_blank"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full sm:w-auto bg-white border border-[#e8e4dd] text-[#1a1a1a] px-8 py-4 rounded-full text-base font-bold hover:border-[#b8960c] hover:text-[#b8960c] transition-all flex items-center justify-center gap-2"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.522 5.854L.057 23.882l6.19-1.438A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.213-3.676.853.88-3.574-.234-.369A9.818 9.818 0 1112 21.818z" />
                                </svg>
                                WhatsApp Us
                            </MotionLink>
                        </motion.div>

                        {/* Trust Indicators */}
                        <motion.div
                            variants={fadeInUp}
                            className="pt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
                        >
                            {[
                                "100% Authentic",
                                "Fast Delivery",
                                "Duty-Free Pricing"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b8960c]/10">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#b8960c]" />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#1a1a1a]/80 uppercase tracking-wide">{text}</span>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Right Column - Layered Composition */}
                    <div className="relative mt-8 lg:mt-0 flex items-center justify-center min-h-[500px] lg:min-h-[700px]">
                        {/* Background Abstract Shape */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_rgba(212,175,55,0.1)_0%,_transparent_70%)] -z-10"
                        />

                        {/* The Large Bottle Composition */}
                        <motion.div
                            animate={floatingAnimation}
                            className="relative w-full h-[380px] max-w-[550px] z-10 flex items-center justify-center"
                        >
                            <Image
                                src="/hero-bottles.png"
                                alt="Premium Selection"
                                fill
                                className="object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.15)]"
                                priority
                            />
                        </motion.div>

                        {/* OVERLAPPING Inventory Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="absolute bottom-4 lg:bottom-12 left-0 right-0 mx-auto w-full max-w-[420px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)] border border-[#e8e4dd] z-20"
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-center mb-6 border-b border-[#f3f0ea] pb-4">
                                <h3 className="text-xs font-black text-[#1a1a1a] tracking-[0.15em] flex items-center gap-3 uppercase">
                                    <span className="flex h-2 w-2 rounded-full bg-[#b8960c]"></span>
                                    Live Inventory
                                </h3>
                                <div className="text-[9px] font-bold text-[#6b6b6b] bg-[#fafaf7] border border-[#e8e4dd] px-3 py-1 rounded-full uppercase tracking-widest">
                                    Updated just now
                                </div>
                            </div>

                            {/* Inventory Items */}
                            <div className="space-y-4">
                                <div className="group bg-white hover:bg-[#faf9f6]/50 border border-[#e8e4dd] p-4 rounded-3xl flex items-center justify-between transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#faf9f6] flex items-center justify-center border border-[#e8e4dd] group-hover:scale-110 transition-transform">
                                            <GlassWater className="w-6 h-6 text-[#b8960c]" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a] text-sm tracking-tight">Macallan 18yr</div>
                                            <div className="text-[10px] font-semibold text-[#6b6b6b] mt-0.5">Single Malt Whisky</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-[#b8960c] text-sm">RM 850.00</div>
                                        <div className="text-[9px] font-black mt-1 bg-[#b8960c] text-white px-2 py-0.5 rounded uppercase tracking-tighter">Exclusive</div>
                                    </div>
                                </div>

                                <div className="group bg-white hover:bg-[#faf9f6]/50 border border-[#e8e4dd] p-4 rounded-3xl flex items-center justify-between transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#faf9f6] flex items-center justify-center border border-[#e8e4dd] group-hover:scale-110 transition-transform">
                                            <Wine className="w-6 h-6 text-[#b8960c]" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a] text-sm tracking-tight">Penfolds Bin 389</div>
                                            <div className="text-[10px] font-semibold text-[#6b6b6b] mt-0.5">Cabernet Shiraz</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-[#1a1a1a] text-sm">RM 320.00</div>
                                        <div className="text-[9px] font-black mt-1 bg-[#6b6b6b] text-white px-2 py-0.5 rounded uppercase tracking-tighter">Fast Moving</div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom CTA within card */}
                            <div className="mt-6 pt-4 border-t border-[#f3f0ea] text-center">
                                <span className="text-[10px] font-bold text-[#6b6b6b] uppercase tracking-widest flex items-center justify-center gap-2">
                                    More arrivals coming soon!
                                    <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                                        <ArrowDown className="w-3 h-3 rotate-[270deg]" />
                                    </motion.span>
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}