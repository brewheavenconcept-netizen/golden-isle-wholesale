import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function BeerIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size * (56 / 54)} viewBox="0 0 60 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M44 26 Q58 26 58 38 Q58 50 44 50" stroke="#B8860B" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M44 26 Q54 26 54 38 Q54 50 44 50" stroke="#d4af37" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
            <rect x="6" y="20" width="40" height="46" rx="4" fill="#B8860B" />
            <rect x="6" y="20" width="13" height="46" rx="3" fill="#b8960c" opacity="0.3" />
            <rect x="8" y="32" width="36" height="32" rx="2" fill="#d4af37" />
            <rect x="8" y="32" width="12" height="32" rx="2" fill="#e0b84d" opacity="0.3" />
            <ellipse cx="14" cy="32" rx="6" ry="5" fill="white" opacity="0.95" />
            <ellipse cx="24" cy="30" rx="7" ry="6" fill="white" opacity="0.95" />
            <ellipse cx="34" cy="32" rx="6" ry="5" fill="white" opacity="0.95" />
            <ellipse cx="42" cy="33" rx="4" ry="4" fill="white" opacity="0.90" />
            <rect x="8" y="30" width="36" height="8" fill="white" opacity="0.85" />
            <rect x="4" y="64" width="44" height="6" rx="3" fill="#8B640A" />
            <rect x="10" y="22" width="4" height="38" rx="2" fill="white" opacity="0.12" />
            <circle cx="18" cy="50" r="2" fill="#e8c66a" opacity="0.6" />
            <circle cx="28" cy="44" r="1.5" fill="#e8c66a" opacity="0.5" />
            <circle cx="36" cy="54" r="2" fill="#e8c66a" opacity="0.6" />
        </svg>
    );
}
