'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '@/context/CartContext';
import { Product as GlobalProduct } from '@/types';

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

/* ── Inline SVG Icons ────────────────────────────────── */
const CartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a0e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const globalCSS = `
  :root {
    --beige: #f5f0e8;
    --beige-light: #faf8f4;
    --gold: #C9A84C;
    --gold-light: #d4b85e;
    --gold-dark: #b8953d;
    --gold-gradient: linear-gradient(135deg, #d4b85e 0%, #C9A84C 40%, #b8953d 100%);
    --dark: #1a1a0e;
    --dark-muted: #5a5a4a;
    --border: #e8e2d6;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.3); }
    50%      { box-shadow: 0 0 0 8px rgba(201, 168, 76, 0); }
  }
  @keyframes dotPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.7; transform: scale(1.3); }
  }

  .product-page {
    font-family: var(--font-dm-sans), sans-serif;
    background: var(--beige);
    color: var(--dark);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 0;
  }

  .product-container {
    width: 100%;
    min-height: 100vh;
    background: var(--beige);
    position: relative;
    overflow-x: hidden;
    margin: 0 auto;
  }

  /* ── Desktop Grid ─────────────────────────────────── */
  .grid-layout {
    display: block;
  }

  @media (max-width: 1023px) {
    .product-container {
      max-width: 520px;
      padding: 0 16px;
    }
  }

  @media (min-width: 1024px) {
    .product-container {
      max-width: 1200px;
    }
    .grid-layout {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 60px;
      padding: 40px 60px;
      align-items: start;
    }
    .image-sticky {
      position: sticky;
      top: 100px;
    }
    .image-section {
       padding: 0;
    }
    .product-info {
       padding-top: 0;
    }
    .description-section, .info-cards, .cta-section, .quantity-row {
       padding-left: 0;
       padding-right: 0;
    }
    .product-title {
       font-size: 48px;
    }
  }

  /* ── Header ─────────────────────────────────────────── */
  .product-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(245, 240, 232, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--dark);
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 4px;
    transition: opacity 0.2s;
  }
  .back-btn:hover { opacity: 0.6; }

  .cart-btn {
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    transition: transform 0.2s;
  }
  .cart-btn:hover { transform: scale(1.08); }

  .cart-badge {
    position: absolute;
    top: 2px;
    right: 0;
    background: var(--gold);
    color: white;
    font-size: 10px;
    font-weight: 700;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-dm-sans), sans-serif;
  }

  /* ── Image Card ─────────────────────────────────────── */
  .image-section {
    padding: 8px 20px 0;
    animation: fadeUp 0.6s ease-out;
  }

  .image-card {
    position: relative;
    background: var(--beige-light);
    border-radius: 20px;
    overflow: hidden;
    aspect-ratio: 1 / 1.05;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 2px 8px rgba(26, 26, 14, 0.04),
      0 12px 40px rgba(26, 26, 14, 0.06);
    border: 1px solid rgba(201, 168, 76, 0.15);
  }

  /* Gold corner accents */
  .image-card::before,
  .image-card::after {
    content: '';
    position: absolute;
    width: 60px;
    height: 60px;
    pointer-events: none;
    z-index: 2;
  }
  .image-card::before {
    top: 12px; left: 12px;
    border-top: 1.5px solid var(--gold);
    border-left: 1.5px solid var(--gold);
    border-radius: 4px 0 0 0;
  }
  .image-card::after {
    bottom: 12px; right: 12px;
    border-bottom: 1.5px solid var(--gold);
    border-right: 1.5px solid var(--gold);
    border-radius: 0 0 4px 0;
  }

  .stock-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(245, 240, 232, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark);
    letter-spacing: 0.02em;
  }

  .stock-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    animation: dotPulse 2s ease-in-out infinite;
  }

  .product-image {
    width: 85%;
    height: 85%;
    object-fit: contain;
    filter: drop-shadow(0 20px 40px rgba(26, 26, 14, 0.15));
    animation: scaleIn 0.7s ease-out 0.2s both;
    transition: transform 0.4s ease;
  }
  .image-card:hover .product-image {
    transform: scale(1.03);
  }

  /* ── Product Info ───────────────────────────────────── */
  .product-info {
    padding: 24px 20px 0;
    animation: fadeUp 0.6s ease-out 0.15s both;
  }

  .category-tag {
    display: inline-block;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold-dark);
    background: rgba(201, 168, 76, 0.12);
    padding: 5px 14px;
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .product-title {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--dark);
    letter-spacing: -0.01em;
    line-height: 1.1;
    margin-bottom: 4px;
  }

  .product-price {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--gold-dark);
    margin-bottom: 20px;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .price-unit {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 13px;
    font-weight: 400;
    color: var(--dark-muted);
  }

  /* ── CTA Button ─────────────────────────────────────── */
  .cta-section {
    padding: 0 20px;
    animation: fadeUp 0.6s ease-out 0.3s both;
  }

  .add-to-order-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 24px;
    background: var(--gold-gradient);
    color: white;
    border: none;
    border-radius: 14px;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow:
      0 4px 16px rgba(201, 168, 76, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    position: relative;
    overflow: hidden;
  }
  .add-to-order-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    background-size: 200% 100%;
    animation: shimmer 3s ease-in-out infinite;
  }
  .add-to-order-btn:hover {
    transform: translateY(-1px);
    box-shadow:
      0 6px 24px rgba(201, 168, 76, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  .add-to-order-btn:disabled {
    background: #e5dfd3;
    color: rgba(26, 26, 14, 0.4);
    box-shadow: none;
    cursor: not-allowed;
  }
  .add-to-order-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(201, 168, 76, 0.3);
  }
  .add-to-order-btn.added {
    animation: pulseGlow 0.6s ease-out;
  }

  .btn-icon {
    display: flex;
    align-items: center;
  }

  /* ── Description ────────────────────────────────────── */
  .description-section {
    padding: 24px 20px 0;
    animation: fadeUp 0.6s ease-out 0.4s both;
  }

  .section-label {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--dark-muted);
    margin-bottom: 8px;
  }

  .description-text {
    font-size: 14px;
    line-height: 1.65;
    color: var(--dark-muted);
  }

  /* ── Info Cards ─────────────────────────────────────── */
  .info-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 24px 20px 40px;
    animation: fadeUp 0.6s ease-out 0.5s both;
  }

  .info-card {
    background: var(--beige-light);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px;
    transition: border-color 0.2s;
  }
  .info-card:hover {
    border-color: rgba(201, 168, 76, 0.3);
  }

  .info-card-label {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--dark-muted);
    margin-bottom: 6px;
  }

  .info-card-value {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 17px;
    font-weight: 600;
    color: var(--dark);
  }

  /* ── Divider ────────────────────────────────────────── */
  .gold-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin: 0 20px;
  }

  /* ── Quantity Selector ────────────────────────── */
  .quantity-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 0;
    animation: fadeUp 0.6s ease-out 0.25s both;
  }

  .qty-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--dark-muted);
  }

  .qty-controls {
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--beige-light);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }

  .qty-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 16px;
    font-weight: 600;
    color: var(--dark);
    cursor: pointer;
    transition: background 0.15s;
  }
  .qty-btn:hover { background: rgba(201, 168, 76, 0.1); }
  .qty-btn:disabled { opacity: 0.3; cursor: default; }

  .qty-value {
    width: 40px;
    text-align: center;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 8px 0;
  }
`;

export default function ProductPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { addToCart, totalItems, setIsCartOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;

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

  const handleAddToOrder = () => {
    if (!product) return;

    const globalProduct: GlobalProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category || '',
      stock_status: product.stock_status as any,
      images: product.image_url ? [product.image_url] : [],
      description: product.description || '',
      stock: 999,
      stock_quantity: (product as any).stock_quantity ?? 0,
      status: 'active',
      created_at: product.created_at || new Date().toISOString()
    };

    addToCart(globalProduct, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 600);

    toast.success(`${qty} x ${product.name} added to order!`, {
      style: {
        background: '#1a1a0e',
        color: '#C9A84C',
        border: '1px solid rgba(201, 168, 76, 0.2)',
        fontFamily: 'var(--font-dm-sans), sans-serif'
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#C9A84C]" />
          <p className="text-[#5a5a4a] text-sm font-medium tracking-widest uppercase font-sans">Loading Selection...</p>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-[#faf8f4] border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-6">
            <Package size={40} className="text-[#C9A84C]/50" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a0e] mb-2 font-serif">Selection Not Found</h1>
          <p className="text-[#5a5a4a] mb-8 font-sans">This item may have been removed from our current collection.</p>
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#C9A84C] hover:bg-[#b8953d] text-white font-bold rounded-full transition-all shadow-lg"
          >
            <ArrowLeftIcon /> Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock_status === 'out_of_stock';
  const stockLabel = isOutOfStock ? 'Out of Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'In Stock';
  const stockColor = isOutOfStock ? '#ef4444' : product.stock_status === 'low_stock' ? '#f59e0b' : '#4CAF50';

  return (
    <>
      <style>{globalCSS}</style>

      <div className="product-page">
        <div className="product-container">
          {/* ── Header ──────────────────────── */}
          <header className="product-header">
            <button className="back-btn" onClick={() => router.push('/#products')}>
              <ArrowLeftIcon />
              <span>Back to Products</span>
            </button>
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingBagIcon />
              {totalItems > 0 && (
                <span className="cart-badge">{totalItems}</span>
              )}
            </button>
          </header>

          <div className="grid-layout">
            {/* ── Product Image (Left Column on Desktop) ───────────────── */}
            <div className="image-sticky">
              <div className="image-section">
                <div className="image-card">
                  <div className="stock-badge">
                    <span className="stock-dot" style={{ background: stockColor }} />
                    {stockLabel}
                  </div>
                  <img
                    src={product.image_url || "https://placeholder.com/400x400?text=No+Image"}
                    alt={product.name}
                    className="product-image"
                  />
                </div>
              </div>
            </div>

            {/* ── Product Details (Right Column on Desktop) ────────────────── */}
            <div className="info-column">
              <div className="product-info">
                <span className="category-tag">{product.category || 'Duty-Free'}</span>
                <h1 className="product-title">{product.name}</h1>
                <div className="product-price">
                  RM {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="price-unit">per unit</span>
                </div>
              </div>

              {/* ── Quantity ───────────────────── */}
              <div className="quantity-row">
                <span className="qty-label">Quantity</span>
                <div className="qty-controls">
                  <button
                    className="qty-btn"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1 || isOutOfStock}
                  >
                    −
                  </button>
                  <span className="qty-value">{qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQty((q) => q + 1)}
                    disabled={isOutOfStock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ── CTA Button ─────────────────── */}
              <div className="cta-section" style={{ paddingTop: 16 }}>
                <button
                  disabled={isOutOfStock}
                  className={`add-to-order-btn ${added ? "added" : ""}`}
                  onClick={handleAddToOrder}
                >
                  <span className="btn-icon">
                    <CartIcon />
                  </span>
                  {isOutOfStock ? 'Currently Unavailable' : 'Add to Order'}
                </button>
              </div>

              {/* ── Divider ────────────────────── */}
              <div style={{ paddingTop: 24 }}>
                <div className="gold-divider" />
              </div>

              {/* ── Description ────────────────── */}
              <div className="description-section">
                <div className="section-label">Description</div>
                <p className="description-text">
                  {product.description || "Wholesale pricing available. Prices shown are per unit. Bulk discounts and MOQ info available on enquiry."}
                </p>
              </div>

              {/* ── Info Cards ─────────────────── */}
              <div className="info-cards">
                <div className="info-card">
                  <div className="info-card-label">Category</div>
                  <div className="info-card-value capitalize">{product.category || 'Whisky'}</div>
                </div>
                <div className="info-card">
                  <div className="info-card-label">Availability</div>
                  <div className="info-card-value" style={{ color: stockColor }}>{stockLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
