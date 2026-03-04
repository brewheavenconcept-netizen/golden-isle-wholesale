"use client";

import { motion } from "framer-motion";

const stats = [
    { value: "1,000", suffix: "+", desc: "Premium Products" },
    { value: "500", suffix: "+", desc: "Global Brands" },
    { value: "Next", suffix: " Day", desc: "Delivery" },
    { value: "40", suffix: "%", desc: "Duty-Free Savings" },
];

export function StatsSection() {
    return (
        <section className="py-16 bg-[#f5f3ee] border-y border-[#e8e4dd]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-[#e8e4dd]">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className={`px-6 text-center md:text-left ${i > 0 ? "pl-8" : ""}`}
                        >
                            <div className="text-4xl lg:text-5xl font-bold font-display text-[#b8960c] mb-2">
                                {stat.value}
                                <span className="text-2xl text-[#d4af37]">{stat.suffix}</span>
                            </div>
                            <p className="text-xs text-[#6b6b6b] font-bold tracking-[0.15em] uppercase">
                                {stat.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
