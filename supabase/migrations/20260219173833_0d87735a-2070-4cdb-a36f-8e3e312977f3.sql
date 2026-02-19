
-- A. Extend courses table
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_bio TEXT,
  ADD COLUMN IF NOT EXISTS instructor_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS skill_level TEXT NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS what_you_learn JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lifetime_access BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS access_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS require_lead_form BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_form_fields JSONB NOT NULL DEFAULT '{"name":true,"phone":true,"email":false}'::jsonb;

-- B. Extend course_modules table
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- C. Extend course_chapters table
ALTER TABLE public.course_chapters
  ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS resource_url TEXT,
  ADD COLUMN IF NOT EXISTS resource_label TEXT;

-- D. New table: course_leads
CREATE TABLE IF NOT EXISTS public.course_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  user_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert course leads" ON public.course_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read course leads" ON public.course_leads FOR SELECT USING (true);

-- E. New table: course_coupons
CREATE TABLE IF NOT EXISTS public.course_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, code)
);

ALTER TABLE public.course_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active coupons" ON public.course_coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage coupons" ON public.course_coupons FOR ALL USING (true) WITH CHECK (true);
