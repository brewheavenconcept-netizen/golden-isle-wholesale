"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export function CTASection() {
    const [formData, setFormData] = useState({
        business_name: "",
        contact_person: "",
        email: "",
        phone: "",
        message: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('inquiries')
                .insert([formData]);

            if (error) throw error;

            setSubmitted(true);
            setFormData({
                business_name: "",
                contact_person: "",
                email: "",
                phone: "",
                message: ""
            });
        } catch (error: any) {
            toast.error("Error submitting inquiry: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="py-24 bg-[#1a1a1a] relative overflow-hidden border-t border-[#333]">
            <div className="absolute inset-0 bg-[#b8960c]/5"></div>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
            >
                <div className="bg-[#111111] border border-[#b8960c]/20 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(184,150,12,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/10 blur-[80px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#b8960c]/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/2 translate-y-1/2"></div>

                    <div className="text-center mb-10">
                        <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4 relative z-10 tracking-tight">
                            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8960c] to-[#d4af37]">Elevate</span> Your Selection?
                        </h2>
                        <p className="text-[#9a9a9a] max-w-xl mx-auto relative z-10">
                            Join hundreds of premium establishments sourcing their alcohol through Golden Isle. Contact us to get our latest wholesale catalog and pricing.
                        </p>
                    </div>

                    {submitted ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#b8960c]/10 border border-[#b8960c]/30 rounded-2xl p-8 text-center relative z-10"
                        >
                            <div className="w-16 h-16 bg-[#b8960c] rounded-full flex items-center justify-center mx-auto mb-4 text-black text-2xl">
                                ✓
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
                            <p className="text-[#9a9a9a]">We'll get back to you with our catalog within 24 hours.</p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="mt-6 text-[#d4af37] text-sm hover:underline"
                            >
                                Submit another inquiry
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-widest mb-1.5 ml-1">Business Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Your Company Ltd."
                                        value={formData.business_name}
                                        onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/10 text-white px-5 py-3.5 rounded-xl outline-none focus:border-[#b8960c] focus:ring-1 focus:ring-[#b8960c] transition-all placeholder:text-[#4a4a4a]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-widest mb-1.5 ml-1">Email *</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="sales@yourcompany.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/10 text-white px-5 py-3.5 rounded-xl outline-none focus:border-[#b8960c] focus:ring-1 focus:ring-[#b8960c] transition-all placeholder:text-[#4a4a4a]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-widest mb-1.5 ml-1">Contact Person</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.contact_person}
                                        onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/10 text-white px-5 py-3.5 rounded-xl outline-none focus:border-[#b8960c] focus:ring-1 focus:ring-[#b8960c] transition-all placeholder:text-[#4a4a4a]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+60 12 345 6789"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/10 text-white px-5 py-3.5 rounded-xl outline-none focus:border-[#b8960c] focus:ring-1 focus:ring-[#b8960c] transition-all placeholder:text-[#4a4a4a]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-widest mb-1.5 ml-1">Message</label>
                                <textarea
                                    rows={3}
                                    placeholder="Tell us about your business needs..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-[#1a1a1a] border border-white/10 text-white px-5 py-3.5 rounded-xl outline-none focus:border-[#b8960c] focus:ring-1 focus:ring-[#b8960c] transition-all placeholder:text-[#4a4a4a] resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    disabled={submitting}
                                    type="submit"
                                    className="w-full bg-[#b8960c] hover:bg-[#d4af37] disabled:bg-[#b8960c]/50 disabled:cursor-not-allowed text-[#111] font-bold px-8 py-4 rounded-xl text-base transition-all shadow-[0_4px_14px_rgba(184,150,12,0.3)] flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                                    ) : (
                                        "Get Catalog & Pricing"
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </section>
    );
}
