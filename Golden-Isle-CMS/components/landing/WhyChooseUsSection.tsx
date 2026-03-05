"use client";

import { useEffect, useRef, useState } from "react";

// ── Feature buttons data ─────────────────────────────────────────────────────
const features = [
    {
        emoji: "🥃",
        title: "Premium Brands",
        subtitle: "Curated selection of duty-free whisky, wine & craft beer",
        targetId: "products",
    },
    {
        emoji: "🚚",
        title: "Next-Day Delivery",
        subtitle: "Fast & reliable delivery across Sabah",
        targetId: "inquiry",
    },
    {
        emoji: "📦",
        title: "Bulk Orders Welcome",
        subtitle: "Competitive wholesale pricing for your business",
        targetId: "inquiry",
    },
];

// ── Stats data ────────────────────────────────────────────────────────────────
const stats = [
    { end: 1000, suffix: "+", label: "Products Available" },
    { end: 500, suffix: "+", label: "Happy Clients" },
    { end: 24, suffix: "hr", label: "Delivery Time" },
    { end: 100, suffix: "%", label: "Authentic Guaranteed" },
];

// ── Smooth scroll helper ─────────────────────────────────────────────────────
function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
}

// ── useCountUp hook ───────────────────────────────────────────────────────────
function useCountUp(end: number, duration = 2000, triggered: boolean) {
    const [count, setCount] = useState(0);
    const hasRun = useRef(false);

    useEffect(() => {
        if (!triggered || hasRun.current) return;
        hasRun.current = true;

        const startTime = performance.now();
        const step = (now: number) => {
            const elapsed = Math.min(now - startTime, duration);
            const progress = elapsed / duration;
            // ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            setCount(Math.floor(eased * end));
            if (elapsed < duration) requestAnimationFrame(step);
            else setCount(end);
        };
        requestAnimationFrame(step);
    }, [triggered, end, duration]);

    return count;
}

// ── Single stat item ─────────────────────────────────────────────────────────
function StatItem({ end, suffix, label, triggered }: { end: number; suffix: string; label: string; triggered: boolean }) {
    const count = useCountUp(end, 2000, triggered);
    return (
        <div className="flex flex-col items-center text-center px-4">
            <span className="text-4xl md:text-5xl font-bold text-[#d4a853] leading-none">
                {count}{suffix}
            </span>
            <span className="mt-2 text-xs md:text-sm font-semibold tracking-widest uppercase text-[#6b6b6b]">
                {label}
            </span>
        </div>
    );
}

// ── Main section ─────────────────────────────────────────────────────────────
export function WhyChooseUsSection() {
    const statsRef = useRef<HTMLDivElement>(null);
    const [statsTriggered, setStatsTriggered] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStatsTriggered(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section id="about" className="bg-[#0a0a0a] py-20 md:py-28 relative overflow-hidden">

            {/* Ambient gold glows */}
            <div className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 bg-[#d4a853]/5 blur-[120px] rounded-full" />
            <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-96 bg-[#d4a853]/5 blur-[120px] rounded-full" />

            <div className="max-w-6xl mx-auto px-4 relative z-10">

                {/* ── Heading ── */}
                <div className="text-center mb-14">
                    <span className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#d4a853]/30 text-[#d4a853] bg-[#d4a853]/5">
                        Why Choose Golden Isle
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                        Built for Business{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4a853] to-[#c9a84c]">
                            Reliability
                        </span>
                    </h2>
                    <p className="mt-4 text-[#6b6b6b] max-w-xl mx-auto text-base md:text-lg leading-relaxed">
                        We understand the demands of running a bar, restaurant, or event space.
                        That&apos;s why we focus on what matters most.
                    </p>
                </div>

                {/* ── Feature Buttons ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-16">
                    {features.map((f) => (
                        <button
                            key={f.title}
                            onClick={() => scrollToSection(f.targetId)}
                            className="group text-left bg-[#111827] border border-[#d4a853]/20 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:scale-[1.02] hover:border-[#d4a853]/60 hover:shadow-[0_8px_32px_rgba(212,168,83,0.18)] active:scale-[0.98] cursor-pointer"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-4xl leading-none select-none">{f.emoji}</span>
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-white group-hover:text-[#d4a853] transition-colors duration-200">
                                        {f.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-[#6b6b6b] leading-relaxed">
                                        {f.subtitle}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-1 text-[#d4a853]/50 group-hover:text-[#d4a853] transition-colors duration-200 text-xs font-semibold uppercase tracking-widest">
                                Learn more
                                <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── Stats Bar ── */}
                <div
                    ref={statsRef}
                    className="rounded-2xl border border-[#d4a853]/15 bg-[#0f0f14] overflow-hidden"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-x-0 md:divide-x divide-[#d4a853]/10">
                        {stats.map((s, i) => (
                            <div
                                key={s.label}
                                className={`py-8 ${i === 0 ? "" : "border-t md:border-t-0 border-[#d4a853]/10"}`}
                            >
                                <StatItem {...s} triggered={statsTriggered} />
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
