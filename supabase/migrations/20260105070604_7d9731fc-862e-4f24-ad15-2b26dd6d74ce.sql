-- =====================================================
-- FIX SECURITY: Remove auth.users exposure from view
-- =====================================================

-- Drop the problematic view and recreate without auth.users direct access
DROP VIEW IF EXISTS public.ac_user_full_profile;

-- Recreate view without auth.users join (use profiles.email instead)
CREATE OR REPLACE VIEW public.ac_user_full_profile 
WITH (security_invoker = true) AS
SELECT 
  ap.user_id,
  ap.full_name,
  ap.mobile,
  ap.city,
  ap.state,
  ap.dob,
  ap.onboarding_completed_at,
  ap.created_at,
  ap.updated_at,
  p.neverai_id AS leader_id,
  p.display_name AS nevorai_display_name,
  p.avatar_url,
  p.leaders_id_of_my_leader,
  p.root_leader_id,
  p.level_id,
  p.email
FROM public.ac_profiles ap
LEFT JOIN public.profiles p ON p.user_id = ap.user_id;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';