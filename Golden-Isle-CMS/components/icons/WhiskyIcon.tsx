import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function WhiskyIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size * (56 / 48)} viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                <linearGradient id="whiskyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF2B2" />
                    <stop offset="30%" stopColor="#D4AF37" />
                    <stop offset="70%" stopColor="#AA7C11" />
                    <stop offset="100%" stopColor="#543D05" />
                </linearGradient>
                <linearGradient id="whiskyGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                    <stop offset="25%" stopColor="rgba(255, 255, 255, 0.15)" />
                    <stop offset="75%" stopColor="rgba(255, 255, 255, 0.2)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.65)" />
                </linearGradient>
                <radialGradient id="whiskyGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(212, 175, 55, 0.3)" />
                    <stop offset="100%" stopColor="rgba(212, 175, 55, 0)" />
                </radialGradient>
            </defs>
            {/* Background Glow */}
            <circle cx="24" cy="36" r="24" fill="url(#whiskyGlow)" />
            {/* Cap */}
            <rect x="18" y="4" width="12" height="6" rx="2" fill="url(#whiskyGrad)" stroke="#AA7C11" strokeWidth="0.5" />
            {/* Neck */}
            <path d="M20 10 H28 V24 H20 Z" fill="url(#whiskyGlass)" stroke="rgba(255, 255, 255, 0.2)" />
            <rect x="21" y="10" width="6" height="14" fill="url(#whiskyGrad)" opacity="0.8" />
            {/* Shoulder */}
            <path d="M20 24 H28 L36 32 V62 C36 65.3 33.3 68 30 68 H18 C14.7 68 12 65.3 12 62 V32 L20 24 Z" fill="url(#whiskyGlass)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
            {/* Liquid */}
            <path d="M13 36 L20 31 L28 34 L35 32 V61 C35 63.8 32.8 66 30 66 H18 C15.2 66 13 63.8 13 61 V36 Z" fill="url(#whiskyGrad)" />
            {/* Label */}
            <rect x="16" y="42" width="16" height="16" rx="1.5" fill="#FAF9F6" stroke="#AA7C11" strokeWidth="1" />
            <rect x="19" y="45" width="10" height="2" fill="#543D05" opacity="0.8" />
            <rect x="18" y="49" width="12" height="1.5" fill="#AA7C11" opacity="0.6" />
            <rect x="20" y="53" width="8" height="1.5" fill="#AA7C11" opacity="0.5" />
            {/* Highlights / Reflections */}
            <path d="M14 36 L14 62" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M34 36 L34 62" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeLinecap="round" />
            <path d="M15 30 L20 25" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
