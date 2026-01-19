-- Drop and recreate admin_search_users with plan_filter support
DROP FUNCTION IF EXISTS public.admin_search_users(text, integer, integer);

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
  subscribed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, p.display_name, 'User ' || LEFT(p.user_id::text, 8)) as email,
    p.display_name,
    p.neverai_id,
    COALESCE(us.plan, 'free') as plan,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions us ON us.user_id = p.user_id
  WHERE 
    -- Search filter
    (
      search_query = '' 
      OR search_query IS NULL
      OR p.email ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR p.neverai_id ILIKE '%' || search_query || '%'
    )
    -- Plan filter
    AND (
      plan_filter IS NULL
      OR plan_filter = ''
      OR (plan_filter = 'pro' AND COALESCE(us.plan, 'free') = 'pro')
      OR (plan_filter = 'free' AND COALESCE(us.plan, 'free') != 'pro')
    )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;