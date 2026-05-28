import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function WineIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size * (56 / 44)} viewBox="0 0 44 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                <linearGradient id="wineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D43F51" />
                    <stop offset="35%" stopColor="#722F37" />
                    <stop offset="75%" stopColor="#4A151B" />
                    <stop offset="100%" stopColor="#24070B" />
                </linearGradient>
                <linearGradient id="wineGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                    <stop offset="25%" stopColor="rgba(255, 255, 255, 0.1)" />
                    <stop offset="75%" stopColor="rgba(255, 255, 255, 0.15)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.6)" />
                </linearGradient>
                <radialGradient id="wineGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(114, 47, 55, 0.25)" />
                    <stop offset="100%" stopColor="rgba(114, 47, 55, 0)" />
                </radialGradient>
            </defs>
            {/* Background Glow */}
            <circle cx="22" cy="36" r="22" fill="url(#wineGlow)" />
            {/* Foil Cap */}
            <path d="M18 4 H26 V10 H18 Z" fill="#990011" stroke="#4A151B" strokeWidth="0.5" />
            <path d="M18 4 C18 4 20 6 22 6 C24 6 26 4 26 4" fill="none" stroke="#D43F51" strokeWidth="0.5" />
            {/* Neck */}
            <path d="M19 10 H25 V28 H19 Z" fill="url(#wineGlass)" stroke="rgba(255, 255, 255, 0.2)" />
            <rect x="20" y="10" width="4" height="18" fill="url(#wineGrad)" opacity="0.85" />
            {/* Shoulder to Body */}
            <path d="M19 28 H25 Q35 34 35 44 V64 C35 66.8 32.8 69 30 69 H14 C11.2 69 9 66.8 9 64 V44 Q9 34 19 28 Z" fill="url(#wineGlass)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
            {/* Liquid */}
            <path d="M10 42 Q22 41 34 42 V63 C34 65.2 32.2 67 30 67 H14 C11.8 67 10 65.2 10 63 V42 Z" fill="url(#wineGrad)" />
            {/* Label */}
            <rect x="12" y="46" width="20" height="14" rx="1" fill="#FAF9F6" stroke="#4A151B" strokeWidth="0.5" />
            <rect x="14" y="49" width="16" height="1.5" fill="#4A151B" opacity="0.8" />
            <path d="M22 52 L24 55 H20 Z" fill="#990011" opacity="0.8" />
            <rect x="16" y="56" width="12" height="1" fill="#4A151B" opacity="0.6" />
            {/* Reflections */}
            <path d="M11 40 L11 63" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M33 40 L33 63" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeLinecap="round" />
            <path d="M12 34 Q15 31 19 29" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1" fill="none" />
        </svg>
    );
}
