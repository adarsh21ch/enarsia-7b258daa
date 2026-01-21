-- Fix 1: Update admin_search_users to use normalized Leader ID matching
CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_query text DEFAULT '',
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0,
  plan_filter text DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  neverai_id text,
  plan text,
  is_admin_override boolean,
  subscribed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_query text;
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Normalize the search query for leader ID matching
  normalized_query := public.normalize_leader_id(search_query);

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, p.display_name, 'User ' || LEFT(p.user_id::text, 8)) as email,
    p.display_name,
    p.neverai_id,
    COALESCE(us.plan::text, 'free') as plan,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions us ON us.user_id = p.user_id
  WHERE 
    -- Search filter with normalized leader ID matching
    (
      search_query = '' 
      OR search_query IS NULL
      OR p.email ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR p.neverai_id ILIKE '%' || search_query || '%'
      OR (normalized_query IS NOT NULL AND p.neverai_id = normalized_query)
    )
    -- Plan filter
    AND (
      plan_filter IS NULL
      OR plan_filter = ''
      OR (plan_filter = 'pro' AND COALESCE(us.plan::text, 'free') = 'pro')
      OR (plan_filter = 'free' AND COALESCE(us.plan::text, 'free') != 'pro')
    )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Fix 2: Update get_user_by_neverai_id to use normalized lookup
CREATE OR REPLACE FUNCTION public.get_user_by_neverai_id(target_neverai_id text)
RETURNS TABLE(user_id uuid, display_name text, neverai_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_target text;
BEGIN
  -- Normalize the input ID for matching
  normalized_target := public.normalize_leader_id(target_neverai_id);
  
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.neverai_id
  FROM public.profiles p
  WHERE p.neverai_id = normalized_target
     OR UPPER(p.neverai_id) = UPPER(target_neverai_id);
END;
$$;

-- Fix 3: Update update_leader_hierarchy to use normalized lookup
CREATE OR REPLACE FUNCTION public.update_leader_hierarchy(p_user_id uuid, p_leader_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_profile RECORD;
  v_normalized_id text;
BEGIN
  -- Normalize the input leader ID
  v_normalized_id := public.normalize_leader_id(p_leader_id);
  
  -- Look up using both normalized and original formats
  SELECT user_id, neverai_id, root_leader_id 
  INTO v_leader_profile
  FROM public.profiles 
  WHERE neverai_id = v_normalized_id
     OR UPPER(neverai_id) = UPPER(p_leader_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leader ID not found');
  END IF;
  
  IF v_leader_profile.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot set yourself as your leader');
  END IF;
  
  UPDATE public.profiles
  SET 
    leaders_id_of_my_leader = v_leader_profile.neverai_id,
    root_leader_id = COALESCE(v_leader_profile.root_leader_id, v_leader_profile.neverai_id),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'leaders_id_of_my_leader', v_leader_profile.neverai_id,
    'root_leader_id', COALESCE(v_leader_profile.root_leader_id, v_leader_profile.neverai_id)
  );
END;
$$;

-- Fix 4: Create sequential ID generation function for cross-app provisioning
CREATE OR REPLACE FUNCTION public.generate_sequential_neverai_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seq INTEGER;
  v_neverai_id TEXT;
BEGIN
  v_seq := nextval('leader_code_sequence');
  v_neverai_id := 'NVR' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_neverai_id;
END;
$$;

-- Fix 5: Update get_leader_funnel_config to use normalized lookup
CREATE OR REPLACE FUNCTION public.get_leader_funnel_config(target_neverai_id text)
RETURNS TABLE(id uuid, funnel_name text, funnel_length integer, day_1_start date, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_user_id uuid;
  v_normalized_id text;
BEGIN
  -- Normalize the input ID
  v_normalized_id := public.normalize_leader_id(target_neverai_id);
  
  -- Resolve the leader's user_id from neverai_id using normalized matching
  SELECT p.user_id INTO v_leader_user_id
  FROM public.profiles p
  WHERE p.neverai_id = v_normalized_id
     OR UPPER(p.neverai_id) = UPPER(target_neverai_id);
  
  IF v_leader_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the leader's funnel config
  RETURN QUERY
  SELECT 
    fc.id,
    fc.funnel_name,
    fc.funnel_length,
    fc.day_1_start,
    fc.user_id
  FROM public.funnel_configs fc
  WHERE fc.user_id = v_leader_user_id
  ORDER BY fc.created_at DESC
  LIMIT 1;
END;
$$;

-- Fix 6: Update get_leader_stage_config to use normalized lookup
CREATE OR REPLACE FUNCTION public.get_leader_stage_config(target_leader_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_normalized_id text;
BEGIN
  -- Normalize the input ID
  v_normalized_id := public.normalize_leader_id(target_leader_id);
  
  SELECT stage_count, stage_labels, response_labels
  INTO v_config
  FROM public.profiles
  WHERE neverai_id = v_normalized_id
     OR UPPER(neverai_id) = UPPER(target_leader_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'stage_count', v_config.stage_count,
    'stage_labels', v_config.stage_labels,
    'response_labels', v_config.response_labels
  );
END;
$$;