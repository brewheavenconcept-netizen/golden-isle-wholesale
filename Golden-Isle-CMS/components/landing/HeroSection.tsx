"use client";

import { motion } from "framer-motion";
import { ArrowDown, MessageCircle, Beer, Droplets, Wine, CheckCircle2, GlassWater } from "lucide-react";
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
    y: [0, -15, 0],
    transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut" as const,
    },
};

export function HeroSection() {
    return (
        <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden bg-white">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-[#d4af37]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
            <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-[#b8960c]/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
                    {/* Left Column - Text Content */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8 max-w-2xl"
                    >
                        <motion.div
                            variants={fadeInUp}
                            className="inline-flex items-center gap-2 px-4 py-1.5 mt-8 lg:mt-0 rounded-full bg-[#fafaf7] border border-[#e8e4dd] shadow-sm"
                        >
                            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                                Labuan Duty-Free Zone
                            </span>
                        </motion.div>
                        <motion.h1
                            variants={fadeInUp}
                            className="font-display text-5xl lg:text-7xl font-bold tracking-tight text-[#1a1a1a] leading-[1.1]"
                        >
                            Premium Whisky & Fine Wines, <br />
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
                                className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#333333] text-white font-bold px-8 py-4 rounded-full text-base transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                            >
                                Browse Products <ArrowDown className="w-5 h-5" />
                            </MotionLink>
                            <MotionLink
                                href={getWhatsAppLink('Hi, I\'m interested in Golden Isle Wholesale products. Can you share your catalog?')}
                                target="_blank"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full sm:w-auto bg-white border-2 border-[#e8e4dd] text-[#1a1a1a] px-6 py-3 rounded-full text-base font-semibold hover:border-[#b8960c] hover:text-[#b8960c] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                            className="pt-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-t border-[#e8e4dd] mt-4"
                        >
                            {[
                                "100% Authentic",
                                "Fast Delivery",
                                "Duty-Free Pricing"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-[#b8960c]" />
                                    <span className="text-sm font-semibold text-[#1a1a1a]">{text}</span>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Right Column - Abstract UI Showcase */}
                    <div className="relative mt-8 lg:mt-0 lg:ml-8">
                        {/* Abstract Glow Background */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#b8960c]/10 via-[#d4af37]/5 to-transparent blur-3xl rounded-full -z-10"
                        ></motion.div>

                        <motion.div
                            animate={floatingAnimation}
                            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-[#e8e4dd] relative z-10"
                        >
                            {/* Dashboard Header */}
                            <div className="flex justify-between items-center mb-8 border-b border-[#e8e4dd] pb-4">
                                <h3 className="text-sm font-bold text-[#1a1a1a] tracking-wide flex items-center gap-2 uppercase">
                                    <div className="w-2 h-2 rounded-full bg-[#b8960c]"></div> Live Inventory
                                </h3>
                                <div className="text-xs font-semibold text-[#6b6b6b] bg-[#fafaf7] border border-[#e8e4dd] px-3 py-1 rounded-full">Updated just now</div>
                            </div>

                            {/* Inventory List Items */}
                            <div className="space-y-4">
                                {/* Item 1 - Whisky */}
                                <div className="bg-white border border-[#e8e4dd] p-4 rounded-2xl flex items-center justify-between group hover:border-[#b8960c]/30 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200">
                                            <GlassWater className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a] text-sm">Macallan 18yr</div>
                                            <div className="text-xs font-medium text-[#6b6b6b] mt-1">Single Malt Whisky</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-[#1a1a1a]">RM 850.00</div>
                                        <div className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block uppercase tracking-wider">In Stock</div>
                                    </div>
                                </div>

                                {/* Item 2 - Wine */}
                                <div className="bg-white border border-[#e8e4dd] p-4 rounded-2xl flex items-center justify-between group hover:border-[#b8960c]/30 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center border border-pink-200">
                                            <Wine className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a] text-sm">Penfolds Bin 389</div>
                                            <div className="text-xs font-medium text-[#6b6b6b] mt-1">Cabernet Shiraz</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-[#1a1a1a]">RM 320.00</div>
                                        <div className="text-[10px] text-amber-600 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block uppercase tracking-wider">Fast Moving</div>
                                    </div>
                                </div>

                                {/* Item 3 - Beer */}
                                <div className="bg-white border border-[#e8e4dd] p-4 rounded-2xl flex items-center justify-between group hover:border-[#b8960c]/30 hover:shadow-md transition-all opacity-80 filter blur-[0.5px]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
                                            <Beer className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a] text-sm">Asahi Super Dry</div>
                                            <div className="text-xs font-medium text-[#6b6b6b] mt-1">24 x 320ml Cans</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-[#1a1a1a]">RM 145.00</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating "Order Incoming" widget */}
                            <motion.div
                                animate={{ y: [0, -8, 0], opacity: [0.9, 1, 0.9] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -left-6 lg:-left-12 bottom-12 bg-[#1a1a1a] p-3 pr-6 rounded-2xl shadow-xl border border-[#333] flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                                    <ArrowDown className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        Vintage Wine Arriving
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                        Tomorrow at 9:00 AM
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
