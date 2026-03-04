"use client";

import { Component, ReactNode } from "react";

import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import ProductsSection from "@/components/landing/ProductsSection";
import { WhyChooseUsSection } from "@/components/landing/WhyChooseUsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { CTASection } from "@/components/landing/CTASection";
import { CollectionCarousel } from "@/components/landing/CollectionCarousel";
import SpotlightSection from "@/components/landing/SpotlightSection";
import MarqueeBar from "@/components/landing/MarqueeBar";
import GallerySection from "@/components/landing/GallerySection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";

// Simple error boundary to stop ProductsSection crashing the whole page
class SectionErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default function Home() {
  return (
    <div className="bg-white min-h-screen selection:bg-[#d4af37]/30">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <CollectionCarousel />
      <SpotlightSection />
      <MarqueeBar />
      <SectionErrorBoundary>
        <ProductsSection />
      </SectionErrorBoundary>
      <WhyChooseUsSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <GallerySection />
      <CTASection />
      <Footer />
    </div>
  );
}
