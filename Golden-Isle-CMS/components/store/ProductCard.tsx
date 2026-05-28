'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { WineIcon, BeerIcon, WhiskyIcon, AllCategoryIcon } from '@/components/icons';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();
    
    // Faux-3D Parallax & Glint State
    const [transform, setTransform] = useState('');
    const [glint, setGlint] = useState({ x: 50, y: 50, opacity: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Subtle tilt for elegant aesthetic (max 6 degrees)
        const rotateX = ((centerY - y) / 18).toFixed(2);
        const rotateY = ((x - centerX) / 18).toFixed(2);

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
        
        setGlint({
            x: (x / rect.width) * 100,
            y: (y / rect.height) * 100,
            opacity: 0.12
        });
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
        setGlint(prev => ({ ...prev, opacity: 0 }));
    };

    const getCategoryPlaceholder = () => {
        const cat = product.category?.toLowerCase() || '';
        if (cat.includes('wine')) return (
            <div className="flex flex-col items-center z-10 relative">
                <WineIcon size={44} className="opacity-90 drop-shadow-[0_4px_12px_rgba(114,47,55,0.4)] text-[#722F37]" />
                <span className="text-[9px] font-black mt-2.5 uppercase tracking-[0.2em] text-[#722F37]/80">No Image</span>
            </div>
        );
        if (cat.includes('beer')) return (
            <div className="flex flex-col items-center z-10 relative">
                <BeerIcon size={44} className="opacity-90 drop-shadow-[0_4px_12px_rgba(184,134,11,0.4)] text-[#B8860B]" />
                <span className="text-[9px] font-black mt-2.5 uppercase tracking-[0.2em] text-[#B8860B]/80">No Image</span>
            </div>
        );
        if (cat.includes('whisky')) return (
            <div className="flex flex-col items-center z-10 relative">
                <WhiskyIcon size={44} className="opacity-90 drop-shadow-[0_4px_12px_rgba(146,64,14,0.4)] text-[#92400e]" />
                <span className="text-[9px] font-black mt-2.5 uppercase tracking-[0.2em] text-[#92400e]/80">No Image</span>
            </div>
        );
        return (
            <div className="flex flex-col items-center z-10 relative">
                <AllCategoryIcon size={44} className="text-[#d4af37] opacity-90 drop-shadow-[0_4px_12px_rgba(212,168,83,0.4)]" />
                <span className="text-[9px] font-black mt-2.5 uppercase tracking-[0.2em] text-[#d4af37]/80">No Image</span>
            </div>
        );
    };

    const imageUrl = product.images?.[0] || (product as any).image_url;
    const qty = product.stock_quantity;
    const isOutOfStock = product.stock_status === 'out_of_stock' || qty <= 0;

    const stockBadge = () => {
        if (qty === 0 || isOutOfStock) return (
            <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse" />
                Sold Out
            </span>
        );
        if (qty <= 10) return (
            <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                Only {qty} left!
            </span>
        );
        return (
            <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#faf9f6] text-[#6b6b6b] border border-[#e8e4dd] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b8960c] mr-1.5" />
                {qty} In Stock
            </span>
        );
    };

    return (
        <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transform, transformStyle: 'preserve-3d' }}
            className={`group relative bg-white rounded-3xl border border-[#e8e5dd] shadow-xs hover:shadow-[0_20px_48px_-12px_rgba(212,175,55,0.08),0_1px_2px_rgba(232,229,222,0.6)] transition-all duration-300 ease-out flex flex-col h-full overflow-hidden ${
                isOutOfStock ? 'opacity-85 grayscale-[0.2]' : ''
            }`}
        >
            {/* Dynamic Glass Glint Reflection */}
            <div 
                className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${glint.x}% ${glint.y}%, rgba(255,255,255,${glint.opacity}) 0%, transparent 60%)`,
                    mixBlendMode: 'overlay',
                }}
            />

            <Link href={`/product/${product.id}`} className="block flex-1">
                {/* Product Image Frame */}
                <div className="aspect-[4/3] bg-gradient-to-b from-[#fafaf8] to-[#faf9f6]/40 flex items-center justify-center overflow-hidden relative border-b border-[#f5f2eb] max-h-[180px]">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out z-10"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (sibling) sibling.classList.remove('hidden');
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {getCategoryPlaceholder()}
                        </div>
                    )}
                    <div className="hidden absolute inset-0 w-full h-full flex items-center justify-center bg-[#fafaf7]">
                        {getCategoryPlaceholder()}
                    </div>
                </div>

                {/* Product Details */}
                <div className="p-4 flex flex-col gap-2.5">
                    {/* Category Label & Stock Badge */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#b8960c] tracking-widest uppercase opacity-80">
                            {product.category}
                        </span>
                        {stockBadge()}
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-display font-bold text-[#1a1a1a] text-[15px] leading-snug truncate w-full group-hover:text-[#b8960c] transition-colors" title={product.name}>
                            {product.name}
                        </h3>
                        {product.description && (
                            <p className="text-[11px] text-[#8c8c8c] line-clamp-1">
                                {product.description}
                            </p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="flex items-end justify-between mt-1">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-[#8c8c8c] uppercase tracking-wider">Wholesale Price</span>
                            <span className="text-[18px] font-black text-[#1a1a1a] tracking-tight">RM {product.price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </Link>

            {/* CTA Button Link */}
            <div className="px-4 pb-4 mt-auto z-20">
                <Link href={`/product/${product.id}`} className="block w-full">
                    <button
                        disabled={isOutOfStock}
                        className={`w-full py-3 rounded-2xl text-[12px] font-black uppercase tracking-wider transition-all duration-200 ${
                            isOutOfStock
                            ? 'bg-rose-50/50 text-rose-300 border border-rose-100/50 cursor-not-allowed'
                            : 'bg-[#1a1a1a] hover:bg-[#b8960c] text-white hover:text-white border border-transparent shadow-xs active:scale-[0.97]'
                        }`}
                    >
                        {isOutOfStock ? 'Sold Out' : 'View & Order'}
                    </button>
                </Link>
            </div>
        </div>
    );
}

