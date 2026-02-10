
CREATE OR REPLACE FUNCTION public.check_upload_limit(p_user_id uuid, p_count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_pro boolean := false;
  v_is_admin_override boolean := false;
  v_base_daily integer;
  v_base_total integer;
  v_pro_daily integer;
  v_daily_after_cap integer;
  v_override_daily integer;
  v_override_total integer;
  v_effective_daily integer;
  v_effective_total integer;
  v_today_count integer := 0;
  v_total_leads integer := 0;
  v_daily_enabled boolean;
  v_total_enabled boolean;
  v_daily_after_cap_enabled boolean;
BEGIN
  -- Check if user is a Pro subscriber (active subscription or admin override)
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active' 
    AND expires_at > now()
  ) INTO v_is_pro;
  
  -- Check admin override for pro access (permanent, ignores expiry)
  SELECT force_pro_access INTO v_is_admin_override
  FROM admin_user_overrides WHERE user_id = p_user_id;
  
  IF COALESCE(v_is_admin_override, false) THEN
    v_is_pro := true;
  END IF;
  
  -- NOTE: Trial-based blocking is intentionally REMOVED from upload limit checks.
  -- Trial expiry should only affect pro-only features (AI, retargeting, etc.),
  -- NOT core CRM actions like adding/importing leads.
  -- The admin_usage_limits toggles are the ONLY authority for upload limits.
  
  -- Get base limits from admin_usage_limits, tracking enabled status
  SELECT config_value, COALESCE(is_enabled, true) INTO v_base_daily, v_daily_enabled
  FROM admin_usage_limits WHERE config_key = 'free_daily_upload';
  
  SELECT config_value, COALESCE(is_enabled, true) INTO v_base_total, v_total_enabled
  FROM admin_usage_limits WHERE config_key = 'free_total_leads';
  
  SELECT config_value INTO v_pro_daily
  FROM admin_usage_limits WHERE config_key = 'pro_daily_upload' AND is_enabled = true;
  
  SELECT config_value, COALESCE(is_enabled, true) INTO v_daily_after_cap, v_daily_after_cap_enabled
  FROM admin_usage_limits WHERE config_key = 'free_daily_after_cap';
  
  -- If limit is DISABLED, set to NULL (no limit) instead of hardcoded fallback
  IF NOT COALESCE(v_daily_enabled, false) THEN
    v_base_daily := NULL;
  ELSE
    v_base_daily := COALESCE(v_base_daily, 50);
  END IF;
  
  IF NOT COALESCE(v_total_enabled, false) THEN
    v_base_total := NULL;
  ELSE
    v_base_total := COALESCE(v_base_total, 200);
  END IF;
  
  v_pro_daily := COALESCE(v_pro_daily, 500);
  
  IF NOT COALESCE(v_daily_after_cap_enabled, false) THEN
    v_daily_after_cap := NULL;
  ELSE
    v_daily_after_cap := COALESCE(v_daily_after_cap, 0);
  END IF;
  
  -- Check for per-user overrides
  SELECT custom_daily_limit, custom_total_limit
  INTO v_override_daily, v_override_total
  FROM admin_user_overrides WHERE user_id = p_user_id;
  
  -- Determine effective limits based on plan
  IF v_is_pro THEN
    v_effective_daily := COALESCE(v_override_daily, v_pro_daily);
    v_effective_total := NULL; -- Unlimited for pro
  ELSE
    v_effective_daily := COALESCE(v_override_daily, v_base_daily);
    v_effective_total := COALESCE(v_override_total, v_base_total);
  END IF;
  
  -- Get today's upload count
  SELECT COALESCE(upload_count, 0) INTO v_today_count
  FROM user_daily_uploads 
  WHERE user_id = p_user_id AND upload_date = CURRENT_DATE;
  
  -- Get total lifetime leads
  SELECT COALESCE(total_leads_added, 0) INTO v_total_leads
  FROM profiles WHERE user_id = p_user_id;
  
  -- Check total lifetime limit FIRST (only if enabled / not null)
  IF v_effective_total IS NOT NULL THEN
    IF v_total_leads >= v_effective_total THEN
      -- Check if daily-after-cap is enabled and allows some uploads
      IF v_daily_after_cap IS NOT NULL AND v_daily_after_cap > 0 THEN
        IF v_today_count + p_count > v_daily_after_cap THEN
          RETURN jsonb_build_object(
            'allowed', false,
            'reason', format('You have reached your free limit of %s total leads. Daily cap: %s leads/day. Used today: %s.', v_effective_total, v_daily_after_cap, v_today_count),
            'limit_type', 'daily_after_cap',
            'today_count', v_today_count,
            'limit_value', v_daily_after_cap
          );
        ELSE
          RETURN jsonb_build_object(
            'allowed', true,
            'reason', format('Over total limit but within daily cap (%s/%s today)', v_today_count + p_count, v_daily_after_cap),
            'limit_type', 'daily_after_cap_ok',
            'today_count', v_today_count,
            'limit_value', v_daily_after_cap
          );
        END IF;
      ELSE
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', format('You have reached the free limit of %s total leads. Upgrade to Pro for unlimited leads.', v_effective_total),
          'limit_type', 'total',
          'today_count', v_today_count,
          'limit_value', v_effective_total
        );
      END IF;
    END IF;
  END IF;
  
  -- Check daily upload limit (only if enabled / not null)
  IF v_effective_daily IS NOT NULL THEN
    IF v_today_count + p_count > v_effective_daily THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', format('Daily upload limit reached (%s/%s). Try again tomorrow.', v_today_count, v_effective_daily),
        'limit_type', 'daily',
        'today_count', v_today_count,
        'limit_value', v_effective_daily
      );
    END IF;
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', '',
    'limit_type', 'none',
    'today_count', v_today_count,
    'limit_value', COALESCE(v_effective_daily, 0)
  );
END;
$function$;
