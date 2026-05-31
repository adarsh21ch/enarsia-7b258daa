-- 1) admin_config_text: replace public denylist with allowlist + auth read
DROP POLICY IF EXISTS "Public can read non-sensitive config" ON public.admin_config_text;

CREATE POLICY "Anon can read vapid public key"
ON public.admin_config_text
FOR SELECT
TO anon
USING (config_key = 'vapid_public_key');

CREATE POLICY "Authenticated can read non-secret config"
ON public.admin_config_text
FOR SELECT
TO authenticated
USING (config_key <> 'vapid_private_key');

-- 2) course_modules: restrict public reads to published courses only
DROP POLICY IF EXISTS "Public can read modules" ON public.course_modules;

CREATE POLICY "Public can read modules of published courses"
ON public.course_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_modules.course_id
      AND c.is_published = true
  )
);

-- 3) course_chapters: restrict public reads to chapters of published courses
DROP POLICY IF EXISTS "Public can read chapters" ON public.course_chapters;

CREATE POLICY "Public can read chapters of published courses"
ON public.course_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = course_chapters.module_id
      AND c.is_published = true
  )
);