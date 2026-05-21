"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SpotlightSection() {
    return (
        <section className="py-24 bg-[#1a1a1a] relative overflow-hidden border-y border-[#333]">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[#b8960c]/5"></div>
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#d4af37]/15 blur-[120px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#b8960c]/15 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 translate-y-1/2"></div>

            {/* Gold Particles (CSS visual effect only) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20 mix-blend-overlay"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left content: Spotlight Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#b8960c]/10 text-[#d4af37] text-sm font-bold tracking-widest uppercase mb-8 backdrop-blur-sm">
                            ★ Bottle of the Week
                        </div>

                        <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1]">
                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8960c] to-[#f4d068]">Macallan</span> 18yr
                        </h2>

                        <p className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
                            A legendary single malt matured exclusively in hand-picked Oloroso sherry seasoned oak casks from Jerez, Spain. Unmatched richness and complexity.
                        </p>

                        <div className="bg-[#111] border border-white/5 p-6 rounded-2xl mb-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#b8960c]/0 via-[#b8960c]/5 to-[#b8960c]/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            <div className="flex items-end gap-6">
                                <div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Retail Price</p>
                                    <p className="text-2xl text-slate-400 line-through decoration-red-500/50">RM 1,250</p>
                                </div>
                                <div className="h-12 w-px bg-white/10 hidden sm:block"></div>
                                <div>
                                    <p className="text-sm font-bold text-[#b8960c] uppercase tracking-wider mb-1 flex items-center gap-1">Duty-Free Price <CheckCircle2 className="w-4 h-4" /></p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl md:text-5xl font-bold text-white">RM 850</span>
                                        <span className="text-emerald-400 text-sm font-bold bg-emerald-400/10 px-2 py-0.5 rounded">Save RM 400</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Link href="#products">
                            <motion.button
                                suppressHydrationWarning
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white hover:bg-[#d4af37] text-black font-bold px-8 py-4 rounded-full text-base transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(184,150,12,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                Add to Wholesale Order <ArrowRight className="w-5 h-5" />
                            </motion.button>
                        </Link>
                    </motion.div>

                    {/* Right content: Floating Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="relative h-[500px] lg:h-[600px] flex items-center justify-center"
                    >
                        {/* Glow behind bottle */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#b8960c]/20 to-transparent blur-[50px] rounded-full"></div>

                        <motion.div
                            animate={{
                                y: [0, -20, 0],
                                rotateZ: [0, 2, -2, 0]
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative w-full max-w-[400px] aspect-[3/4] rounded-3xl overflow-hidden border border-[#d4af37]/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80"
                                alt="The Macallan 18yr Bottle of the Week"
                                className="w-full h-full object-cover mix-blend-luminosity brightness-110 contrast-125"
                            />
                            {/* Inner gold border highlight */}
                            <div className="absolute inset-0 border-[3px] border-[#d4af37]/30 rounded-3xl pointer-events-none mix-blend-overlay"></div>
                        </motion.div>

                        {/* Floating elements styling */}
                        <motion.div
                            animate={{ y: [0, 15, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute -right-4 lg:-right-12 top-1/4 bg-[#111]/80 backdrop-blur-md border border-[#d4af37]/30 p-4 rounded-2xl shadow-xl z-20"
                        >
                            <p className="text-[#d4af37] font-bold text-sm tracking-widest uppercase mb-1">Stock</p>
                            <p className="text-white text-xl font-display font-bold">12 Cases Left</p>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute -left-4 lg:-left-12 bottom-1/4 bg-[#111]/80 backdrop-blur-md border border-[#d4af37]/30 p-4 rounded-2xl shadow-xl z-20"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🏆</span>
                                <div>
                                    <p className="text-[#d4af37] font-bold text-[10px] tracking-widest uppercase">Awarded</p>
                                    <p className="text-white text-sm font-bold">96/100 Points</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
