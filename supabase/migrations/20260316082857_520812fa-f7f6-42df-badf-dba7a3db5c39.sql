
DROP FUNCTION IF EXISTS public.admin_search_users_enhanced(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_search_users_enhanced(
  search_query TEXT DEFAULT '',
  plan_filter TEXT DEFAULT NULL,
  page_size INT DEFAULT 100,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  neverai_id TEXT,
  plan TEXT,
  tier TEXT,
  is_admin_override BOOLEAN,
  subscribed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_leads_count BIGINT,
  source_app TEXT,
  last_active_at TIMESTAMPTZ,
  is_suspended BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT,
  trial_start_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_normalized_query TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  v_normalized_query := LOWER(TRIM(search_query));

  SELECT COUNT(DISTINCT p.user_id) INTO v_total
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE (
    v_normalized_query = '' OR
    LOWER(COALESCE(p.email, au.email, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.display_name, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.neverai_id, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.upline_email, '')) LIKE '%' || v_normalized_query || '%'
  )
  AND (
    plan_filter IS NULL OR
    plan_filter = 'all' OR
    (plan_filter = 'free' AND (us.plan IS NULL OR us.plan = 'free')) OR
    (plan_filter = 'pro' AND us.tier = 'pro') OR
    (plan_filter = 'premium' AND us.tier = 'premium') OR
    (plan_filter = 'basic' AND (us.tier IS NULL OR us.tier = 'basic') AND (us.plan IS NULL OR us.plan = 'free'))
  );

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, au.email) as email,
    p.display_name,
    p.neverai_id,
    COALESCE(us.plan::text, 'free') as plan,
    COALESCE(us.tier, 'basic') as tier,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id)::bigint as total_leads_count,
    p.source_app,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active_at,
    COALESCE(p.is_suspended, false) as is_suspended,
    p.created_at,
    v_total as total_count,
    p.created_at as trial_start_date
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE (
    v_normalized_query = '' OR
    LOWER(COALESCE(p.email, au.email, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.display_name, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.neverai_id, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.upline_email, '')) LIKE '%' || v_normalized_query || '%'
  )
  AND (
    plan_filter IS NULL OR
    plan_filter = 'all' OR
    (plan_filter = 'free' AND (us.plan IS NULL OR us.plan = 'free')) OR
    (plan_filter = 'pro' AND us.tier = 'pro') OR
    (plan_filter = 'premium' AND us.tier = 'premium') OR
    (plan_filter = 'basic' AND (us.tier IS NULL OR us.tier = 'basic') AND (us.plan IS NULL OR us.plan = 'free'))
  )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$function$;
