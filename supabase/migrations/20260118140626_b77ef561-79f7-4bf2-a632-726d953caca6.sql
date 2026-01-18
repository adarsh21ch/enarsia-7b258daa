-- Fix admin_get_revenue_stats to filter from Jan 17, 2026 and use unique payments
CREATE OR REPLACE FUNCTION public.admin_get_revenue_stats()
 RETURNS TABLE(total_revenue bigint, this_month_revenue bigint, last_month_revenue bigint, total_payments bigint, successful_payments bigint, failed_payments bigint, mini_plan_revenue bigint, pro_plan_revenue bigint, mini_plan_count bigint, pro_plan_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH unique_payments AS (
    SELECT DISTINCT ON (razorpay_payment_id) 
      razorpay_payment_id,
      amount,
      status,
      created_at
    FROM payments_log
    WHERE created_at >= '2026-01-17'::timestamp
    ORDER BY razorpay_payment_id, created_at DESC
  )
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0)::bigint as total_revenue,
    COALESCE(SUM(CASE WHEN status = 'success' AND created_at >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0)::bigint as this_month_revenue,
    COALESCE(SUM(CASE WHEN status = 'success' AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0)::bigint as last_month_revenue,
    COUNT(*)::bigint as total_payments,
    COUNT(CASE WHEN status = 'success' THEN 1 END)::bigint as successful_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::bigint as failed_payments,
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 9900 THEN amount ELSE 0 END), 0)::bigint as mini_plan_revenue,
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 29900 THEN amount ELSE 0 END), 0)::bigint as pro_plan_revenue,
    COUNT(CASE WHEN status = 'success' AND amount = 9900 THEN 1 END)::bigint as mini_plan_count,
    COUNT(CASE WHEN status = 'success' AND amount = 29900 THEN 1 END)::bigint as pro_plan_count
  FROM unique_payments;
END;
$function$;

-- Fix admin_get_revenue_trend to filter from Jan 17, 2026 and use unique payments
CREATE OR REPLACE FUNCTION public.admin_get_revenue_trend(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, revenue bigint, payment_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH unique_payments AS (
    SELECT DISTINCT ON (razorpay_payment_id) 
      razorpay_payment_id,
      amount,
      status,
      created_at
    FROM payments_log
    WHERE created_at >= '2026-01-17'::timestamp
    ORDER BY razorpay_payment_id, created_at DESC
  )
  SELECT 
    d.date::date,
    COALESCE(SUM(up.amount), 0)::bigint as revenue,
    COUNT(up.razorpay_payment_id)::bigint as payment_count
  FROM generate_series(
    GREATEST(CURRENT_DATE - (days_back || ' days')::interval, '2026-01-17'::date),
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(date)
  LEFT JOIN unique_payments up ON up.created_at::date = d.date::date AND up.status = 'success'
  GROUP BY d.date
  ORDER BY d.date;
END;
$function$;

-- Create a new function to get recent payments with user info
CREATE OR REPLACE FUNCTION public.admin_get_recent_payments(limit_count integer DEFAULT 50)
 RETURNS TABLE(
   id uuid,
   created_at timestamptz,
   user_email text,
   user_display_name text,
   amount bigint,
   status text,
   event_type text,
   razorpay_payment_id text
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
  WITH unique_payments AS (
    SELECT DISTINCT ON (pl.razorpay_payment_id) 
      pl.id,
      pl.created_at,
      pl.user_email,
      pl.user_id,
      pl.amount,
      pl.status,
      pl.event_type,
      pl.razorpay_payment_id
    FROM payments_log pl
    WHERE pl.created_at >= '2026-01-17'::timestamp
    ORDER BY pl.razorpay_payment_id, pl.created_at DESC
  )
  SELECT 
    up.id,
    up.created_at,
    COALESCE(up.user_email, p.email) as user_email,
    p.display_name as user_display_name,
    up.amount,
    up.status,
    up.event_type,
    up.razorpay_payment_id
  FROM unique_payments up
  LEFT JOIN profiles p ON p.user_id = up.user_id
  ORDER BY up.created_at DESC
  LIMIT limit_count;
END;
$function$;