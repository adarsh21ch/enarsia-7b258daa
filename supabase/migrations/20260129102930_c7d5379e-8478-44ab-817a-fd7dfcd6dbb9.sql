-- =============================================
-- Phase 1: Add Free Trial Configuration to admin_usage_limits
-- =============================================

-- Insert free_trial_days configuration (disabled by default)
INSERT INTO admin_usage_limits (config_key, config_value, description, is_enabled)
VALUES ('free_trial_days', 7, 'Number of free trial days for new users', false)
ON CONFLICT (config_key) DO NOTHING;

-- Insert trial_only_mode configuration (disabled by default)
INSERT INTO admin_usage_limits (config_key, config_value, description, is_enabled)
VALUES ('trial_only_mode', 0, 'When enabled, disable lead limits during active trial period', false)
ON CONFLICT (config_key) DO NOTHING;

-- =============================================
-- Phase 2: Update check_upload_limit function with trial logic
-- =============================================

CREATE OR REPLACE FUNCTION public.check_upload_limit(p_user_id uuid, p_count integer)
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
  -- Trial-related variables
  v_trial_enabled boolean;
  v_trial_days integer;
  v_trial_only_mode boolean;
  v_user_created_at timestamptz;
  v_trial_end_date timestamptz;
  v_is_trial_active boolean;
  v_trial_days_remaining integer;
BEGIN
  -- Check if user is pro
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = p_user_id AND plan = 'pro' AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_pro;
  
  -- Check user overrides
  SELECT force_pro_access, custom_daily_limit, custom_total_limit
  INTO v_force_pro, v_custom_daily, v_custom_total
  FROM admin_user_overrides
  WHERE user_id = p_user_id;
  
  -- If forced pro, treat as pro
  IF COALESCE(v_force_pro, false) THEN
    v_is_pro := true;
  END IF;
  
  -- Get trial settings
  SELECT is_enabled, config_value INTO v_trial_enabled, v_trial_days
  FROM admin_usage_limits WHERE config_key = 'free_trial_days';
  
  SELECT is_enabled INTO v_trial_only_mode
  FROM admin_usage_limits WHERE config_key = 'trial_only_mode';
  
  -- Default trial values if not set
  v_trial_enabled := COALESCE(v_trial_enabled, false);
  v_trial_days := COALESCE(v_trial_days, 7);
  v_trial_only_mode := COALESCE(v_trial_only_mode, false);
  
  -- Get user signup date
  SELECT created_at INTO v_user_created_at
  FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate if trial is active (only for non-pro users)
  IF NOT v_is_pro AND v_trial_enabled AND v_user_created_at IS NOT NULL THEN
    v_trial_end_date := v_user_created_at + (v_trial_days || ' days')::interval;
    v_is_trial_active := now() < v_trial_end_date;
    v_trial_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_trial_end_date - now())::integer);
  ELSE
    v_is_trial_active := false;
    v_trial_days_remaining := 0;
  END IF;
  
  -- If trial is active and trial-only mode is enabled: allow unlimited
  IF v_is_trial_active AND v_trial_only_mode THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'free_trial',
      'trial_days_remaining', v_trial_days_remaining
    );
  END IF;
  
  -- If trial is expired and trial-only mode is enabled: block
  IF v_trial_enabled AND v_trial_only_mode AND NOT v_is_trial_active AND NOT v_is_pro THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Your free trial has ended. Upgrade to Pro to continue.',
      'limit_type', 'trial_expired',
      'trial_days_remaining', 0
    );
  END IF;
  
  -- Get base limits from admin_usage_limits
  SELECT config_value INTO v_base_daily
  FROM admin_usage_limits WHERE config_key = 'free_daily_upload' AND is_enabled = true;
  
  SELECT config_value INTO v_base_total
  FROM admin_usage_limits WHERE config_key = 'free_total_leads' AND is_enabled = true;
  
  SELECT config_value INTO v_pro_daily
  FROM admin_usage_limits WHERE config_key = 'pro_daily_upload' AND is_enabled = true;
  
  SELECT config_value INTO v_daily_after_cap
  FROM admin_usage_limits WHERE config_key = 'free_daily_after_cap' AND is_enabled = true;
  
  -- Default values
  v_base_daily := COALESCE(v_base_daily, 50);
  v_base_total := COALESCE(v_base_total, 200);
  v_pro_daily := COALESCE(v_pro_daily, 500);
  v_daily_after_cap := COALESCE(v_daily_after_cap, 0);
  
  -- Determine effective limits
  IF v_is_pro THEN
    v_effective_daily := COALESCE(v_custom_daily, v_pro_daily);
    v_effective_total := NULL; -- No total limit for pro
  ELSE
    v_effective_daily := COALESCE(v_custom_daily, v_base_daily);
    v_effective_total := COALESCE(v_custom_total, v_base_total);
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
    IF v_effective_daily > 0 AND (v_today_count + p_count) > v_effective_daily THEN
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
      'limit_value', v_effective_daily
    );
  END IF;
  
  -- Free users: check total limit first
  IF v_effective_total > 0 AND v_total_leads >= v_effective_total THEN
    -- At or over total cap - apply after-cap daily limit
    IF v_daily_after_cap = 0 THEN
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
    -- Under total cap - apply normal daily limit
    IF v_effective_daily > 0 AND (v_today_count + p_count) > v_effective_daily THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', format('Daily upload limit of %s reached', v_effective_daily),
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
$$;