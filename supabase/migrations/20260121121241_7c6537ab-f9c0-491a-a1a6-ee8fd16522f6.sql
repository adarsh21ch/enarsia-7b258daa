-- =====================================================
-- MIGRATION: Leader ID → Upline Email for TrackUp & Achievers Club
-- Safe to run - uses IF NOT EXISTS and OR REPLACE
-- =====================================================

-- 1. Add upline_email to community_memberships (for Achievers Club)
ALTER TABLE public.community_memberships ADD COLUMN IF NOT EXISTS upline_email text;

-- 2. Add entered_upline_email to ac_join_requests (for Achievers Club)
ALTER TABLE public.ac_join_requests ADD COLUMN IF NOT EXISTS entered_upline_email text;

-- 3. Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_upline_email 
ON public.profiles (upline_email) WHERE upline_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
ON public.profiles (LOWER(email)) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_memberships_upline_email 
ON public.community_memberships (upline_email) WHERE upline_email IS NOT NULL;

-- 4. Backfill profiles.upline_email from leaders_id_of_my_leader
UPDATE public.profiles AS member
SET upline_email = leader.email
FROM public.profiles AS leader
WHERE 
  member.leaders_id_of_my_leader IS NOT NULL
  AND member.upline_email IS NULL
  AND UPPER(TRIM(member.leaders_id_of_my_leader)) = UPPER(TRIM(leader.neverai_id))
  AND leader.email IS NOT NULL;

-- 5. Backfill community_memberships.upline_email from upline_member_user_id
UPDATE public.community_memberships AS cm
SET upline_email = p.email
FROM public.profiles AS p
WHERE 
  cm.upline_member_user_id = p.user_id
  AND cm.upline_email IS NULL
  AND p.email IS NOT NULL;

-- 6. Backfill community_memberships.upline_email from upline_leader_id_text (fallback)
UPDATE public.community_memberships AS cm
SET upline_email = leader.email
FROM public.profiles AS leader
WHERE 
  cm.upline_leader_id_text IS NOT NULL
  AND cm.upline_email IS NULL
  AND UPPER(TRIM(cm.upline_leader_id_text)) = UPPER(TRIM(leader.neverai_id))
  AND leader.email IS NOT NULL;

-- 7. Backfill ac_join_requests.entered_upline_email from upline_user_id
UPDATE public.ac_join_requests AS jr
SET entered_upline_email = p.email
FROM public.profiles AS p
WHERE 
  jr.upline_user_id = p.user_id
  AND jr.entered_upline_email IS NULL
  AND p.email IS NOT NULL;

-- 8. Create/Update function: get_user_by_email
CREATE OR REPLACE FUNCTION public.get_user_by_email(target_email text)
RETURNS TABLE(user_id uuid, display_name text, email text, neverai_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.email, p.neverai_id
  FROM public.profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(target_email));
END;
$$;

-- 9. Create/Update function: update_upline_by_email
CREATE OR REPLACE FUNCTION public.update_upline_by_email(p_user_id uuid, p_upline_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_profile RECORD;
  v_normalized_email text;
BEGIN
  v_normalized_email := LOWER(TRIM(p_upline_email));
  
  SELECT user_id, neverai_id, email, root_leader_id, display_name
  INTO v_upline_profile
  FROM public.profiles 
  WHERE LOWER(TRIM(email)) = v_normalized_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user found with this email address');
  END IF;
  
  IF v_upline_profile.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot set yourself as your upline');
  END IF;
  
  UPDATE public.profiles
  SET 
    upline_email = v_normalized_email,
    leaders_id_of_my_leader = v_upline_profile.neverai_id,
    root_leader_id = COALESCE(v_upline_profile.root_leader_id, v_upline_profile.neverai_id),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'upline_email', v_normalized_email,
    'upline_name', v_upline_profile.display_name,
    'leaders_id_of_my_leader', v_upline_profile.neverai_id,
    'root_leader_id', COALESCE(v_upline_profile.root_leader_id, v_upline_profile.neverai_id)
  );
END;
$$;

-- 10. Create/Update function: clear_upline_relationship
CREATE OR REPLACE FUNCTION public.clear_upline_relationship(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    upline_email = NULL,
    leaders_id_of_my_leader = NULL,
    root_leader_id = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. Update function: is_in_downline (email-based with legacy fallback)
CREATE OR REPLACE FUNCTION public.is_in_downline(viewer_user_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_email TEXT;
  v_viewer_neverai_id TEXT;
  v_target_upline_email TEXT;
  v_target_leaders_id TEXT;
  v_target_root_id TEXT;
BEGIN
  IF viewer_user_id = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  SELECT email, neverai_id INTO v_viewer_email, v_viewer_neverai_id
  FROM public.profiles
  WHERE user_id = viewer_user_id;
  
  IF v_viewer_email IS NULL AND v_viewer_neverai_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT upline_email, leaders_id_of_my_leader, root_leader_id 
  INTO v_target_upline_email, v_target_leaders_id, v_target_root_id
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- PRIMARY: Email-based check
  IF v_viewer_email IS NOT NULL AND v_target_upline_email IS NOT NULL THEN
    IF LOWER(v_target_upline_email) = LOWER(v_viewer_email) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- FALLBACK: Legacy leader_id check
  IF v_viewer_neverai_id IS NOT NULL THEN
    IF (
      UPPER(TRIM(v_target_leaders_id)) = UPPER(TRIM(v_viewer_neverai_id)) OR
      UPPER(TRIM(v_target_root_id)) = UPPER(TRIM(v_viewer_neverai_id))
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 12. Update function: can_leader_view_member (email-based with legacy fallback)
CREATE OR REPLACE FUNCTION public.can_leader_view_member(
  p_leader_user_id uuid,
  p_member_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles leader
    JOIN public.profiles member
      ON member.user_id = p_member_user_id
     AND member.allow_leader_to_view = true
     AND (
       LOWER(member.upline_email) = LOWER(leader.email)
       OR LOWER(member.leaders_id_of_my_leader) = LOWER(leader.neverai_id)
     )
    WHERE leader.user_id = p_leader_user_id
  );
$$;

-- 13. Update admin_search_users to include upline_email in search
CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_query text DEFAULT ''::text,
  plan_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  plan text,
  is_admin_override boolean,
  subscribed_at timestamp with time zone,
  expires_at timestamp with time zone,
  upline_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, p.display_name, 'User ' || LEFT(p.user_id::text, 8)) as email,
    p.display_name,
    COALESCE(us.plan::text, 'free') as plan,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    p.upline_email
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions us ON us.user_id = p.user_id
  WHERE 
    search_query = '' 
    OR search_query IS NULL
    OR p.email ILIKE '%' || search_query || '%'
    OR p.display_name ILIKE '%' || search_query || '%'
    OR p.upline_email ILIKE '%' || search_query || '%'
    OR p.neverai_id ILIKE '%' || search_query || '%'
  ORDER BY p.created_at DESC
  LIMIT 100;
END;
$$;