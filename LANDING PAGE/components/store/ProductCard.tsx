'use client';

import Link from 'next/link';
import { Product } from '@/types';
import { Package, Wine, Beer, GlassWater } from 'lucide-react';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    // Determine which icon to show based on category
    const getCategoryIcon = () => {
        const cat = product.category?.toLowerCase() || '';
        if (cat.includes('wine')) return <Wine size={48} />;
        if (cat.includes('beer')) return <Beer size={48} />;
        if (cat.includes('whisky')) return <GlassWater size={48} />;
        return <Package size={48} />;
    };

    const imageUrl = product.images?.[0] || (product as any).image_url;

    return (
        <Link href={`/product/${product.id}`} className={`group bg-white rounded-2xl overflow-hidden border border-[#e8e4dd] shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#b8960c]/30 ${product.stock_status === 'out_of_stock' || product.stock <= 0 ? 'opacity-70 grayscale-[0.4]' : ''}`}>
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
                        <div className="hidden absolute inset-0 w-full h-full flex flex-col items-center justify-center text-slate-300 bg-[#f5f3ee]">
                            {getCategoryIcon()}
                            <span className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">Preview Unavailable</span>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-[#fafaf7]">
                        {getCategoryIcon()}
                        <span className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">No Image</span>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-[#fafaf7]">
                <h3 className="font-bold text-[#1a1a1a] text-sm truncate group-hover:text-[#b8960c] transition-colors">{product.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-[#1a1a1a]">RM {product.price.toFixed(2)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="text-sm font-medium text-slate-400 line-through">RM {product.compare_at_price.toFixed(2)}</span>
                    )}
                </div>
                {product.stock_status === 'out_of_stock' || product.stock <= 0 ? (
                    <span className="inline-block mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded">Out of Stock</span>
                ) : product.stock_status === 'low_stock' ? (
                    <span className="inline-block mt-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded">Low Stock</span>
                ) : (
                    <span className="inline-block mt-2 text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded">In Stock</span>
                )}
            </div>
        </Link>
    );
}
