"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
    {
        title: "Whisky",
        subtitle: "Single Malt, Blended, Bourbon & Rye",
        price: "From RM 180",
        img: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&q=80",
    },
    {
        title: "Fine Wines",
        subtitle: "Red, White & Vintage",
        price: "From RM 95",
        img: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80",
    },
    {
        title: "Craft Beer",
        subtitle: "IPA, Stout, Lager & Ale",
        price: "From RM 45",
        img: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80",
    }
];

export function CollectionCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const totalSlides = slides.length;

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, [totalSlides]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }, [totalSlides]);

    useEffect(() => {
        if (!isHovered) {
            const timer = setInterval(nextSlide, 4000);
            return () => clearInterval(timer);
        }
    }, [isHovered, nextSlide]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") prevSlide();
            if (e.key === "ArrowRight") nextSlide();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [prevSlide, nextSlide]);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;
        if (diff > 50) nextSlide();
        if (diff < -50) prevSlide();
        setTouchStart(null);
    };

    return (
        <section
            className="py-24 bg-white border-b border-[#e8e4dd] relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#d4af37]/10 via-transparent to-transparent pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center mb-16">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1a1a1a]">
                    Our <span className="text-[#b8960c] italic font-normal">Premium Collection</span>
                </h2>
                <p className="mt-4 text-lg text-[#6b6b6b] max-w-2xl mx-auto">
                    Curated spirits and fine wines from the world&apos;s most renowned producers.
                </p>
            </div>

            {/* Carousel Container */}
            <div
                className="relative h-[400px] md:h-[500px] w-full max-w-6xl mx-auto flex items-center justify-center overflow-hidden [perspective:1200px]"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {slides.map((slide, index) => {
                    let offset = index - currentIndex;
                    if (offset < -Math.floor(totalSlides / 2)) offset += totalSlides;
                    if (offset > Math.floor(totalSlides / 2)) offset -= totalSlides;

                    const isCenter = offset === 0;
                    const isLeft = offset === -1;
                    const isRight = offset === 1;

                    let opacity = 0;
                    let rotateY = 0;
                    let translateZ = -500;
                    let translateX = 0;
                    let scale = 0.6;
                    let zIndex = 0;

                    if (isCenter) {
                        opacity = 1; rotateY = 0; translateZ = 0; translateX = 0; scale = 1; zIndex = 10;
                    } else if (isLeft) {
                        opacity = 0.6; rotateY = 25; translateZ = -100; translateX = -60; scale = 0.8; zIndex = 5;
                    } else if (isRight) {
                        opacity = 0.6; rotateY = -25; translateZ = -100; translateX = 60; scale = 0.8; zIndex = 5;
                    } else if (offset === -2) {
                        opacity = 0; rotateY = 40; translateZ = -300; translateX = -100; scale = 0.7; zIndex = 1;
                    } else if (offset === 2) {
                        opacity = 0; rotateY = -40; translateZ = -300; translateX = 100; scale = 0.7; zIndex = 1;
                    }

                    return (
                        <div
                            key={index}
                            className={`absolute w-full max-w-[280px] md:max-w-sm lg:max-w-md h-[400px] md:h-[480px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] select-none bg-white ${isCenter ? "border-2 border-[#b8960c] ring-4 ring-[#b8960c]/20 cursor-pointer group" : "border border-[#e8e4dd] cursor-pointer"}`}
                            style={{
                                left: "50%",
                                top: "50%",
                                transformOrigin: "50% 50%",
                                transform: `translate(-50%, -50%) translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                                opacity,
                                zIndex,
                                transformStyle: "preserve-3d",
                            }}
                            onClick={() => {
                                if (isLeft) prevSlide();
                                else if (isRight) nextSlide();
                                else if (isCenter) {
                                    // Map slightly different display titles into standard categories
                                    let filterCat = slide.title;
                                    if (filterCat === "Fine Wines") filterCat = "Wine";

                                    window.dispatchEvent(new CustomEvent('filterCategory', { detail: filterCat }));
                                    document.getElementById("products")?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                        >
                            <img
                                src={slide.img}
                                alt={slide.title}
                                className="w-full h-full object-cover bg-[#fafaf7]"
                                draggable={false}
                            />
                            {/* Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/90 via-[#1a1a1a]/40 to-transparent transition-opacity duration-500 flex flex-col justify-end p-6 md:p-8 ${isCenter ? "opacity-100" : "opacity-0"}`}>
                                <div className="text-white">
                                    <div className="inline-block px-3 py-1 bg-[#b8960c]/90 text-white text-xs font-bold tracking-wider rounded-full mb-4 uppercase backdrop-blur-sm border border-white/20">
                                        {slide.price}
                                    </div>
                                    <h3 className="font-display text-4xl mb-2">{slide.title}</h3>
                                    <p className="text-slate-300 text-sm font-medium tracking-wide">{slide.subtitle}</p>
                                </div>

                                {/* New Browse Collection subtlety on active slide hover */}
                                {isCenter && (
                                    <div className="absolute inset-x-0 bottom-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                            Browse Collection <span className="text-[#b8960c]">→</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Arrow buttons */}
                <button
                    suppressHydrationWarning
                    onClick={prevSlide}
                    aria-label="Previous slide"
                    className="absolute z-20 left-4 md:left-12 lg:left-24 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-[#e8e4dd] hover:border-[#b8960c] hover:text-[#b8960c] hover:scale-110 transition-all focus:outline-none"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    suppressHydrationWarning
                    onClick={nextSlide}
                    aria-label="Next slide"
                    className="absolute z-20 right-4 md:right-12 lg:right-24 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-[#e8e4dd] hover:border-[#b8960c] hover:text-[#b8960c] hover:scale-110 transition-all focus:outline-none"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Dots Pagination */}
            <div className="flex justify-center items-center gap-2 mt-12 relative z-10">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        suppressHydrationWarning
                        onClick={() => setCurrentIndex(i)}
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${i === currentIndex ? "w-8 bg-[#b8960c]" : "w-2 bg-[#d4af37]/30 hover:bg-[#d4af37]/60"}`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
