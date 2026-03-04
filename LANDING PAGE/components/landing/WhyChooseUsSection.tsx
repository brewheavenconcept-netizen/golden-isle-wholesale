"use client";

import { motion } from "framer-motion";
import { Tag, Truck, MousePointerClick } from "lucide-react";

const features = [
    {
        icon: Tag,
        title: "Wholesale Pricing",
        description: "Best prices for bulk orders. Maximize your margins with our competitive wholesale rates on premium beverages.",
    },
    {
        icon: Truck,
        title: "Fast Delivery",
        description: "Next-day delivery across Sabah. Reliable supply chain so you never run out of stock during peak hours.",
    },
    {
        icon: MousePointerClick,
        title: "Easy Ordering",
        description: "Order online, pay on delivery or bank transfer. A seamless digital ordering experience built for businesses.",
    },
];

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function WhyChooseUsSection() {
    return (
        <section className="py-24 bg-white relative overflow-hidden" id="about">
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-emerald-500 text-sm font-semibold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                        Why Choose Us
                    </span>
                    <h2 className="mt-6 text-3xl md:text-5xl font-bold text-white">
                        Built for Business Reliability
                    </h2>
                    <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">
                        We understand the demands of running a bar, restaurant, or event space. That&apos;s why we focus on what matters most.
                    </p>
                </motion.div>

                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-colors group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <feature.icon className="w-32 h-32 text-emerald-500 -mt-10 -mr-10 rotate-12" />
                            </div>
                            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                                <feature.icon className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-slate-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
