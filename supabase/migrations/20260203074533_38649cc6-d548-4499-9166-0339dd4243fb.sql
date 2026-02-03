-- Step 1: Drop the broken policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view upline leader profile" ON public.profiles;

-- Step 2: Create the helper function (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_user_upline(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_upline_email text;
  viewer_root_leader_id text;
  target_email text;
  target_neverai_id text;
BEGIN
  SELECT p.upline_email, p.root_leader_id INTO viewer_upline_email, viewer_root_leader_id
  FROM profiles p WHERE p.user_id = auth.uid();

  SELECT p.email, p.neverai_id INTO target_email, target_neverai_id
  FROM profiles p WHERE p.user_id = target_user_id;

  IF viewer_upline_email IS NOT NULL AND target_email IS NOT NULL AND LOWER(viewer_upline_email) = LOWER(target_email) THEN
    RETURN true;
  END IF;

  IF viewer_root_leader_id IS NOT NULL AND target_neverai_id IS NOT NULL AND viewer_root_leader_id = target_neverai_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Step 3: Create safe RLS policy using the helper function
CREATE POLICY "Users can view upline leader profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR public.is_user_upline(user_id));