import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function WhiskyIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size * (56 / 48)} viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="19" y="0" width="10" height="6" rx="2" fill="#b8960c" />
            <rect x="20" y="6" width="8" height="14" rx="3" fill="#8B4513" />
            <rect x="21" y="6" width="3" height="14" fill="#a0522d" opacity="0.5" />
            <path d="M16 20 Q10 28 10 36 L38 36 Q38 28 32 20 Z" fill="#8B4513" />
            <path d="M16 20 Q13 28 13 36 L20 36 L20 20 Z" fill="#a0522d" opacity="0.4" />
            <rect x="10" y="36" width="28" height="30" rx="3" fill="#8B4513" />
            <rect x="10" y="36" width="9" height="30" rx="2" fill="#a0522d" opacity="0.3" />
            <rect x="13" y="40" width="22" height="18" rx="2" fill="#f5deb3" opacity="0.9" />
            <rect x="15" y="44" width="18" height="2" rx="1" fill="#8B4513" opacity="0.7" />
            <rect x="16" y="48" width="14" height="1.5" rx="1" fill="#8B4513" opacity="0.5" />
            <rect x="17" y="51" width="12" height="1.5" rx="1" fill="#8B4513" opacity="0.4" />
            <rect x="10" y="66" width="28" height="4" rx="2" fill="#6b3510" />
            <rect x="13" y="22" width="3" height="30" rx="1.5" fill="white" opacity="0.12" />
        </svg>
    );
}
