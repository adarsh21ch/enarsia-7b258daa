
-- NEW TABLE: course_modules
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NEW TABLE: course_chapters
CREATE TABLE IF NOT EXISTS public.course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  video_asset_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required_watch_percent INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ADD progression columns to courses table
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS progression_mode_module TEXT NOT NULL DEFAULT 'sequential',
  ADD COLUMN IF NOT EXISTS progression_mode_chapter TEXT NOT NULL DEFAULT 'sequential',
  ADD COLUMN IF NOT EXISTS allow_manual_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- NEW TABLE: course_chapter_progress
CREATE TABLE IF NOT EXISTS public.course_chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  watch_percentage INTEGER NOT NULL DEFAULT 0,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_position REAL NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, chapter_id)
);

-- RLS
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read modules" ON public.course_modules FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage modules" ON public.course_modules FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can read chapters" ON public.course_chapters FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage chapters" ON public.course_chapters FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read chapter progress" ON public.course_chapter_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can insert chapter progress" ON public.course_chapter_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update chapter progress" ON public.course_chapter_progress FOR UPDATE USING (true) WITH CHECK (true);
