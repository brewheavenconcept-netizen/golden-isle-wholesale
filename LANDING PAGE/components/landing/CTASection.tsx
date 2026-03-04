"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";

export function CTASection() {
    return (
        <section className="py-24 bg-[#1a1a1a] relative overflow-hidden border-t border-[#333]">
            <div className="absolute inset-0 bg-[#b8960c]/5"></div>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
            >
                <div className="bg-[#111111] border border-[#b8960c]/20 rounded-3xl p-10 md:p-16 text-center shadow-[0_0_50px_rgba(184,150,12,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/10 blur-[80px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#b8960c]/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/2 translate-y-1/2"></div>

                    <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 relative z-10 tracking-tight">
                        Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8960c] to-[#d4af37]">Elevate</span> Your Selection?
                    </h2>
                    <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 relative z-10">
                        Join hundreds of premium establishments sourcing their alcohol through Golden Isle. Download our latest catalog today.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 justify-center relative z-10 max-w-lg mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="w-full bg-[#1a1a1a] border border-white/10 text-white px-6 py-4 rounded-full outline-none focus:border-[#b8960c] transition-colors"
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto bg-[#b8960c] hover:bg-[#d4af37] text-white font-bold px-8 py-4 rounded-full text-base transition-all shadow-[0_4px_14px_rgba(184,150,12,0.3)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            Get Catalog
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
