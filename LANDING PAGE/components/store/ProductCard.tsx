'use client';

import Link from 'next/link';
import { Product } from '@/types';
import { Package } from 'lucide-react';
import { WhiskyIcon, WineIcon, BeerIcon, AllCategoryIcon } from '@/components/icons';

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
                <WineIcon size={56} className="opacity-90 drop-shadow-[0_0_8px_rgba(114,47,55,0.5)] relative z-10" />
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#722F37] relative z-10">NO IMAGE</span>
            </div>
        );
        if (cat.includes('beer')) return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#B8860B]/20 blur-2xl rounded-full" />
                <BeerIcon size={56} className="opacity-90 drop-shadow-[0_0_8px_rgba(184,134,11,0.5)] relative z-10" />
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#B8860B] relative z-10">NO IMAGE</span>
            </div>
        );
        if (cat.includes('whisky')) return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#92400e]/20 blur-2xl rounded-full" />
                <WhiskyIcon size={56} className="opacity-90 drop-shadow-[0_0_8px_rgba(146,64,14,0.5)] relative z-10" />
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#92400e] relative z-10">NO IMAGE</span>
            </div>
        );
        return (
            <div className="flex flex-col items-center z-10 relative">
                <div className="absolute inset-0 bg-[#d4a853]/20 blur-2xl rounded-full" />
                <AllCategoryIcon size={56} className="text-[#d4a853] opacity-90 drop-shadow-[0_0_8px_rgba(212,168,83,0.5)] relative z-10" />
                <span className="text-[10px] font-bold mt-4 uppercase tracking-widest text-[#d4a853] relative z-10">NO IMAGE</span>
            </div>
        );
    };

    const imageUrl = product.images?.[0] || (product as any).image_url;
    const isOutOfStock = product.stock_status === 'out_of_stock' || product.stock <= 0;

    return (
        <Link href={`/product/${product.id}`} className={`group bg-white rounded-2xl overflow-hidden border border-[#e8e4dd] shadow-sm transition-all duration-300 ${isOutOfStock ? 'opacity-70 grayscale-[0.4]' : 'hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_8px_30px_rgba(212,168,83,0.3)] hover:border-[#d4a853]'}`}>
            <div className="aspect-square bg-[#fafaf7] flex items-center justify-center overflow-hidden relative">
                {imageUrl ? (
                    <>
                        <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="w-[85%] h-[85%] object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (sibling) sibling.classList.remove('hidden');
                            }}
                        />
                        <div className="hidden absolute inset-0 w-full h-full flex items-center justify-center bg-[#fafaf7]">
                            {getCategoryPlaceholder()}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#fafaf7]">
                        {getCategoryPlaceholder()}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-[#fafaf7]">
                <h3 className="font-bold text-[#1a1a1a] text-sm truncate group-hover:text-[#b8960c] transition-colors">{product.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-[#1a1a1a]">RM {product.price.toFixed(2)}</span>
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
