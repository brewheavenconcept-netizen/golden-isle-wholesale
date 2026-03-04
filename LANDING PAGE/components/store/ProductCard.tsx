'use client';

import Link from 'next/link';
import { Product } from '@/types';
import { Package, Wine, Beer, GlassWater } from 'lucide-react';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    // Determine which icon to show based on category
    const getCategoryPlaceholder = () => {
        const cat = product.category?.toLowerCase() || '';
        if (cat.includes('wine')) return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#722F37]/20 blur-2xl rounded-full" />
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#722F37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 drop-shadow-[0_0_8px_rgba(114,47,55,0.5)] relative z-10">
                    <path d="M8 22h8" />
                    <path d="M7 10h10" />
                    <path d="M12 15v7" />
                    <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
                </svg>
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#722F37] relative z-10">NO IMAGE</span>
            </div>
        );
        if (cat.includes('beer')) return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#B8860B]/20 blur-2xl rounded-full" />
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 drop-shadow-[0_0_8px_rgba(184,134,11,0.5)] relative z-10">
                    <path d="M17 11h1.2a3.24 3.24 0 0 1 3.18 3.18O21.38 18 21.38 18a3.24 3.24 0 0 1-3.18 3.18H17" />
                    <path d="m5 8 2 14h10l2-14" />
                    <path d="M7 8S6 2 12 2s5 6 5 6" />
                </svg>
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#B8860B] relative z-10">NO IMAGE</span>
            </div>
        );
        if (cat.includes('whisky')) return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#92400e]/20 blur-2xl rounded-full" />
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 drop-shadow-[0_0_8px_rgba(146,64,14,0.5)] relative z-10">
                    <path d="M10 2v7.51" />
                    <path d="M14 2v7.51" />
                    <rect x="5" y="9" width="14" height="13" rx="2" />
                    <path d="M8 2h8" />
                    <path d="M5 14h14" />
                </svg>
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#92400e] relative z-10">NO IMAGE</span>
            </div>
        );
        return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#d4a853]/20 blur-2xl rounded-full" />
                <Package size={56} className="text-[#d4a853] opacity-90 drop-shadow-[0_0_8px_rgba(212,168,83,0.5)] relative z-10" />
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#d4a853] relative z-10">NO IMAGE</span>
            </div>
        );
    };

    const imageUrl = product.images?.[0] || (product as any).image_url;
    const isOutOfStock = product.stock_status === 'out_of_stock' || product.stock <= 0;

    return (
        <Link href={`/product/${product.id}`} className={`group bg-[#1a1a2e] rounded-2xl overflow-hidden border border-white/5 shadow-sm transition-all duration-300 ${isOutOfStock ? 'opacity-70 grayscale-[0.4]' : 'hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_8px_30px_rgba(212,168,83,0.3)] hover:border-[#d4a853]'}`}>
            <div className="aspect-square bg-[#0a0a14] flex items-center justify-center overflow-hidden relative">
                {imageUrl ? (
                    <>
                        <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="w-[85%] h-[85%] object-contain group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (sibling) sibling.classList.remove('hidden');
                            }}
                        />
                        <div className="hidden absolute inset-0 w-full h-full flex items-center justify-center bg-[#1a1a2e]">
                            {getCategoryPlaceholder()}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
                        {getCategoryPlaceholder()}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-white/5">
                <h3 className="font-bold text-white text-sm truncate group-hover:text-[#d4a853] transition-colors">{product.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-[#d4a853]">RM {product.price.toFixed(2)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="text-sm font-medium text-[#6b6b6b] line-through">RM {product.compare_at_price.toFixed(2)}</span>
                    )}
                </div>
                {isOutOfStock ? (
                    <span className="inline-block mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded">Out of Stock</span>
                ) : product.stock_status === 'low_stock' ? (
                    <span className="inline-block mt-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded animate-pulse">Low Stock</span>
                ) : (
                    <span className="inline-block mt-2 text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded">In Stock</span>
                )}
            </div>
        </Link>
    );
}
