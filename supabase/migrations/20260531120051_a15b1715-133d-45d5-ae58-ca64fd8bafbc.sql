
-- Singleton branding table
CREATE TABLE public.admin_branding (
  id INT PRIMARY KEY DEFAULT 1,
  app_name TEXT NOT NULL DEFAULT 'Nevorai CRM',
  short_name TEXT NOT NULL DEFAULT 'nCRM',
  tagline TEXT NOT NULL DEFAULT 'Your personal CRM for network marketers.',
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_branding_singleton CHECK (id = 1)
);

GRANT SELECT ON public.admin_branding TO anon, authenticated;
GRANT ALL ON public.admin_branding TO service_role;

ALTER TABLE public.admin_branding ENABLE ROW LEVEL SECURITY;

-- Everyone can read branding (public app chrome)
CREATE POLICY "branding readable by all"
ON public.admin_branding FOR SELECT
USING (true);

-- Only hardcoded admin can modify
CREATE POLICY "branding writable by admin"
ON public.admin_branding FOR ALL
TO authenticated
USING ((SELECT auth.jwt() ->> 'email') = 'teamnevorai@gmail.com')
WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'teamnevorai@gmail.com');

-- Seed singleton row
INSERT INTO public.admin_branding (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Public storage bucket for logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "branding bucket public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "branding bucket admin write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding' AND (SELECT auth.jwt() ->> 'email') = 'teamnevorai@gmail.com');

CREATE POLICY "branding bucket admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding' AND (SELECT auth.jwt() ->> 'email') = 'teamnevorai@gmail.com');

CREATE POLICY "branding bucket admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding' AND (SELECT auth.jwt() ->> 'email') = 'teamnevorai@gmail.com');
