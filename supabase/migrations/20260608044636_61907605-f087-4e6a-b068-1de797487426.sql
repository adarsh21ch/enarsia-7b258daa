
ALTER TABLE public.academy_tutorials
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'mobile'
  CHECK (format IN ('mobile', 'desktop'));

CREATE INDEX IF NOT EXISTS idx_academy_tutorials_format ON public.academy_tutorials(format);
