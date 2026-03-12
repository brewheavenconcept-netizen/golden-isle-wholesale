"use client";

import { motion } from "framer-motion";
import { Search, ShoppingCart, Truck } from "lucide-react";

const steps = [
    {
        num: "01",
        icon: Search,
        title: "Browse our catalog",
        description: "Explore our curated selection of craft beers, stouts, and premium spirits.",
    },
    {
        num: "02",
        icon: ShoppingCart,
        title: "Add to cart & checkout",
        description: "Select your quantities, review wholesale pricing, and place your order.",
    },
    {
        num: "03",
        icon: Truck,
        title: "We deliver to your door",
        description: "Receive your stock fast. Pay via bank transfer or online banking, hassle-free.",
    },
];

export function HowItWorksSection() {
    return (
        <section className="py-24 bg-[#0a0a0a] border-y border-[#d4a853]/15 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="md:w-1/3"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                            Simple & Fast Ordering.
                        </h2>
                        <p className="text-[#6b6b6b] text-lg">
                            We&apos;ve completely streamlined the wholesale supply chain, making restocking as easy as buying a coffee.
                        </p>
                    </motion.div>

                    <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.15 }}
                                className="relative"
                            >
                                <div className="relative z-10 group cursor-default">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="text-xs font-bold uppercase tracking-widest text-[#d4a853]">
                                            Step {parseInt(step.num)}
                                        </div>
                                        {/* Optional connector line on desktop, hide on last step */}
                                        {index < steps.length - 1 && (
                                            <div className="hidden sm:block h-[1px] flex-grow bg-gradient-to-r from-[#d4a853]/50 to-transparent ml-2" />
                                        )}
                                    </div>
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#d4a853] to-[#c9a84c] text-[#0a0a0a] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(212,168,83,0.2)] group-hover:shadow-[0_0_30px_rgba(212,168,83,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                                        <step.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-[#6b6b6b]">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
