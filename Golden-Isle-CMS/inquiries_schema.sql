CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can submit inquiry"
  ON public.inquiries FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can view (admin)
CREATE POLICY "Authenticated users can view inquiries"
  ON public.inquiries FOR SELECT
  USING (auth.role() = 'authenticated');
-- Also update and delete
CREATE POLICY "Authenticated users can update inquiries"
  ON public.inquiries FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete inquiries"
  ON public.inquiries FOR DELETE
  USING (auth.role() = 'authenticated');
