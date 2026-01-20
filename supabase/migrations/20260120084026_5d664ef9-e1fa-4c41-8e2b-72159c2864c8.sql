
-- Drop and recreate admin_get_revenue_stats with updated column names
DROP FUNCTION IF EXISTS public.admin_get_revenue_stats();

CREATE FUNCTION public.admin_get_revenue_stats()
RETURNS TABLE (
  total_revenue bigint,
  this_month_revenue bigint,
  last_month_revenue bigint,
  total_payments bigint,
  successful_payments bigint,
  failed_payments bigint,
  monthly_plan_revenue bigint,
  quarterly_plan_revenue bigint,
  monthly_plan_count bigint,
  quarterly_plan_count bigint
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
    -- Monthly plan (99 INR = 9900 paise)
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 9900 THEN amount ELSE 0 END), 0)::bigint as monthly_plan_revenue,
    -- Quarterly plan (299 INR = 29900 paise)
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 29900 THEN amount ELSE 0 END), 0)::bigint as quarterly_plan_revenue,
    COUNT(CASE WHEN status = 'success' AND amount = 9900 THEN 1 END)::bigint as monthly_plan_count,
    COUNT(CASE WHEN status = 'success' AND amount = 29900 THEN 1 END)::bigint as quarterly_plan_count
  FROM unique_payments;
END;
$$;
