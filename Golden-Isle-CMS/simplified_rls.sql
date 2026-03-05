-- ==========================================
-- Golden Isle Wholesale - Simplified RLS Update
-- Run this in your Supabase SQL Editor to update existing policies
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure super_admins table exists for our 2 roles
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- DROP OLD COMPLEX POLICIES (If they exist)
-- ==========================================
DROP POLICY IF EXISTS "Stores are publicly readable" ON public.stores;
DROP POLICY IF EXISTS "Store owners can insert their stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can update their stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can delete their stores" ON public.stores;
DROP POLICY IF EXISTS "Super admins can manage all stores" ON public.stores;

DROP POLICY IF EXISTS "Store settings are publicly readable" ON public.store_settings;
DROP POLICY IF EXISTS "Store owners manage own settings" ON public.store_settings;
DROP POLICY IF EXISTS "Super admins manage all settings" ON public.store_settings;

DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
DROP POLICY IF EXISTS "Store owners manage own products" ON public.products;

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read an order by ID" ON public.orders;
DROP POLICY IF EXISTS "Store owners manage own orders" ON public.orders;

-- ==========================================
-- CREATE NEW SIMPLIFIED POLICIES
-- Roles: super_admin (in table) and admin (any authenticated user)
-- No more store_id checks!
-- ==========================================

-- -----------------
-- stores and store_settings
-- -----------------
CREATE POLICY "Public read stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Admin full manage stores" ON public.stores FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read store_settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin full manage settings" ON public.store_settings FOR ALL USING (auth.role() = 'authenticated');

-- -----------------
-- products
-- -----------------
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin full manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- -----------------
-- orders
-- -----------------
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admin full manage orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');

-- -----------------
-- super_admins
-- -----------------
CREATE POLICY "Super admins view own record" ON public.super_admins FOR SELECT USING (auth.uid() = id);

-- Ensure default single store is there to avoid CMS crashing:
INSERT INTO public.stores (id, owner_id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000000', auth.uid(), 'Golden Isle Wholesale', 'default')
ON CONFLICT DO NOTHING;

INSERT INTO public.store_settings (store_id, store_name, currency, theme_color)
VALUES ('00000000-0000-0000-0000-000000000000', 'Golden Isle Wholesale', 'MYR', 'blue')
ON CONFLICT DO NOTHING;
