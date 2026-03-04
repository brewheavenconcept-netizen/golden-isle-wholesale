"use client";

const items = [
    "100% Authentic Guaranteed",
    "Duty-Free Prices",
    "Next-Day Delivery",
    "500+ Brands",
    "Secure Packaging",
    "Bulk Discounts",
];

export default function MarqueeBar() {
    return (
        <div className="bg-[#b8960c] py-4 overflow-hidden relative flex border-y border-[#8a7000] z-20">
            {/* Gradient masks for smooth fade on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-r from-[#b8960c] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-l from-[#b8960c] to-transparent z-10 pointer-events-none"></div>

            {/* Scrolling container */}
            <div className="flex whitespace-nowrap animate-[scroll_40s_linear_infinite] group hover:[animation-play-state:paused] items-center">
                {/* Double the items to create seamless loop */}
                {[...items, ...items, ...items].map((item, index) => (
                    <div key={index} className="flex items-center px-8 text-black font-bold uppercase tracking-[0.2em] text-sm md:text-base">
                        <span className="w-2 h-2 rounded-full bg-black/40 mr-8"></span>
                        {item}
                    </div>
                ))}
            </div>

            {/* Inline keyframes - tailwind v4 compliant custom animation approach for quick components without global.css edits where possible */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
            `}} />
        </div>
    );
}
