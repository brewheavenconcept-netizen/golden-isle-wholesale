import React from 'react';

interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({ width = '100%', height = '20px', className = '', rounded = 'md', variant = 'rectangular' }: SkeletonProps) {
    const roundedClasses = { none: 'rounded-none', sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' };
    const roundedClass = variant === 'circular' ? 'rounded-full' : roundedClasses[rounded];
    return <div className={`bg-slate-200 animate-pulse ${roundedClass} ${className}`} style={{ width, height }} />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={`skeleton-text-${i}`} height="16px" width={i === lines - 1 ? '80%' : '100%'} />
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4">
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {Array.from({ length: columns }).map((_, i) => (<Skeleton key={`header-${i}`} height="16px" width="80px" />))}
                </div>
            </div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="border-b border-slate-100 p-4 last:border-b-0">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {Array.from({ length: columns }).map((_, colIndex) => (<Skeleton key={`cell-${rowIndex}-${colIndex}`} height="16px" />))}
                    </div>
                </div>
            ))}
        </div>
    );
}
