"use client";

import { motion, Variants } from "framer-motion";
import { Instagram } from "lucide-react";
import Link from "next/link";

const photos = [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80",
    "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&q=80",
    "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&q=80",
    "https://images.unsplash.com/photo-1594372365401-3b5ff14eaaed?w=400&q=80",
    "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80"
];

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function GallerySection() {
    return (
        <section className="py-24 bg-[#f5f3ee] border-t border-[#e8e4dd]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center mb-16">
                    <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1a1a1a] mb-4">
                        From Our <span className="text-[#b8960c] italic font-normal">Warehouse</span>
                    </h2>
                    <p className="text-lg text-[#6b6b6b] max-w-2xl mx-auto">
                        Inside the Labuan Duty-Free operations. Follow <Link href="#" className="font-bold text-[#1a1a1a] hover:text-[#b8960c] transition-colors underline decoration-[#d4af37]/50 underline-offset-4">@goldenisle.wholesale</Link> for latest shipment arrivals.
                    </p>
                </div>

                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4"
                >
                    {photos.map((src, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            className="aspect-square relative overflow-hidden bg-[#fafaf7] group cursor-pointer"
                        >
                            <img
                                src={src}
                                alt={`Golden Isle Warehouse Photo ${index + 1}`}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-[#1a1a1a]/60 transition-colors duration-300 flex items-center justify-center">
                                <Instagram className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="mt-12 text-center">
                    <Link href="#">
                        <button className="bg-transparent border-2 border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white font-bold px-8 py-4 rounded-full text-sm transition-all flex items-center justify-center gap-2 mx-auto uppercase tracking-widest">
                            <Instagram className="w-4 h-4" /> Follow Instagram
                        </button>
                    </Link>
                </div>

            </div>
        </section>
    );
}
