
-- 1. New RPC: admin_get_nevorai_user_count
CREATE OR REPLACE FUNCTION public.admin_get_nevorai_user_count()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN (
    SELECT COUNT(DISTINCT p.user_id)
    FROM profiles p
    JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
  );
END;
$function$;

-- 2. Update admin_get_conversion_analytics to filter by Nevorai
CREATE OR REPLACE FUNCTION public.admin_get_conversion_analytics()
 RETURNS TABLE(total_users bigint, free_users bigint, pro_users bigint, conversion_rate numeric, conversions_this_month bigint, conversions_last_month bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(DISTINCT p.user_id) as total,
      COUNT(DISTINCT CASE WHEN us.plan = 'pro' THEN p.user_id END) as pro,
      COUNT(DISTINCT CASE WHEN us.plan IS NULL OR us.plan = 'free' THEN p.user_id END) as free
    FROM profiles p
    JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
    LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  ),
  monthly_conversions AS (
    SELECT 
      COUNT(CASE WHEN us2.subscribed_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month,
      COUNT(CASE WHEN us2.subscribed_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' 
                  AND us2.subscribed_at < date_trunc('month', CURRENT_DATE) THEN 1 END) as last_month
    FROM user_subscriptions us2
    JOIN user_products up2 ON up2.user_id = us2.user_id AND up2.product = 'nevorai'
    WHERE us2.plan = 'pro'
  )
  SELECT 
    uc.total::bigint,
    uc.free::bigint,
    uc.pro::bigint,
    CASE WHEN uc.total > 0 THEN ROUND((uc.pro::numeric / uc.total::numeric) * 100, 2) ELSE 0 END as conversion_rate,
    mc.this_month::bigint,
    mc.last_month::bigint
  FROM user_counts uc, monthly_conversions mc;
END;
$function$;

-- 3. Update admin_get_free_users_paginated to filter by Nevorai
CREATE OR REPLACE FUNCTION public.admin_get_free_users_paginated(page_size integer DEFAULT 50, page_offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, display_name text, email text, neverai_id text, leads_count bigint, last_active timestamp with time zone, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM profiles p
  JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  WHERE us.user_id IS NULL OR us.plan = 'free';

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id)::bigint as leads_count,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active,
    p.created_at,
    v_total as total_count
  FROM profiles p
  JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  WHERE us.user_id IS NULL OR us.plan = 'free'
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$function$;

-- 4. Update admin_get_signup_cohort_analytics to filter by Nevorai
CREATE OR REPLACE FUNCTION public.admin_get_signup_cohort_analytics()
 RETURNS TABLE(cohort_label text, cohort_day integer, user_count bigint, still_active bigint, retention_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH cohorts AS (
    SELECT 
      p.user_id,
      p.created_at::date as signup_date,
      EXTRACT(DAY FROM (CURRENT_DATE - p.created_at::date))::integer as days_since_signup,
      EXISTS (
        SELECT 1 FROM user_app_access ua 
        WHERE ua.user_id = p.user_id 
        AND ua.app = 'neverai' 
        AND ua.last_seen_at >= CURRENT_DATE - INTERVAL '7 days'
      ) as is_active
    FROM profiles p
    JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
  ),
  grouped AS (
    SELECT
      CASE 
        WHEN days_since_signup = 0 THEN 'Today'
        WHEN days_since_signup = 1 THEN 'Yesterday'
        WHEN days_since_signup = 2 THEN '2 days ago'
        WHEN days_since_signup BETWEEN 3 AND 4 THEN '3-4 days ago'
        WHEN days_since_signup BETWEEN 5 AND 6 THEN '5-6 days ago'
        WHEN days_since_signup = 7 THEN '7 days ago'
        ELSE '8+ days ago'
      END as cohort_label,
      CASE 
        WHEN days_since_signup = 0 THEN 0
        WHEN days_since_signup = 1 THEN 1
        WHEN days_since_signup = 2 THEN 2
        WHEN days_since_signup BETWEEN 3 AND 4 THEN 3
        WHEN days_since_signup BETWEEN 5 AND 6 THEN 5
        WHEN days_since_signup = 7 THEN 7
        ELSE 8
      END as cohort_day,
      COUNT(*) as user_count,
      COUNT(CASE WHEN is_active THEN 1 END) as still_active
    FROM cohorts
    GROUP BY 1, 2
  )
  SELECT
    g.cohort_label,
    g.cohort_day,
    g.user_count,
    g.still_active,
    CASE WHEN g.user_count > 0 
      THEN ROUND((g.still_active::numeric / g.user_count * 100), 1)
      ELSE 0 
    END as retention_rate
  FROM grouped g
  ORDER BY g.cohort_day;
END;
$function$;

-- 5. Update admin_get_churn_risk_users to filter by Nevorai
CREATE OR REPLACE FUNCTION public.admin_get_churn_risk_users(p_limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, display_name text, email text, neverai_id text, risk_type text, days_since_active integer, trial_days_remaining integer, plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_days integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COALESCE(config_value::integer, 7) INTO v_trial_days
  FROM admin_usage_limits
  WHERE config_key = 'trial_duration_days' AND is_enabled = true;
  
  IF v_trial_days IS NULL THEN
    v_trial_days := 7;
  END IF;

  RETURN QUERY
  WITH user_risk AS (
    SELECT 
      p.user_id,
      p.display_name,
      COALESCE(p.email, au.email) as email,
      p.neverai_id,
      us.plan,
      (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id AND ua.app = 'neverai') as last_active,
      COALESCE(p.trial_start_date, p.created_at::date) as trial_start
    FROM profiles p
    JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
    LEFT JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  ),
  risk_analysis AS (
    SELECT 
      ur.*,
      CASE 
        WHEN (ur.plan IS NULL OR ur.plan = 'free') 
             AND (CURRENT_DATE - ur.trial_start) = v_trial_days - 1 THEN 'trial_expiring'
        WHEN ur.last_active IS NOT NULL 
             AND ur.last_active < CURRENT_DATE - INTERVAL '7 days'
             AND ur.last_active >= CURRENT_DATE - INTERVAL '14 days' THEN 'becoming_inactive'
        WHEN ur.last_active IS NOT NULL 
             AND ur.last_active < CURRENT_DATE - INTERVAL '14 days'
             AND ur.last_active >= CURRENT_DATE - INTERVAL '30 days' THEN 'at_risk'
        ELSE NULL
      END as risk_type,
      EXTRACT(DAY FROM (now() - ur.last_active))::integer as days_since_active,
      CASE 
        WHEN ur.plan IS NULL OR ur.plan = 'free' 
        THEN v_trial_days - (CURRENT_DATE - ur.trial_start)::integer
        ELSE NULL
      END as trial_days_remaining
    FROM user_risk ur
  )
  SELECT 
    ra.user_id,
    ra.display_name,
    ra.email,
    ra.neverai_id,
    ra.risk_type,
    ra.days_since_active,
    ra.trial_days_remaining,
    COALESCE(ra.plan, 'free') as plan
  FROM risk_analysis ra
  WHERE ra.risk_type IS NOT NULL
  ORDER BY 
    CASE ra.risk_type 
      WHEN 'trial_expiring' THEN 1 
      WHEN 'becoming_inactive' THEN 2 
      WHEN 'at_risk' THEN 3 
    END,
    ra.days_since_active DESC
  LIMIT p_limit;
END;
$function$;

-- 6. Update admin_get_trial_analytics to filter by Nevorai
CREATE OR REPLACE FUNCTION public.admin_get_trial_analytics()
 RETURNS TABLE(active_trials bigint, expired_trials bigint, converted_to_pro bigint, trial_conversion_rate numeric, avg_days_to_convert numeric, trials_expiring_today bigint, day_1_users bigint, day_2_users bigint, day_3_users bigint, day_4_users bigint, day_5_users bigint, day_6_users bigint, day_7_users bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_days integer;
BEGIN
  SELECT COALESCE(config_value::integer, 7) INTO v_trial_days
  FROM admin_usage_limits
  WHERE config_key = 'free_trial_days' AND is_enabled = true;
  
  IF v_trial_days IS NULL THEN
    v_trial_days := 7;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH trial_data AS (
    SELECT 
      p.user_id,
      p.created_at as signup_date,
      COALESCE(p.trial_start_date, p.created_at::date) as trial_start,
      us.plan,
      us.subscribed_at,
      EXTRACT(EPOCH FROM (COALESCE(us.subscribed_at, now()) - COALESCE(p.trial_start_date, p.created_at))) / 86400 as days_to_convert,
      EXTRACT(EPOCH FROM (now() - COALESCE(p.trial_start_date, p.created_at))) / 86400 as days_since_signup
    FROM profiles p
    JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
    LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  ),
  totals AS (
    SELECT
      COUNT(CASE WHEN days_since_signup <= v_trial_days AND (plan IS NULL OR plan = 'free') THEN 1 END) as active_trials,
      COUNT(CASE WHEN days_since_signup > v_trial_days AND (plan IS NULL OR plan = 'free') THEN 1 END) as expired_trials,
      COUNT(CASE WHEN plan IN ('pro', 'mini') THEN 1 END) as converted_to_pro,
      COUNT(CASE WHEN days_since_signup <= v_trial_days AND (plan IS NULL OR plan = 'free') 
                      AND DATE(trial_start + (v_trial_days || ' days')::interval) = CURRENT_DATE THEN 1 END) as trials_expiring_today,
      AVG(CASE WHEN plan IN ('pro', 'mini') AND days_to_convert > 0 THEN days_to_convert END) as avg_days,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE THEN 1 END) as day_1,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as day_2,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '2 days' THEN 1 END) as day_3,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '3 days' THEN 1 END) as day_4,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '4 days' THEN 1 END) as day_5,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '5 days' THEN 1 END) as day_6,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '6 days' THEN 1 END) as day_7
    FROM trial_data
  )
  SELECT
    t.active_trials,
    t.expired_trials,
    t.converted_to_pro,
    CASE WHEN (t.active_trials + t.expired_trials + t.converted_to_pro) > 0 
      THEN ROUND((t.converted_to_pro::numeric / (t.active_trials + t.expired_trials + t.converted_to_pro) * 100), 2)
      ELSE 0 
    END as trial_conversion_rate,
    COALESCE(ROUND(t.avg_days, 1), 0) as avg_days_to_convert,
    t.trials_expiring_today,
    t.day_1,
    t.day_2,
    t.day_3,
    t.day_4,
    t.day_5,
    t.day_6,
    t.day_7
  FROM totals t;
END;
$function$;
