-- Admin function to get prospect distribution by thresholds
CREATE OR REPLACE FUNCTION public.admin_get_prospect_distribution()
RETURNS TABLE(
  threshold integer,
  threshold_label text,
  user_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH user_prospect_counts AS (
    SELECT 
      p.user_id,
      COUNT(*)::bigint as prospect_count
    FROM prospects p
    GROUP BY p.user_id
  ),
  thresholds AS (
    SELECT unnest(ARRAY[100, 500, 1000, 5000]) as threshold_val
  )
  SELECT 
    t.threshold_val as threshold,
    CASE 
      WHEN t.threshold_val >= 1000 THEN (t.threshold_val / 1000)::text || 'K+'
      ELSE t.threshold_val::text || '+'
    END as threshold_label,
    COUNT(upc.user_id)::bigint as user_count
  FROM thresholds t
  LEFT JOIN user_prospect_counts upc ON upc.prospect_count >= t.threshold_val
  GROUP BY t.threshold_val
  ORDER BY t.threshold_val;
END;
$function$;

-- Admin function to get users by prospect threshold
CREATE OR REPLACE FUNCTION public.admin_get_users_by_prospect_threshold(p_threshold integer)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  neverai_id text,
  prospect_count bigint,
  plan text,
  last_active timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    COUNT(pr.id)::bigint as prospect_count,
    COALESCE(us.plan::text, 'free') as plan,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  JOIN prospects pr ON pr.user_id = p.user_id
  GROUP BY p.user_id, p.display_name, p.email, au.email, p.neverai_id, us.plan
  HAVING COUNT(pr.id) >= p_threshold
  ORDER BY COUNT(pr.id) DESC;
END;
$function$;

-- Add index for better performance on prospect counts
CREATE INDEX IF NOT EXISTS idx_prospects_user_id_count ON prospects(user_id);