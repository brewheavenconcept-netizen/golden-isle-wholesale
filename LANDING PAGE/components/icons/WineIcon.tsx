import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function WineIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size * (56 / 44)} viewBox="0 0 44 72" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="18" y="0" width="8" height="5" rx="1.5" fill="#d2a679" />
            <rect x="17" y="4" width="10" height="5" rx="1" fill="#722F37" />
            <rect x="18" y="9" width="8" height="16" rx="3" fill="#2d1b1b" />
            <rect x="19" y="9" width="3" height="16" fill="#3d2b2b" opacity="0.5" />
            <path d="M14 25 Q7 34 7 42 L37 42 Q37 34 30 25 Z" fill="#2d1b1b" />
            <path d="M14 25 Q10 34 10 42 L18 42 L18 25 Z" fill="#3d2b2b" opacity="0.4" />
            <rect x="7" y="42" width="30" height="26" rx="3" fill="#2d1b1b" />
            <rect x="7" y="42" width="10" height="26" rx="2" fill="#3d2b2b" opacity="0.3" />
            <rect x="10" y="46" width="24" height="16" rx="2" fill="#722F37" opacity="0.9" />
            <rect x="12" y="48" width="20" height="2" rx="1" fill="#f5c2c7" opacity="0.8" />
            <rect x="13" y="52" width="16" height="1.5" rx="1" fill="#f5c2c7" opacity="0.5" />
            <rect x="14" y="55" width="14" height="1.5" rx="1" fill="#f5c2c7" opacity="0.4" />
            <rect x="7" y="68" width="30" height="3" rx="1.5" fill="#1a0e0e" />
            <rect x="10" y="27" width="3" height="32" rx="1.5" fill="white" opacity="0.1" />
        </svg>
    );
}
