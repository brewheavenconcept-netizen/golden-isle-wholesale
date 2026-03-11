'use client';

import Link from 'next/link';
import { Product } from '@/types';
import { WineIcon, BeerIcon, WhiskyIcon, AllCategoryIcon } from '@/components/icons';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart();
    
    // Determine which icon to show based on category
    const getCategoryPlaceholder = () => {
        const cat = product.category?.toLowerCase() || '';
        if (cat.includes('wine')) return (
            <div className="flex flex-col items-center z-10 relative">
                <WineIcon size={40} className="opacity-90 drop-shadow-[0_0_8px_rgba(114,47,55,0.5)]" />
                <span className="text-[8px] font-bold mt-2 uppercase tracking-widest text-[#722F37]">NO IMAGE</span>
            </div>
        );
        if (cat.includes('beer')) return (
            <div className="flex flex-col items-center z-10 relative">
                <BeerIcon size={40} className="opacity-90 drop-shadow-[0_0_8px_rgba(184,134,11,0.5)]" />
                <span className="text-[8px] font-bold mt-2 uppercase tracking-widest text-[#B8860B]">NO IMAGE</span>
            </div>
        );
        if (cat.includes('whisky')) return (
            <div className="flex flex-col items-center z-10 relative">
                <WhiskyIcon size={40} className="opacity-90 drop-shadow-[0_0_8px_rgba(146,64,14,0.5)]" />
                <span className="text-[8px] font-bold mt-2 uppercase tracking-widest text-[#92400e]">NO IMAGE</span>
            </div>
        );
        return (
            <div className="flex flex-col items-center z-10 relative">
                <AllCategoryIcon size={40} className="text-[#d4a853] opacity-90 drop-shadow-[0_0_8px_rgba(212,168,83,0.5)]" />
                <span className="text-[8px] font-bold mt-2 uppercase tracking-widest text-[#d4a853]">NO IMAGE</span>
            </div>
        );
    };

    const imageUrl = product.images?.[0] || (product as any).image_url;
    const isOutOfStock = product.stock_status === 'out_of_stock' || product.stock <= 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isOutOfStock) {
            addToCart(product, 1);
        }
    };

    return (
        <div className={`group bg-white rounded-[12px] border border-[#e8e5dd] shadow-sm transition-all duration-300 flex flex-col h-full ${isOutOfStock ? 'opacity-70 grayscale-[0.4]' : 'hover:shadow-md'}`}>
            <Link href={`/product/${product.id}`} className="block flex-1">
                <div className="aspect-square bg-[#fafaf7] flex items-center justify-center overflow-hidden relative rounded-t-[12px] max-h-[160px]">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                
                <div className="p-3 flex flex-col gap-1">
                    <h3 className="font-semibold text-[#1a1a1a] text-[14px] leading-tight truncate w-full" title={product.name}>
                        {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                        <span className="text-[16px] font-bold text-[#1a1a0e]">RM {product.price.toFixed(2)}</span>
                    </div>
                </div>
            </Link>
            
            <div className="px-3 pb-3 mt-auto">
                <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`w-full py-[8px] rounded-[8px] text-[12px] font-semibold transition-all duration-200 ${
                        isOutOfStock 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-[#1a1a0e] text-white hover:bg-[#2a2a1e] active:scale-[0.98]'
                    }`}
                >
                    {isOutOfStock ? 'Sold Out' : 'Add to Order'}
                </button>
            </div>
        </div>
    );
}
