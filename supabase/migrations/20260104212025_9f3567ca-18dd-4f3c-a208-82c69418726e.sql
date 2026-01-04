-- Drop and recreate admin_search_users to properly fetch emails from auth.users
DROP FUNCTION IF EXISTS public.admin_search_users(text);

CREATE OR REPLACE FUNCTION public.admin_search_users(search_query text DEFAULT '')
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
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
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, au.email) as email,
    p.display_name,
    p.phone,
    COALESCE(us.plan::text, 'free') as plan,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  WHERE 
    search_query = '' 
    OR search_query IS NULL
    OR p.display_name ILIKE '%' || search_query || '%'
    OR p.email ILIKE '%' || search_query || '%'
    OR au.email ILIKE '%' || search_query || '%'
    OR p.phone ILIKE '%' || search_query || '%'
  ORDER BY p.created_at DESC
  LIMIT 100;
END;
$$;