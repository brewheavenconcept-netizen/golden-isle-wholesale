'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types';
import ProductCard from '@/components/store/ProductCard';
import { ShoppingBag, Loader2, Search, X } from 'lucide-react';
import { usePublicStore } from '@/hooks/usePublicStore';
import { WhiskyIcon, WineIcon, BeerIcon, AllCategoryIcon } from '@/components/icons';

const getCategoryIcon = (category: string, size?: number) => {
    switch (category) {
        case 'Whisky': return <WhiskyIcon size={size} className="drop-shadow-[0_4px_12px_rgba(139,69,19,0.45)] flex-shrink-0" />;
        case 'Wine': return <WineIcon size={size} className="drop-shadow-[0_4px_12px_rgba(114,47,55,0.45)] flex-shrink-0" />;
        case 'Craft Beer': return <BeerIcon size={size} className="drop-shadow-[0_4px_12px_rgba(184,134,11,0.45)] flex-shrink-0" />;
        default: return <AllCategoryIcon size={size} className="drop-shadow-[0_4px_12px_rgba(212,168,83,0.45)] flex-shrink-0" />;
    }
}

const filterCategories = ['Whisky', 'Wine', 'Craft Beer'];

export default function ProductsSection() {
    const { storeId, loading: storeLoading } = usePublicStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Whisky');

    useEffect(() => {
        // Initialize Supabase Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );

        async function loadData() {
            setLoading(true);
            try {
                console.log('Fetching products for store:', storeId);
                // Fetch active products from supabase
                const { data, error } = await supabase
                    .from('products')
                    .select('id, name, price, compare_at_price, image_url, category, stock_status, description')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }

                console.log('Products received:', data?.length || 0, data);

                if (data) {
                    // Map database image_url to UI images array if needed, 
                    // or just ensure we handle image_url in ProductCard
                    const mappedProducts = data.map((p: any) => ({
                        ...p,
                        images: p.image_url ? [p.image_url] : [],
                        // price is numeric in DB, ensure it's a number
                        price: Number(p.price),
                        stock: p.stock_status === 'out_of_stock' ? 0 : 100 // fallback stock for UI
                    }));
                    setProducts(mappedProducts);
                }
            } catch (error) {
                console.error('Failed to load products from Supabase:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Listen to custom category filter events from other components (like Carousel)
    useEffect(() => {
        const handleFilter = (e: CustomEvent) => {
            if (e.detail) {
                setSelectedCategory(e.detail);
            }
        };
        window.addEventListener('filterCategory', handleFilter as EventListener);
        return () => window.removeEventListener('filterCategory', handleFilter as EventListener);
    }, []);

    const categories = ['Whisky', 'Wine', 'Craft Beer'];

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.category === selectedCategory);
    }, [products, selectedCategory]);

    if (loading || storeLoading) {
        return (
            <section id="products" className="py-24 bg-white border-t border-[#e8e4dd] relative z-10">
                <div className="max-w-6xl mx-auto px-4 relative">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-[#fafaf7] border border-[#e8e4dd] text-[#6b6b6b] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                            <Loader2 className="w-4 h-4 animate-spin text-[#b8960c]" /> Loading Catalogue...
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold font-display text-[#1a1a1a] mb-4">Our Products</h2>
                    </div>
                    {/* Skeleton Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="animate-pulse bg-[#fafaf7] rounded-3xl border border-[#e8e4dd] overflow-hidden aspect-[3/4]"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (products.length === 0 && !loading) {
        return (
            <section id="products" className="py-24 bg-white border-t border-[#e8e4dd] relative z-10">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold font-display text-[#1a1a1a] mb-4">Our Products</h2>
                    <p className="text-[#6b6b6b] mt-8 text-lg">Our curated collection is currently being updated. Check back soon!</p>
                </div>
            </section>
        );
    }

    return (
        <section id="products" className="py-24 bg-white border-t border-[#e8e4dd] relative z-10">
            <div className="max-w-6xl mx-auto px-4 relative">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-[#fafaf7] border border-[#e8e4dd] text-[#6b6b6b] px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                        <ShoppingBag size={14} className="text-[#b8960c]" /> Available Wholesale
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold font-display text-[#1a1a1a] mb-4">Our Products</h2>
                    <p className="text-[#6b6b6b] max-w-xl mx-auto text-lg hover:text-[#1a1a1a] transition-colors">Browse our curated selection and place your premium bulk order online.</p>
                </div>

                {/* Removed Search Bar */}

                {/* Category Pills */}
                {categories.length > 1 && (
                    <>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .no-scrollbar::-webkit-scrollbar { display: none; }
                            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                            @keyframes productsFadeIn {
                                from { opacity: 0; transform: translateY(10px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                        `}} />
                        <div className="flex gap-6 overflow-x-auto pb-6 mb-8 md:justify-center no-scrollbar px-1 border-b border-[#1f1f1f] items-end">
                            {categories.map((cat, index) => {
                                const count = products.filter(p => p.category === cat).length;
                                const isActive = selectedCategory === cat;

                                let btnStyle = '';
                                let badgeStyle = '';

                                if (cat === 'Whisky') {
                                    btnStyle = isActive
                                        ? 'bg-[#92400e] text-white shadow-md shadow-[#92400e]/30 border border-transparent font-bold'
                                        : 'bg-white text-[#1a1a2e] border border-gray-200 hover:border-[#92400e]/50 hover:bg-amber-50';
                                    badgeStyle = isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600';
                                } else if (cat === 'Wine') {
                                    btnStyle = isActive
                                        ? 'bg-[#722F37] text-white shadow-md shadow-[#722F37]/30 border border-transparent font-bold'
                                        : 'bg-white text-[#1a1a2e] border border-gray-200 hover:border-[#722F37]/50 hover:bg-red-50';
                                    badgeStyle = isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600';
                                } else if (cat === 'Craft Beer') {
                                    btnStyle = isActive
                                        ? 'bg-[#B8860B] text-white shadow-md shadow-[#B8860B]/30 border border-transparent font-bold'
                                        : 'bg-white text-[#1a1a2e] border border-gray-200 hover:border-[#B8860B]/50 hover:bg-yellow-50';
                                    badgeStyle = isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600';
                                }

                                // Beverage SVG icons per category
                                const categoryIcon = getCategoryIcon(cat, 48);

                                return (
                                    <div key={`${cat}-${index}`} className="flex flex-col items-center gap-2">
                                        {categoryIcon && (
                                            <div className={`transition-all duration-300 ${isActive ? 'scale-110 opacity-100' : 'scale-95 opacity-55 hover:opacity-90 hover:scale-100'}`}>
                                                {categoryIcon}
                                            </div>
                                        )}
                                        <button suppressHydrationWarning
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`flex items-center gap-2 px-6 min-h-[44px] rounded-full text-sm whitespace-nowrap transition-all duration-300 ${btnStyle}`}
                                        >
                                            <span>{cat}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeStyle}`}>
                                                {count}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Product Grid */}
                {filteredProducts.length === 0 ? (
                    <div key="empty" className="text-center py-24 text-slate-500 bg-[#fafaf7] rounded-3xl border border-[#e8e4dd]" style={{ animation: 'productsFadeIn 0.5s ease-out forwards' }}>
                        <p className="text-xl font-medium text-[#1a1a1a] mb-2">
                            No products in this category yet
                        </p>
                        <p className="text-sm">Try exploring our other categories.</p>
                    </div>
                ) : (
                    <div key={selectedCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8" style={{ animation: 'productsFadeIn 0.5s ease-out forwards' }}>
                        {filteredProducts.map((product, index) => (
                            <ProductCard key={`${product.id}-${index}`} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
