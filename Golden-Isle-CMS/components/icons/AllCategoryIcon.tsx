import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export default function AllCategoryIcon({ size = 56, className = '' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="#d4a853" />
        </svg>
    );
}
