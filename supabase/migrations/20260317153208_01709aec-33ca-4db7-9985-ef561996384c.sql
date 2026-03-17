
-- Drop and recreate admin_get_pro_users with tier and status columns
DROP FUNCTION IF EXISTS public.admin_get_pro_users();

CREATE FUNCTION public.admin_get_pro_users()
RETURNS TABLE(
  user_id uuid, display_name text, email text, neverai_id text,
  plan text, tier text, status text,
  subscribed_at timestamp with time zone, expires_at timestamp with time zone,
  is_admin_override boolean, is_expired boolean,
  days_remaining integer, payment_amount bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    us.plan::text,
    us.tier::text,
    us.status::text,
    us.subscribed_at,
    us.expires_at,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    (us.expires_at IS NOT NULL AND us.expires_at < NOW()) as is_expired,
    CASE 
      WHEN us.expires_at IS NULL THEN NULL
      WHEN us.expires_at < NOW() THEN 0
      ELSE EXTRACT(DAY FROM us.expires_at - NOW())::integer
    END as days_remaining,
    COALESCE((SELECT pl.amount::bigint FROM payments_log pl WHERE pl.user_id = us.user_id AND pl.status = 'success' ORDER BY pl.created_at DESC LIMIT 1), 0::bigint) as payment_amount
  FROM user_subscriptions us
  JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN auth.users au ON au.id = us.user_id
  WHERE us.plan = 'pro'
  ORDER BY us.subscribed_at DESC NULLS LAST;
END;
$$;

-- Create subscriber health RPC
CREATE OR REPLACE FUNCTION public.admin_get_subscriber_health()
RETURNS TABLE(
  total_paid bigint, active_paid bigint, dormant_paid bigint,
  admin_granted bigint, organic_paid bigint,
  repeat_buyers bigint, renewals_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH paid_users AS (
    SELECT us.user_id, us.is_admin_override,
      (SELECT MAX(ua.last_seen_at) FROM user_app_access ua WHERE ua.user_id = us.user_id) as last_seen
    FROM user_subscriptions us
    WHERE us.plan = 'pro' AND us.status = 'active'
  ),
  payment_counts AS (
    SELECT pl.user_id, COUNT(DISTINCT pl.razorpay_payment_id)::bigint as pay_count
    FROM payments_log pl
    WHERE pl.status = 'success'
    GROUP BY pl.user_id
  ),
  this_month_renewals AS (
    SELECT pl.user_id
    FROM payments_log pl
    WHERE pl.status = 'success'
      AND pl.created_at >= date_trunc('month', CURRENT_DATE)
      AND EXISTS (
        SELECT 1 FROM payments_log pl2
        WHERE pl2.user_id = pl.user_id AND pl2.status = 'success'
          AND pl2.created_at < date_trunc('month', CURRENT_DATE)
      )
    GROUP BY pl.user_id
  )
  SELECT
    (SELECT COUNT(*) FROM paid_users)::bigint as total_paid,
    (SELECT COUNT(*) FROM paid_users WHERE last_seen >= NOW() - INTERVAL '7 days')::bigint as active_paid,
    (SELECT COUNT(*) FROM paid_users WHERE last_seen IS NULL OR last_seen < NOW() - INTERVAL '7 days')::bigint as dormant_paid,
    (SELECT COUNT(*) FROM paid_users WHERE is_admin_override = true)::bigint as admin_granted,
    (SELECT COUNT(*) FROM paid_users WHERE is_admin_override = false)::bigint as organic_paid,
    (SELECT COUNT(*) FROM payment_counts WHERE pay_count >= 2)::bigint as repeat_buyers,
    (SELECT COUNT(*) FROM this_month_renewals)::bigint as renewals_this_month;
END;
$$;
