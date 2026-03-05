'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Package, Loader2, Wine, Beer, GlassWater, MessageCircle, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { WHATSAPP_NUMBER } from '@/lib/config';

type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string | null;
    stock_status: string;
    created_at: string;
};



export default function ProductPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;

        // Basic UUID format check to avoid unnecessary DB call
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );

        async function loadProduct() {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error || !data) {
                    setNotFound(true);
                } else {
                    setProduct({ ...data, price: Number(data.price) });
                }
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }

        loadProduct();
    }, [id]);

    const getCategoryIcon = (category: string | null) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('wine')) return <Wine size={64} className="text-[#b8960c]/40" />;
        if (cat.includes('beer')) return <Beer size={64} className="text-[#b8960c]/40" />;
        if (cat.includes('whisky')) return <GlassWater size={64} className="text-[#b8960c]/40" />;
        return <Package size={64} className="text-[#b8960c]/40" />;
    };

    const getCategoryStyle = (category: string | null) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('wine')) return 'bg-rose-900/30 text-rose-300 border-rose-700/40';
        if (cat.includes('beer')) return 'bg-amber-900/30 text-amber-300 border-amber-700/40';
        if (cat.includes('whisky')) return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40';
        return 'bg-[#b8960c]/10 text-[#d4a853] border-[#b8960c]/30';
    };

    const getStockBadge = (status: string) => {
        if (status === 'out_of_stock') return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-700/40">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                Out of Stock
            </span>
        );
        if (status === 'low_stock') return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-900/30 text-amber-400 border border-amber-700/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Low Stock
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-700/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                In Stock
            </span>
        );
    };

    const handleWhatsApp = () => {
        if (!product) return;
        const message = encodeURIComponent(
            `Hi, I'm interested in *${product.name}* priced at RM ${product.price.toFixed(2)}. Can you share more details?`
        );
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    };

    const handleAddToOrder = () => {
        toast.success(`${product?.name} added to order!`, {
            style: {
                background: '#1a1a1a',
                color: '#d4a853',
                border: '1px solid #b8960c40',
            },
            iconTheme: { primary: '#d4a853', secondary: '#1a1a1a' },
        });
    };

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#d4a853]" />
                    <p className="text-[#6b6b6b] text-sm font-medium tracking-widest uppercase">Loading Product...</p>
                </div>
            </div>
        );
    }

    // ── Not found state ──────────────────────────────────────────────────────
    if (notFound || !product) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 rounded-full bg-[#1a1a1a] border border-[#b8960c]/20 flex items-center justify-center mx-auto mb-6">
                        <Package size={40} className="text-[#b8960c]/50" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
                    <p className="text-[#6b6b6b] mb-8">This product may have been removed or the link is invalid.</p>
                    <Link
                        href="/#products"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#b8960c] hover:bg-[#d4a853] text-black font-bold rounded-full transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Products
                    </Link>
                </div>
            </div>
        );
    }

    const isOutOfStock = product.stock_status === 'out_of_stock';

    // ── Product detail ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Top nav bar */}
            <div className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#1f1f1f]">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[#6b6b6b] hover:text-[#d4a853] transition-colors text-sm font-medium group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        Back to Products
                    </button>
                    <span className="text-[#2a2a2a]">/</span>
                    <span className="text-[#6b6b6b] text-sm truncate max-w-[200px]">{product.name}</span>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

                    {/* LEFT — Image */}
                    <div className="relative w-full lg:sticky lg:top-24">
                        <div className={`relative w-full h-auto max-h-[400px] lg:max-h-none aspect-square rounded-2xl lg:overflow-hidden border border-[#1f1f1f] bg-[#111111] shadow-2xl shadow-black/60 ${isOutOfStock ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            {product.image_url ? (
                                <>
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-[85%] h-[85%] object-contain absolute inset-0 m-auto"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                            if (sibling) sibling.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="hidden absolute inset-0 flex flex-col items-center justify-center">
                                        {getCategoryIcon(product.category)}
                                        <span className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mt-3 font-semibold">Preview Unavailable</span>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    {getCategoryIcon(product.category)}
                                    <span className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mt-3 font-semibold">No Image Available</span>
                                </div>
                            )}

                            {/* Corner gold accent */}
                            <div className="absolute top-4 left-4">
                                {getStockBadge(product.stock_status)}
                            </div>
                        </div>

                        {/* Glow effect beneath image */}
                        <div className="w-3/4 h-4 mx-auto bg-[#b8960c]/10 blur-xl rounded-full mt-1" />
                    </div>

                    {/* RIGHT — Info */}
                    <div className="flex flex-col gap-6">
                        {/* Category badge */}
                        {product.category && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest w-fit ${getCategoryStyle(product.category)}`}>
                                {product.category}
                            </span>
                        )}

                        {/* Name */}
                        <div>
                            <h1 className="text-3xl md:text-4xl xl:text-5xl font-bold text-[#d4a853] leading-tight tracking-tight mb-2">
                                {product.name}
                            </h1>
                            <div className="w-12 h-0.5 bg-gradient-to-r from-[#b8960c] to-transparent rounded-full" />
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white tracking-tight">
                                RM <span className="text-[#d4a853]">{product.price.toFixed(2)}</span>
                            </span>
                            <span className="text-[#4a4a4a] text-sm">per unit</span>
                        </div>

                        {/* Description */}
                        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
                            <h3 className="text-xs font-semibold text-[#4a4a4a] uppercase tracking-widest mb-3">Description</h3>
                            <p className="text-[#9a9a9a] leading-relaxed text-sm">
                                {product.description || 'A premium product from our curated Golden Isle Wholesale collection. Contact us for full product details and bulk pricing.'}
                            </p>
                        </div>

                        {/* Wholesale note */}
                        <div className="flex items-start gap-3 bg-[#b8960c]/5 border border-[#b8960c]/15 rounded-xl p-4">
                            <ShoppingBag size={16} className="text-[#d4a853] shrink-0 mt-0.5" />
                            <p className="text-[#9a9a9a] text-xs leading-relaxed">
                                <span className="text-[#d4a853] font-semibold">Wholesale pricing available.</span> Prices shown are per unit. Bulk discounts and MOQ info available on enquiry.
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-[#1f1f1f]" />

                        {/* CTAs */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleAddToOrder}
                                disabled={isOutOfStock}
                                className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl font-bold text-base transition-all duration-200 shadow-lg ${isOutOfStock
                                    ? 'bg-[#1a1a1a] text-[#4a4a4a] border border-[#2a2a2a] cursor-not-allowed'
                                    : 'bg-[#b8960c] hover:bg-[#d4a853] text-black shadow-[#b8960c]/20 hover:shadow-[#d4a853]/30 hover:-translate-y-0.5 active:translate-y-0'
                                    }`}
                            >
                                <ShoppingBag size={18} />
                                {isOutOfStock ? 'Currently Unavailable' : 'Add to Order'}
                            </button>

                            <button
                                onClick={handleWhatsApp}
                                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl font-bold text-base bg-[#25D366] hover:bg-[#20c05c] text-white transition-all duration-200 shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/30 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <MessageCircle size={18} />
                                WhatsApp Enquiry
                            </button>
                        </div>

                        {/* Meta info */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 text-center">
                                <p className="text-[#4a4a4a] text-[10px] uppercase tracking-widest mb-1">Category</p>
                                <p className="text-white font-semibold text-sm">{product.category || '—'}</p>
                            </div>
                            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 text-center">
                                <p className="text-[#4a4a4a] text-[10px] uppercase tracking-widest mb-1">Availability</p>
                                <p className={`font-semibold text-sm ${product.stock_status === 'in_stock' ? 'text-emerald-400' : product.stock_status === 'low_stock' ? 'text-amber-400' : 'text-red-400'}`}>
                                    {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
