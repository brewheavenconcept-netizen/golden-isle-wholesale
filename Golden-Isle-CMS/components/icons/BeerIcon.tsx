import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function BeerIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size * (56 / 54)} viewBox="0 0 60 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                <linearGradient id="beerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE082" />
                    <stop offset="35%" stopColor="#FFB300" />
                    <stop offset="75%" stopColor="#FF8F00" />
                    <stop offset="100%" stopColor="#C43D00" />
                </linearGradient>
                <linearGradient id="beerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
                    <stop offset="25%" stopColor="rgba(255, 255, 255, 0.2)" />
                    <stop offset="75%" stopColor="rgba(255, 255, 255, 0.25)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.75)" />
                </linearGradient>
                <radialGradient id="beerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255, 179, 0, 0.25)" />
                    <stop offset="100%" stopColor="rgba(255, 179, 0, 0)" />
                </radialGradient>
            </defs>
            {/* Background Glow */}
            <circle cx="30" cy="38" r="28" fill="url(#beerGlow)" />
            {/* Handle */}
            <path d="M42 26 C54 26 54 48 42 48" stroke="url(#beerGlass)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M42 28 C51 28 51 46 42 46" stroke="url(#beerGrad)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
            {/* Mug Body */}
            <rect x="10" y="20" width="32" height="46" rx="4" fill="url(#beerGlass)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" />
            {/* Liquid */}
            <rect x="12" y="32" width="28" height="32" rx="2" fill="url(#beerGrad)" />
            {/* Glass Panes */}
            <rect x="15" y="24" width="4" height="38" rx="2" fill="rgba(255, 255, 255, 0.25)" />
            <rect x="24" y="24" width="4" height="38" rx="2" fill="rgba(255, 255, 255, 0.25)" />
            <rect x="33" y="24" width="4" height="38" rx="2" fill="rgba(255, 255, 255, 0.15)" />
            {/* Foam head */}
            <path d="M9 32 Q9 24 15 25 Q18 20 25 21 Q30 18 36 21 Q41 23 41 29 Q43 32 41 34 Q39 36 34 35 Q29 36 24 35 Q18 36 14 34 Q9 35 9 32 Z" fill="#FFFFFF" />
            <circle cx="16" cy="27" r="3.5" fill="#FFFFFF" />
            <circle cx="23" cy="25" r="4" fill="#FFFFFF" />
            <circle cx="31" cy="26" r="4.5" fill="#FFFFFF" />
            <circle cx="37" cy="29" r="3" fill="#FFFFFF" />
            {/* Bubbles */}
            <circle cx="16" cy="46" r="1.5" fill="#FFFFFF" opacity="0.6" />
            <circle cx="28" cy="40" r="1" fill="#FFFFFF" opacity="0.5" />
            <circle cx="22" cy="52" r="1.5" fill="#FFFFFF" opacity="0.7" />
            <circle cx="34" cy="48" r="2" fill="#FFFFFF" opacity="0.6" />
            <circle cx="20" cy="36" r="1" fill="#FFFFFF" opacity="0.5" />
            <circle cx="32" cy="38" r="1.5" fill="#FFFFFF" opacity="0.6" />
            {/* Reflections */}
            <path d="M12 28 L12 62" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M40 28 L40 62" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
}
