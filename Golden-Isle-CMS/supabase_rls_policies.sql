-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 1. categories
-- Public can read. Only authenticated admins can write.
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can modify categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- 2. products
-- Public can read active products or all products based on frontend query. Admins can do everything.
CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Admins can modify products" ON products FOR ALL USING (auth.role() = 'authenticated');

-- 3. stores
-- Public can read store details. Admins can modify.
CREATE POLICY "Public can view stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Admins can modify stores" ON stores FOR ALL USING (auth.role() = 'authenticated');

-- 4. store_settings
-- Public can read settings. Admins can modify.
CREATE POLICY "Public can view store_settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can modify store_settings" ON store_settings FOR ALL USING (auth.role() = 'authenticated');

-- 5. orders
-- Public can insert new orders. Admins can read, update, delete.
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view and modify orders" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- 6. inquiries
-- Public can insert inquiries. Admins can read, update, delete.
CREATE POLICY "Public can insert inquiries" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view and modify inquiries" ON inquiries FOR ALL USING (auth.role() = 'authenticated');

-- 7. super_admins
-- Only admins can read their own or any super admin data depending on need.
CREATE POLICY "Admins can view super_admins" ON super_admins FOR SELECT USING (auth.role() = 'authenticated');

-- 8. fcm_tokens
-- Admins can insert and read tokens.
CREATE POLICY "Admins can manage fcm_tokens" ON fcm_tokens FOR ALL USING (auth.role() = 'authenticated');
