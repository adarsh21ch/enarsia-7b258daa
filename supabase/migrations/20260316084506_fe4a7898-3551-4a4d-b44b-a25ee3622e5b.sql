
CREATE OR REPLACE FUNCTION public.admin_get_tier_breakdown()
RETURNS TABLE (
  tier_value TEXT,
  total_count BIGINT,
  active_count BIGINT,
  expired_count BIGINT
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
    COALESCE(us.tier, 'basic') as tier_value,
    COUNT(*)::bigint as total_count,
    COUNT(*) FILTER (WHERE us.plan = 'pro' AND (us.expires_at IS NULL OR us.expires_at > NOW()))::bigint as active_count,
    COUNT(*) FILTER (WHERE us.plan = 'pro' AND us.expires_at IS NOT NULL AND us.expires_at <= NOW())::bigint as expired_count
  FROM user_subscriptions us
  GROUP BY COALESCE(us.tier, 'basic')
  
  UNION ALL
  
  SELECT 
    'free'::text as tier_value,
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions us2 WHERE us2.user_id = p.user_id))::bigint as total_count,
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions us2 WHERE us2.user_id = p.user_id))::bigint as active_count,
    0::bigint as expired_count
  ORDER BY tier_value;
END;
$function$;
