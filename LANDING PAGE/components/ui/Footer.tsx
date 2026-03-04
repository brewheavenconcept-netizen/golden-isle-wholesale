"use client";

import Link from "next/link";
import { MessageCircle, Clock, MapPin, Instagram, Facebook, GlassWater } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-[#0d0d0d] text-slate-300 pt-20 pb-10 border-t border-[#1a1a1a]" id="contact">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12 border-b border-white/5 pb-12">
                    <div className="col-span-1 lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#b8960c] flex items-center justify-center shadow-md">
                                <GlassWater className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-display font-bold text-lg tracking-tight text-white leading-tight">
                                    Golden Isle
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#b8960c]">
                                    Wholesale
                                </span>
                            </div>
                        </div>
                        <p className="text-sm max-w-sm mb-6 leading-relaxed text-slate-400">
                            Premium duty-free wholesale beverages. <br />
                            Direct access to authentic whisky and fine wines for hospitality leaders.
                        </p>
                        <div className="flex gap-4">
                            <Link
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#b8960c] hover:text-white transition-colors"
                                href="https://wa.me/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <MessageCircle className="w-5 h-5" />
                            </Link>
                            <Link
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#b8960c] hover:text-white transition-colors"
                                href="#"
                            >
                                <Instagram className="w-5 h-5" />
                            </Link>
                            <Link
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#b8960c] hover:text-white transition-colors"
                                href="#"
                            >
                                <Facebook className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-display font-bold mb-5 text-white text-lg">Quick Links</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li>
                                <Link className="hover:text-[#b8960c] transition-colors" href="#">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-[#b8960c] transition-colors" href="#products">
                                    Products Catalogue
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-[#b8960c] transition-colors" href="#about">
                                    Why Golden Isle
                                </Link>
                            </li>
                            <li>
                                <Link className="hover:text-[#b8960c] transition-colors" href="#contact">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-display font-bold mb-5 text-white text-lg">Contact Us</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start gap-3 text-slate-400">
                                <MessageCircle className="w-5 h-5 text-[#b8960c] shrink-0" />
                                <div>
                                    <div className="font-medium text-slate-300">WhatsApp Sales</div>
                                    <Link href="https://wa.me/6087123456" className="hover:text-[#b8960c] transition-colors">+60 87 123 456</Link>
                                </div>
                            </li>
                            <li className="flex items-start gap-3 text-slate-400">
                                <Clock className="w-5 h-5 text-[#b8960c] shrink-0" />
                                <div>
                                    <div className="font-medium text-slate-300">Email Enquiries</div>
                                    <a href="mailto:sales@goldenisle.com" className="hover:text-[#b8960c] transition-colors">sales@goldenisle.com</a>
                                </div>
                            </li>
                            <li className="flex items-start gap-3 text-slate-400">
                                <MapPin className="w-5 h-5 text-[#b8960c] shrink-0" />
                                <div>
                                    <div className="font-medium text-slate-300">Headquarters</div>
                                    Level 4, Financial Park,<br />Jalan Merdeka, 87000 Labuan F.T
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <div>© {new Date().getFullYear()} Golden Isle Wholesale. All rights reserved.</div>
                    <div className="flex gap-6">
                        <Link className="hover:text-[#b8960c] transition-colors" href="#">
                            Privacy Policy
                        </Link>
                        <Link className="hover:text-[#b8960c] transition-colors" href="#">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
