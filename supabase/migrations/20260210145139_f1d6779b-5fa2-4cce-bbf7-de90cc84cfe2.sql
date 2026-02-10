
-- Part 1: Fix check_upload_limit to respect disabled limits
CREATE OR REPLACE FUNCTION public.check_upload_limit(p_user_id uuid, p_count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_pro boolean;
  v_force_pro boolean;
  v_custom_daily integer;
  v_custom_total integer;
  v_base_daily integer;
  v_base_total integer;
  v_pro_daily integer;
  v_today_count integer;
  v_total_leads bigint;
  v_effective_daily integer;
  v_effective_total integer;
  v_daily_after_cap integer;
  v_trial_enabled boolean;
  v_trial_days integer;
  v_trial_only_mode boolean;
  v_user_created_at timestamptz;
  v_trial_end_date timestamptz;
  v_is_trial_active boolean;
  v_trial_days_remaining integer;
  v_daily_enabled boolean;
  v_total_enabled boolean;
  v_daily_after_cap_enabled boolean;
BEGIN
  -- Check if user is pro from user_subscriptions
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND (
      (plan = 'pro' AND status = 'active' AND (expires_at IS NULL OR expires_at > now()))
      OR (is_admin_override = true AND plan = 'pro')
    )
  ) INTO v_is_pro;
  
  -- Check admin_user_overrides
  SELECT force_pro_access, custom_daily_limit, custom_total_limit
  INTO v_force_pro, v_custom_daily, v_custom_total
  FROM admin_user_overrides
  WHERE user_id = p_user_id;
  
  IF COALESCE(v_force_pro, false) THEN
    v_is_pro := true;
  END IF;
  
  -- Get trial settings
  SELECT is_enabled, config_value INTO v_trial_enabled, v_trial_days
  FROM admin_usage_limits WHERE config_key = 'free_trial_days';
  
  SELECT is_enabled INTO v_trial_only_mode
  FROM admin_usage_limits WHERE config_key = 'trial_only_mode';
  
  v_trial_enabled := COALESCE(v_trial_enabled, false);
  v_trial_days := COALESCE(v_trial_days, 7);
  v_trial_only_mode := COALESCE(v_trial_only_mode, false);
  
  SELECT COALESCE(trial_start_date, created_at) INTO v_user_created_at
  FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate trial status (only for non-pro users)
  IF NOT v_is_pro AND v_trial_enabled AND v_user_created_at IS NOT NULL THEN
    v_trial_end_date := v_user_created_at + (v_trial_days || ' days')::interval;
    v_is_trial_active := now() < v_trial_end_date;
    v_trial_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_trial_end_date - now())::integer);
  ELSE
    v_is_trial_active := false;
    v_trial_days_remaining := 0;
  END IF;
  
  -- Trial active + trial-only mode = allow unlimited
  IF v_is_trial_active AND v_trial_only_mode THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'free_trial',
      'trial_days_remaining', v_trial_days_remaining
    );
  END IF;
  
  -- Trial expired + trial-only mode = block (non-pro only)
  IF v_trial_enabled AND v_trial_only_mode AND NOT v_is_trial_active AND NOT v_is_pro THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Your free trial has ended. Upgrade to Pro to continue.',
      'limit_type', 'trial_expired',
      'trial_days_remaining', 0
    );
  END IF;
  
  -- Get base limits from admin_usage_limits, tracking enabled status
  SELECT config_value, COALESCE(is_enabled, true) INTO v_base_daily, v_daily_enabled
  FROM admin_usage_limits WHERE config_key = 'free_daily_upload';
  
  SELECT config_value, COALESCE(is_enabled, true) INTO v_base_total, v_total_enabled
  FROM admin_usage_limits WHERE config_key = 'free_total_leads';
  
  SELECT config_value INTO v_pro_daily
  FROM admin_usage_limits WHERE config_key = 'pro_daily_upload' AND is_enabled = true;
  
  SELECT config_value, COALESCE(is_enabled, true) INTO v_daily_after_cap, v_daily_after_cap_enabled
  FROM admin_usage_limits WHERE config_key = 'free_daily_after_cap';
  
  -- FIX: If limit is DISABLED, set to NULL (no limit) instead of hardcoded fallback
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
  
  -- Determine effective limits
  IF v_is_pro THEN
    v_effective_daily := COALESCE(v_custom_daily, v_pro_daily);
    v_effective_total := NULL; -- No total limit for pro
  ELSE
    v_effective_daily := COALESCE(v_custom_daily, v_base_daily); -- NULL if disabled
    v_effective_total := COALESCE(v_custom_total, v_base_total); -- NULL if disabled
  END IF;
  
  -- Get today's upload count
  SELECT COALESCE(upload_count, 0) INTO v_today_count
  FROM user_daily_uploads
  WHERE user_id = p_user_id AND upload_date = CURRENT_DATE;
  v_today_count := COALESCE(v_today_count, 0);
  
  -- Get total leads count
  SELECT COUNT(*) INTO v_total_leads
  FROM prospects WHERE user_id = p_user_id;
  
  -- Pro users: only check daily limit
  IF v_is_pro THEN
    IF v_effective_daily IS NOT NULL AND v_effective_daily > 0 AND (v_today_count + p_count) > v_effective_daily THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', format('Daily upload limit of %s reached', v_effective_daily),
        'limit_type', 'pro_daily',
        'today_count', v_today_count,
        'limit_value', v_effective_daily
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'none',
      'today_count', v_today_count,
      'limit_value', COALESCE(v_effective_daily, 0)
    );
  END IF;
  
  -- Free users: check total limit first (only if total limit is enabled/set)
  IF v_effective_total IS NOT NULL AND v_effective_total > 0 AND v_total_leads >= v_effective_total THEN
    IF v_daily_after_cap IS NULL OR v_daily_after_cap = 0 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', format('Total lead limit of %s reached. Upgrade to Pro for unlimited access.', v_effective_total),
        'limit_type', 'total',
        'today_count', v_today_count,
        'limit_value', v_effective_total
      );
    ELSIF (v_today_count + p_count) > v_daily_after_cap THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', format('Daily limit of %s reached (total cap exceeded)', v_daily_after_cap),
        'limit_type', 'daily_after_cap',
        'today_count', v_today_count,
        'limit_value', v_daily_after_cap
      );
    END IF;
  ELSE
    -- Only check daily limit if it's enabled
    IF v_effective_daily IS NOT NULL AND v_effective_daily > 0 AND (v_today_count + p_count) > v_effective_daily THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', format('Daily upload limit of %s reached', v_effective_daily),
        'limit_type', 'daily',
        'today_count', v_today_count,
        'limit_value', v_effective_daily
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', '',
    'limit_type', 'none',
    'today_count', v_today_count,
    'limit_value', COALESCE(v_effective_daily, 0)
  );
END;
$$;

-- Part 2: Fix get_app_config to return limits_enabled map
CREATE OR REPLACE FUNCTION public.get_app_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'plans', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'plan_key', plan_key,
          'plan_name', plan_name,
          'description', description,
          'price_inr', price_inr,
          'duration_days', duration_days,
          'payment_link', payment_link,
          'features', features,
          'is_active', is_active,
          'is_default', is_default,
          'sort_order', sort_order,
          'badge_text', badge_text
        ) ORDER BY sort_order
      )
      FROM admin_subscription_plans
      WHERE is_active = true
    ), '[]'::jsonb),
    'offers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'offer_name', offer_name,
          'discount_type', discount_type,
          'discount_value', discount_value,
          'applicable_plan_ids', applicable_plan_ids,
          'start_date', start_date,
          'end_date', end_date,
          'is_active', is_active,
          'max_uses_per_user', max_uses_per_user,
          'promo_code', promo_code,
          'offer_payment_link', offer_payment_link
        )
      )
      FROM admin_offers
      WHERE is_active = true
        AND start_date <= now()
        AND end_date >= now()
    ), '[]'::jsonb),
    -- Return ALL limits (even disabled ones) with their values
    'limits', COALESCE((
      SELECT jsonb_object_agg(config_key, config_value)
      FROM admin_usage_limits
    ), '{}'::jsonb),
    -- NEW: Return which limits are enabled
    'limits_enabled', COALESCE((
      SELECT jsonb_object_agg(config_key, COALESCE(is_enabled, true))
      FROM admin_usage_limits
    ), '{}'::jsonb),
    'features', COALESCE((
      SELECT jsonb_object_agg(
        feature_key,
        jsonb_build_object(
          'feature_name', feature_name,
          'description', description,
          'free_access', COALESCE(free_access, false),
          'pro_access', COALESCE(pro_access, true),
          'trial_access', COALESCE(trial_access, true),
          'is_enabled', COALESCE(is_enabled, true),
          'free_limit', free_limit,
          'pro_limit', pro_limit,
          'trial_limit', trial_limit,
          'category', COALESCE(category, 'general')
        )
      )
      FROM admin_feature_flags
    ), '{}'::jsonb)
  );
END;
$$;
