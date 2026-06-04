
-- 1. Tighten course_enrollments anonymous INSERT: force payment_status='none' and forbid payment_proof_url at insert time
DROP POLICY IF EXISTS "Anyone can enroll" ON public.course_enrollments;
CREATE POLICY "Anyone can enroll"
ON public.course_enrollments
FOR INSERT
TO public
WITH CHECK (
  COALESCE(payment_status, 'none') = 'none'
  AND payment_proof_url IS NULL
);

-- 2. Replace admin_config_text authenticated denylist with an explicit allowlist
DROP POLICY IF EXISTS "Authenticated can read non-secret config" ON public.admin_config_text;
CREATE POLICY "Authenticated can read non-secret config"
ON public.admin_config_text
FOR SELECT
TO authenticated
USING (
  config_key IN (
    'vapid_public_key',
    'historical_restriction_scope',
    'streak_active_actions',
    'trial_banner_tabs'
  )
);
