
-- ============================================================
-- 1. COURSE PROGRESS: scope to enrollment owner
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read chapter progress" ON public.course_chapter_progress;
DROP POLICY IF EXISTS "Anyone can insert chapter progress" ON public.course_chapter_progress;
DROP POLICY IF EXISTS "Anyone can update chapter progress" ON public.course_chapter_progress;

CREATE POLICY "Enrolled user can read own chapter progress"
ON public.course_chapter_progress FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_chapter_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
));

CREATE POLICY "Enrolled user can insert own chapter progress"
ON public.course_chapter_progress FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_chapter_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
));

CREATE POLICY "Enrolled user can update own chapter progress"
ON public.course_chapter_progress FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_chapter_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_chapter_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
));

DROP POLICY IF EXISTS "Anyone can read progress" ON public.course_video_progress;
DROP POLICY IF EXISTS "Anyone can insert progress" ON public.course_video_progress;
DROP POLICY IF EXISTS "Anyone can update progress" ON public.course_video_progress;

CREATE POLICY "Enrolled user can read own video progress"
ON public.course_video_progress FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_video_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
));

CREATE POLICY "Enrolled user can insert own video progress"
ON public.course_video_progress FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_video_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
));

CREATE POLICY "Enrolled user can update own video progress"
ON public.course_video_progress FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_video_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.course_enrollments e
  WHERE e.id = course_video_progress.enrollment_id
    AND e.user_identifier = auth.uid()::text
));

-- ============================================================
-- 2. COURSE CHAPTERS / MODULES: owner-scoped management
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage modules" ON public.course_modules;

CREATE POLICY "Owners can manage their modules"
ON public.course_modules FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = course_modules.course_id
    AND c.owner_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = course_modules.course_id
    AND c.owner_user_id = auth.uid()
));

DROP POLICY IF EXISTS "Authenticated can manage chapters" ON public.course_chapters;

CREATE POLICY "Owners can manage their chapters"
ON public.course_chapters FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.course_modules m
  JOIN public.courses c ON c.id = m.course_id
  WHERE m.id = course_chapters.module_id
    AND c.owner_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.course_modules m
  JOIN public.courses c ON c.id = m.course_id
  WHERE m.id = course_chapters.module_id
    AND c.owner_user_id = auth.uid()
));

-- ============================================================
-- 3. COURSE LEADS: owner-only read
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read course leads" ON public.course_leads;

CREATE POLICY "Course owners can read leads"
ON public.course_leads FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = course_leads.course_id
    AND c.owner_user_id = auth.uid()
));

-- ============================================================
-- 4. FUNNEL NOTIFICATIONS: service-role only insert
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.funnel_notifications;

CREATE POLICY "Service role can insert funnel notifications"
ON public.funnel_notifications FOR INSERT TO service_role
WITH CHECK (true);

-- ============================================================
-- 5. FUNNEL PAYMENTS: remove open insert (service role bypasses RLS)
-- ============================================================
DROP POLICY IF EXISTS "Insert payments for valid leads" ON public.funnel_payments;

-- ============================================================
-- 6. FUNNEL VIEW ANALYTICS: remove open update (service role bypasses RLS)
-- ============================================================
DROP POLICY IF EXISTS "Viewers can update their session" ON public.funnel_view_analytics;

-- ============================================================
-- 7. NOTIFICATIONS: service-role only insert
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;

CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT TO service_role
WITH CHECK (true);

-- ============================================================
-- 8. KYC: remove public PII exposure; provide a safe verified-badge view
-- ============================================================
DROP POLICY IF EXISTS "Public can check verification status" ON public.user_kyc_submissions;

CREATE OR REPLACE VIEW public.user_kyc_verified
WITH (security_invoker = true) AS
SELECT user_id, status
FROM public.user_kyc_submissions
WHERE status = 'approved'::kyc_status;

GRANT SELECT ON public.user_kyc_verified TO anon, authenticated;

-- ============================================================
-- 9. REALTIME: block anonymous channel subscriptions
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime" ON realtime.messages;

CREATE POLICY "Authenticated can receive realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can send realtime"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (true);
