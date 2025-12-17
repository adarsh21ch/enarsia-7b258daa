-- STEP 1: Create indexes for faster hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_profiles_leaders_id_of_my_leader 
ON profiles(leaders_id_of_my_leader);

CREATE INDEX IF NOT EXISTS idx_profiles_neverai_id 
ON profiles(neverai_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_prospects_user_id 
ON prospects(user_id);

-- STEP 2: Create a security definer function (bypasses RLS, much faster)
CREATE OR REPLACE FUNCTION public.is_in_downline(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Same user
  SELECT CASE 
    WHEN _viewer_id = _target_user_id THEN true
    ELSE EXISTS (
      WITH viewer_profile AS (
        SELECT neverai_id FROM profiles WHERE user_id = _viewer_id LIMIT 1
      ),
      l1_ids AS (
        SELECT neverai_id, user_id FROM profiles 
        WHERE leaders_id_of_my_leader = (SELECT neverai_id FROM viewer_profile)
      ),
      l2_ids AS (
        SELECT neverai_id, user_id FROM profiles 
        WHERE leaders_id_of_my_leader IN (SELECT neverai_id FROM l1_ids)
      ),
      l3_ids AS (
        SELECT user_id FROM profiles 
        WHERE leaders_id_of_my_leader IN (SELECT neverai_id FROM l2_ids)
      )
      SELECT 1 FROM (
        SELECT user_id FROM l1_ids
        UNION ALL
        SELECT user_id FROM l2_ids
        UNION ALL
        SELECT user_id FROM l3_ids
      ) downline
      WHERE downline.user_id = _target_user_id
    )
  END
$$;

-- STEP 3: Drop old policy and create optimized one
DROP POLICY IF EXISTS "Users can view own and L1-L3 downline prospects" ON prospects;

CREATE POLICY "Users can view own and L1-L3 downline prospects"
ON prospects
FOR SELECT
TO authenticated
USING (
  public.is_in_downline(auth.uid(), user_id)
);