-- =====================================================
-- CROSS-APP SSO: ACCESS LEADER ID IN ACHIEVERS CLUB
-- =====================================================

-- 1. Create a view that combines ac_profiles with main profiles data
CREATE OR REPLACE VIEW public.ac_user_full_profile AS
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
  u.email
FROM public.ac_profiles ap
LEFT JOIN public.profiles p ON p.user_id = ap.user_id
LEFT JOIN auth.users u ON u.id = ap.user_id;

-- 2. Create a function to get leader ID for any user
CREATE OR REPLACE FUNCTION public.get_user_leader_id(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT neverai_id 
  FROM public.profiles 
  WHERE user_id = user_uuid;
$$;

-- 3. Create a function to check if user has NevoRAI profile
CREATE OR REPLACE FUNCTION public.has_nevorai_profile(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND neverai_id IS NOT NULL
  );
$$;

-- 4. Trigger to auto-create profiles entry when ac_profiles is created
CREATE OR REPLACE FUNCTION public.sync_ac_to_main_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
  VALUES (NEW.user_id, NEW.full_name, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ac_profile_created ON public.ac_profiles;
CREATE TRIGGER on_ac_profile_created
  AFTER INSERT ON public.ac_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ac_to_main_profile();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_leader_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_nevorai_profile(uuid) TO authenticated;

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload schema';