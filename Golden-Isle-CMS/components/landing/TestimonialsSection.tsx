"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
    {
        quote: "Golden Isle has transformed our beverage program. Access to rare vintage whiskies at duty-free rates gives us a competitive edge no other supplier can match.",
        name: "James Sterling",
        role: "Bar Manager, The Ritz-Carlton KL",
    },
    {
        quote: "Reliability is key in hospitality. Their authenticity guarantee and prompt logistics make them our preferred supplier for all premium spirits and wines.",
        name: "Elena Rodriguez",
        role: "F&B Director, Azure Resorts",
    }
];

export function TestimonialsSection() {
    return (
        <section className="py-24 bg-[#0a0a0a] border-b border-[#d4af37]/15 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                <div className="text-center mb-16">
                    <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                        Trusted by <span className="text-[#b8960c] italic font-normal">Hospitality Leaders</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {testimonials.map((testimonial, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2 }}
                            className="bg-[#111827] rounded-2xl p-8 border border-[#d4af37]/20 hover:border-[#d4af37] hover:-translate-y-1 transition-all duration-300 shadow-sm relative group"
                        >
                            <Quote className="w-10 h-10 text-[#b8960c] mb-6 opacity-80" />
                            <p className="text-lg md:text-xl text-[#9ca3af] leading-relaxed mb-8 italic" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                                "{testimonial.quote}"
                            </p>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#b8960c] flex items-center justify-center shrink-0 shadow-sm">
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{testimonial.name}</h4>
                                    <p className="text-sm text-[#b8960c] font-medium">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}

export default TestimonialsSection;
