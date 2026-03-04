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
    const [searchQuery, setSearchQuery] = useState('');
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
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

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

                {/* Search Bar */}
                <div className="max-w-lg mx-auto mb-8">
                    <div className="relative group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#b8960c] transition-colors" />
                        <input suppressHydrationWarning
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-4 border border-[#e8e4dd] rounded-full bg-white backdrop-blur-md text-sm focus:ring-2 focus:ring-[#b8960c]/50 focus:border-[#b8960c] outline-none shadow-sm transition-all text-[#1a1a1a] placeholder-slate-400"
                        />
                        {searchQuery && (
                            <button suppressHydrationWarning onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1a1a1a] transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills */}
                {categories.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-6 mb-4 justify-center flex-wrap">
                        {categories.map((cat, index) => (
                            <button suppressHydrationWarning
                                key={`${cat}-${index}`}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                    ? 'bg-[#b8960c] text-white shadow-md border border-[#b8960c]'
                                    : 'bg-white text-[#6b6b6b] border border-[#e8e4dd] hover:border-[#b8960c]/50 hover:text-[#1a1a1a]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Product Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-24 text-slate-500 bg-[#fafaf7] rounded-3xl border border-[#e8e4dd]">
                        <Search className="w-16 h-16 mx-auto mb-4 text-[#e8e4dd]" />
                        <p className="text-xl font-medium text-[#1a1a1a] mb-2">No products found</p>
                        <p className="text-sm">Try a different search or category constraint.</p>
                        {(searchQuery || selectedCategory !== 'All') && (
                            <button suppressHydrationWarning
                                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                                className="mt-6 px-8 py-3 bg-[#b8960c] text-white rounded-full text-sm font-bold hover:bg-[#d4af37] transition-colors shadow-lg shadow-[#b8960c]/20"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                        {filteredProducts.map((product, index) => (
                            <ProductCard key={`${product.id}-${index}`} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
