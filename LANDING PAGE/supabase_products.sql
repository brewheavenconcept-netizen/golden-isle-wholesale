-- Clean start: Remove old conflicting table if exists
DROP TABLE IF EXISTS public.products CASCADE;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID, -- Added for multi-tenant compatibility
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Whisky', 'Wine', 'Craft Beer')),
    image_url TEXT,
    stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy for public to read active products
CREATE POLICY "Public can view products" 
ON public.products 
FOR SELECT 
USING (true);

-- Create policy for admins to push, update, delete
CREATE POLICY "Admins can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update products" 
ON public.products 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create a storage bucket for products if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Migration for existing environments:
ALTER TABLE IF EXISTS public.products DROP CONSTRAINT IF EXISTS products_stock_status_check;

ALTER TABLE IF EXISTS public.products 
ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock';

-- Update previous existing values
UPDATE public.products SET stock_status = 'in_stock' WHERE stock_status = 'In Stock';
UPDATE public.products SET stock_status = 'low_stock' WHERE stock_status = 'Low Stock';
UPDATE public.products SET stock_status = 'out_of_stock' WHERE stock_status = 'Out of Stock';

-- Add the new constraint back
ALTER TABLE IF EXISTS public.products 
ADD CONSTRAINT products_stock_status_check CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock'));

-- Insert Sample Data
INSERT INTO public.products (name, price, category, stock_status) VALUES
('Macallan 18yr', 850.00, 'Whisky', 'in_stock'),
('Penfolds Bin 389', 320.00, 'Wine', 'in_stock'),
('Asahi Super Dry 24pk', 145.00, 'Craft Beer', 'in_stock'),
('Johnnie Walker Black', 180.00, 'Whisky', 'low_stock');
