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
        description: "Receive your stock fast. Pay on delivery or via bank transfer, hassle-free.",
    },
];

export function HowItWorksSection() {
    return (
        <section className="py-24 bg-[#f5f3ee] border-y border-[#e8e4dd] relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="md:w-1/3"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] mb-6 leading-tight">
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
                                <div className="text-6xl font-black text-[#b8960c]/20 absolute -top-6 -left-2 tracking-tighter select-none">
                                    {step.num}
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white border border-[#e8e4dd] text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                                        <step.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">
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
