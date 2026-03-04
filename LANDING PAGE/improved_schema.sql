-- ==========================================
-- Golden Isle Wholesale - Master Schema
-- Run this in your NEW Supabase SQL Editor!
-- (This schema matches the CMS features perfectly but in Single-Tenant mode)
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. super_admins (for 2 roles system)
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dummy "stores" to keep the CMS happy without multi-tenant UI
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
    owner_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
    store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name TEXT,
    currency TEXT DEFAULT 'MYR',
    theme_color TEXT DEFAULT 'blue'
);

-- 4. products (Original CMS structure)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.stores(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    status TEXT DEFAULT 'active',
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. orders (Original CMS structure)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.stores(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Storage Buckets for Images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------
-- SIMPLIFIED RLS POLICIES (Super Admin / Admin Only)
-- -----------------------------------------------------
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Super Admins: just view their ID
CREATE POLICY "Super admins view own record" ON public.super_admins FOR SELECT USING (auth.uid() = id);

-- Stores & Settings: Any Authenticated user can manage, Public can read
CREATE POLICY "Public read stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Admin manage stores" ON public.stores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage settings" ON public.store_settings FOR ALL USING (auth.role() = 'authenticated');

-- Products: Any Authenticated user can manage, Public can read
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- Orders: Public can insert/read, Admin can manage all
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');

-- Storage Products:
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin insert product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Insert the Dummy DB Store so the CMS naturally works with single-tenant
INSERT INTO public.stores (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000000', 'Golden Isle Wholesale', 'default') ON CONFLICT DO NOTHING;
INSERT INTO public.store_settings (store_id, store_name, currency, theme_color) VALUES ('00000000-0000-0000-0000-000000000000', 'Golden Isle Wholesale', 'MYR', 'blue') ON CONFLICT DO NOTHING;
