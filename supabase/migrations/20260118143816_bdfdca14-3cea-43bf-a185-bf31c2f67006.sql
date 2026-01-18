
-- Drop and recreate admin_get_pro_users function without 'mini' reference
CREATE OR REPLACE FUNCTION public.admin_get_pro_users()
 RETURNS TABLE(user_id uuid, display_name text, email text, neverai_id text, plan text, subscribed_at timestamp with time zone, expires_at timestamp with time zone, is_admin_override boolean, is_expired boolean, days_remaining integer, payment_amount bigint)
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
    us.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    us.plan::text,
    us.subscribed_at,
    us.expires_at,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    (us.expires_at IS NOT NULL AND us.expires_at < NOW()) as is_expired,
    CASE 
      WHEN us.expires_at IS NULL THEN NULL
      WHEN us.expires_at < NOW() THEN 0
      ELSE EXTRACT(DAY FROM us.expires_at - NOW())::integer
    END as days_remaining,
    (SELECT pl.amount FROM payments_log pl WHERE pl.user_id = us.user_id AND pl.status = 'success' ORDER BY pl.created_at DESC LIMIT 1) as payment_amount
  FROM user_subscriptions us
  JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN auth.users au ON au.id = us.user_id
  WHERE us.plan = 'pro'
  ORDER BY us.subscribed_at DESC NULLS LAST;
END;
$function$;

-- Drop and recreate admin_get_free_users with NO LIMIT (pagination to be handled client-side for now)
CREATE OR REPLACE FUNCTION public.admin_get_free_users()
 RETURNS TABLE(user_id uuid, display_name text, email text, neverai_id text, leads_count bigint, last_active timestamp with time zone, created_at timestamp with time zone)
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
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id)::bigint as leads_count,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  WHERE us.user_id IS NULL OR us.plan = 'free'
  ORDER BY p.created_at DESC;
END;
$function$;

-- Create paginated version of admin_get_free_users
CREATE OR REPLACE FUNCTION public.admin_get_free_users_paginated(
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
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

  -- Get total count of free users
  SELECT COUNT(*) INTO v_total
  FROM profiles p
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
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  WHERE us.user_id IS NULL OR us.plan = 'free'
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$function$;

-- Update admin_search_users to search ALL users without limit, with pagination
CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_query text DEFAULT ''::text,
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
 RETURNS TABLE(user_id uuid, email text, display_name text, phone text, plan text, is_admin_override boolean, subscribed_at timestamp with time zone, expires_at timestamp with time zone, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get total matching count
  SELECT COUNT(*) INTO v_total
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
    OR p.neverai_id ILIKE '%' || search_query || '%';

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
    p.created_at,
    v_total as total_count
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
    OR p.neverai_id ILIKE '%' || search_query || '%'
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$function$;

-- Fix admin_get_analytics to use only 'pro' plan (not 'mini')
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
 RETURNS TABLE(neverai_total_users bigint, neverai_today_active bigint, neverai_week_active bigint, active_pro_users bigint, total_leads bigint, today_leads bigint, week_leads bigint, month_leads bigint)
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
    -- NeverAI-specific user counts (from user_app_access)
    (SELECT COUNT(DISTINCT ua.user_id) FROM public.user_app_access ua WHERE ua.app = 'neverai')::bigint as neverai_total_users,
    (SELECT COUNT(DISTINCT ua.user_id) FROM public.user_app_access ua WHERE ua.app = 'neverai' AND ua.last_seen_at::date = CURRENT_DATE)::bigint as neverai_today_active,
    (SELECT COUNT(DISTINCT ua.user_id) FROM public.user_app_access ua WHERE ua.app = 'neverai' AND ua.last_seen_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as neverai_week_active,
    -- Active Pro users (plan = 'pro' only, no 'mini')
    (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan = 'pro')::bigint as active_pro_users,
    -- Total leads across all users
    (SELECT COUNT(*) FROM public.prospects)::bigint as total_leads,
    -- Today's leads
    (SELECT COUNT(*) FROM public.prospects WHERE date_added::date = CURRENT_DATE)::bigint as today_leads,
    -- Last 7 days leads
    (SELECT COUNT(*) FROM public.prospects WHERE date_added >= CURRENT_DATE - INTERVAL '7 days')::bigint as week_leads,
    -- Last 30 days leads  
    (SELECT COUNT(*) FROM public.prospects WHERE date_added >= CURRENT_DATE - INTERVAL '30 days')::bigint as month_leads;
END;
$function$;

-- Fix admin_get_revenue_stats to not reference 'mini' plan in enum
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
    -- Mini plan (99 INR = 9900 paise)
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 9900 THEN amount ELSE 0 END), 0)::bigint as mini_plan_revenue,
    -- Pro plan (299 INR = 29900 paise)
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 29900 THEN amount ELSE 0 END), 0)::bigint as pro_plan_revenue,
    COUNT(CASE WHEN status = 'success' AND amount = 9900 THEN 1 END)::bigint as mini_plan_count,
    COUNT(CASE WHEN status = 'success' AND amount = 29900 THEN 1 END)::bigint as pro_plan_count
  FROM unique_payments;
END;
$function$;
