'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types';
import ProductCard from '@/components/store/ProductCard';
import { ShoppingBag, Loader2, Search, X } from 'lucide-react';
import { usePublicStore } from '@/hooks/usePublicStore';

const filterCategories = ['All', 'Whisky', 'Wine', 'Craft Beer'];

export default function ProductsSection() {
    const { storeId, loading: storeLoading } = usePublicStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');

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
                    .select('*')
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

    const categories = ['All', 'Whisky', 'Wine', 'Craft Beer'];

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            return matchesCategory;
        });
    }, [products, selectedCategory]);

    if (loading || storeLoading) {
        return (
            <section id="products" className="py-24 bg-[#0a0a0a] border-t border-[#1f1f1f] relative z-10">
                <div className="max-w-6xl mx-auto px-4 relative">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-[#1a1a2e] border border-[#2a2a2e] text-[#6b6b6b] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                            <Loader2 className="w-4 h-4 animate-spin text-[#d4a853]" /> Loading Catalogue...
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold font-display text-white mb-4">Our Products</h2>
                    </div>
                    {/* Skeleton Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="animate-pulse bg-[#111118] rounded-3xl border border-[#1f1f2e] overflow-hidden aspect-[3/4]"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (products.length === 0 && !loading) {
        return (
            <section id="products" className="py-24 bg-[#0a0a0a] border-t border-[#1f1f1f] relative z-10">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold font-display text-white mb-4">Our Products</h2>
                    <p className="text-[#6b6b6b] mt-8 text-lg">Our curated collection is currently being updated. Check back soon!</p>
                </div>
            </section>
        );
    }

    return (
        <section id="products" className="py-24 bg-[#0a0a0a] border-t border-[#1f1f1f] relative z-10">
            <div className="max-w-6xl mx-auto px-4 relative">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-[#1a1a2e] border border-[#2a2a2e] text-[#6b6b6b] px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                        <ShoppingBag size={14} className="text-[#d4a853]" /> Available Wholesale
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold font-display text-white mb-4">Our Products</h2>
                    <p className="text-[#6b6b6b] max-w-xl mx-auto text-lg hover:text-white transition-colors">Browse our curated selection and place your premium bulk order online.</p>
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
                                const count = cat === 'All' ? products.length : products.filter(p => p.category === cat).length;
                                const isActive = selectedCategory === cat;

                                let btnStyle = '';
                                let badgeStyle = '';

                                if (cat === 'Whisky') {
                                    btnStyle = isActive
                                        ? 'bg-[#92400e] text-white shadow-md shadow-[#92400e]/30 border border-transparent font-bold'
                                        : 'bg-[#1a1a2e] text-[#b45309] border border-[#92400e]/30 hover:border-[#92400e]/60 hover:bg-[#92400e]/10';
                                    badgeStyle = isActive ? 'bg-white/20 text-white' : 'bg-[#92400e]/20 text-[#b45309]';
                                } else if (cat === 'Wine') {
                                    btnStyle = isActive
                                        ? 'bg-[#722F37] text-white shadow-md shadow-[#722F37]/30 border border-transparent font-bold'
                                        : 'bg-[#1a1a2e] text-[#9f1239] border border-[#722F37]/30 hover:border-[#722F37]/60 hover:bg-[#722F37]/10';
                                    badgeStyle = isActive ? 'bg-white/20 text-white' : 'bg-[#722F37]/20 text-[#9f1239]';
                                } else if (cat === 'Craft Beer') {
                                    btnStyle = isActive
                                        ? 'bg-[#B8860B] text-white shadow-md shadow-[#B8860B]/30 border border-transparent font-bold'
                                        : 'bg-[#1a1a2e] text-[#ca8a04] border border-[#B8860B]/30 hover:border-[#B8860B]/60 hover:bg-[#B8860B]/10';
                                    badgeStyle = isActive ? 'bg-white/20 text-white' : 'bg-[#B8860B]/20 text-[#ca8a04]';
                                } else {
                                    btnStyle = isActive
                                        ? 'bg-[#d4a853] text-[#0a0a0a] shadow-md shadow-[#d4a853]/30 border border-transparent font-bold hover:bg-[#c9a84c]'
                                        : 'bg-[#1a1a2e] text-[#d4a853] border border-[#d4a853]/30 hover:border-[#d4a853]/60 hover:bg-[#d4a853]/10';
                                    badgeStyle = isActive ? 'bg-[#0a0a0a]/20 text-[#0a0a0a]' : 'bg-[#d4a853]/20 text-[#d4a853]';
                                }

                                // Beverage SVG icons per category
                                const categoryIcon = cat === 'Whisky' ? (
                                    <svg width="48" height="56" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_4px_12px_rgba(139,69,19,0.45)] flex-shrink-0">
                                        <rect x="19" y="0" width="10" height="6" rx="2" fill="#c9a84c" />
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
                                ) : cat === 'Wine' ? (
                                    <svg width="44" height="56" viewBox="0 0 44 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_4px_12px_rgba(114,47,55,0.45)] flex-shrink-0">
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
                                ) : cat === 'Craft Beer' ? (
                                    <svg width="54" height="56" viewBox="0 0 60 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_4px_12px_rgba(184,134,11,0.45)] flex-shrink-0">
                                        <path d="M44 26 Q58 26 58 38 Q58 50 44 50" stroke="#B8860B" strokeWidth="6" fill="none" strokeLinecap="round" />
                                        <path d="M44 26 Q54 26 54 38 Q54 50 44 50" stroke="#d4a853" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
                                        <rect x="6" y="20" width="40" height="46" rx="4" fill="#B8860B" />
                                        <rect x="6" y="20" width="13" height="46" rx="3" fill="#c9a84c" opacity="0.3" />
                                        <rect x="8" y="32" width="36" height="32" rx="2" fill="#d4a853" />
                                        <rect x="8" y="32" width="12" height="32" rx="2" fill="#e0b84d" opacity="0.3" />
                                        <ellipse cx="14" cy="32" rx="6" ry="5" fill="white" opacity="0.95" />
                                        <ellipse cx="24" cy="30" rx="7" ry="6" fill="white" opacity="0.95" />
                                        <ellipse cx="34" cy="32" rx="6" ry="5" fill="white" opacity="0.95" />
                                        <ellipse cx="42" cy="33" rx="4" ry="4" fill="white" opacity="0.90" />
                                        <rect x="8" y="30" width="36" height="8" fill="white" opacity="0.85" />
                                        <rect x="4" y="64" width="44" height="6" rx="3" fill="#8B640A" />
                                        <rect x="10" y="22" width="4" height="38" rx="2" fill="white" opacity="0.12" />
                                        <circle cx="18" cy="50" r="2" fill="#e8c66a" opacity="0.6" />
                                        <circle cx="28" cy="44" r="1.5" fill="#e8c66a" opacity="0.5" />
                                        <circle cx="36" cy="54" r="2" fill="#e8c66a" opacity="0.6" />
                                    </svg>
                                ) : null;

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
                    <div key="empty" className="text-center py-24 text-[#6b6b6b] bg-[#111111] rounded-3xl border border-[#1f1f1f]" style={{ animation: 'productsFadeIn 0.5s ease-out forwards' }}>
                        <p className="text-xl font-medium text-white mb-2">
                            {selectedCategory !== 'All' ? 'No products in this category yet' : 'No products found'}
                        </p>
                        <p className="text-sm">Try exploring our other categories.</p>
                        {selectedCategory !== 'All' && (
                            <button suppressHydrationWarning
                                onClick={() => setSelectedCategory('All')}
                                className="mt-6 px-8 py-3 bg-[#d4a853] text-[#0a0a0a] rounded-full text-sm font-bold hover:bg-[#c9a84c] transition-colors shadow-lg shadow-[#d4a853]/20"
                            >
                                Show All Products
                            </button>
                        )}
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
