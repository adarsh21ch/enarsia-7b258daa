-- 1) Add index on user_app_access for faster queries
CREATE INDEX IF NOT EXISTS idx_user_app_access_app_last_seen 
ON public.user_app_access (app, last_seen_at);

-- 2) Create admin analytics function that returns all metrics from a single source of truth
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
RETURNS TABLE(
  neverai_total_users bigint,
  neverai_today_active bigint,
  neverai_week_active bigint,
  active_pro_users bigint,
  total_leads bigint,
  today_leads bigint,
  week_leads bigint,
  month_leads bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    -- NeverAI-specific user counts (from user_app_access)
    (SELECT COUNT(DISTINCT user_id) FROM public.user_app_access WHERE app = 'neverai')::bigint as neverai_total_users,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_app_access WHERE app = 'neverai' AND last_seen_at::date = CURRENT_DATE)::bigint as neverai_today_active,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_app_access WHERE app = 'neverai' AND last_seen_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as neverai_week_active,
    -- Active Pro users
    (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan = 'pro' AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))::bigint as active_pro_users,
    -- Total leads across all users
    (SELECT COUNT(*) FROM public.prospects)::bigint as total_leads,
    -- Today's leads
    (SELECT COUNT(*) FROM public.prospects WHERE date_added::date = CURRENT_DATE)::bigint as today_leads,
    -- Last 7 days leads
    (SELECT COUNT(*) FROM public.prospects WHERE date_added >= CURRENT_DATE - INTERVAL '7 days')::bigint as week_leads,
    -- Last 30 days leads  
    (SELECT COUNT(*) FROM public.prospects WHERE date_added >= CURRENT_DATE - INTERVAL '30 days')::bigint as month_leads;
END;
$$;

-- 3) Create server-side admin search function for users
CREATE OR REPLACE FUNCTION public.admin_search_users(search_query text DEFAULT '')
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  phone text,
  plan text,
  is_admin_override boolean,
  subscribed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.email,
    p.phone,
    COALESCE(s.plan::text, 'free') as plan,
    COALESCE(s.is_admin_override, false) as is_admin_override,
    s.subscribed_at,
    s.expires_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions s ON s.user_id = p.user_id
  WHERE 
    search_query = '' OR search_query IS NULL OR
    p.email ILIKE '%' || search_query || '%' OR
    p.display_name ILIKE '%' || search_query || '%' OR
    p.phone ILIKE '%' || search_query || '%'
  ORDER BY p.created_at DESC
  LIMIT 500;
END;
$$;