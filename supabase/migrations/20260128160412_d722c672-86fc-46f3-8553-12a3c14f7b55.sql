-- 1) Daily upload tracking table (no FK to auth schema)
CREATE TABLE IF NOT EXISTS public.user_daily_uploads (
  user_id uuid NOT NULL,
  upload_date date NOT NULL DEFAULT CURRENT_DATE,
  upload_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, upload_date)
);

ALTER TABLE public.user_daily_uploads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_daily_uploads' AND policyname = 'Users can read own daily uploads'
  ) THEN
    CREATE POLICY "Users can read own daily uploads"
    ON public.user_daily_uploads
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Flexible rule-based upload limit check
CREATE OR REPLACE FUNCTION public.check_upload_limit(p_user_id uuid, p_count integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_pro boolean;
  v_total_added integer;
  v_today_count integer;

  v_free_total_threshold integer;

  v_before_enabled boolean;
  v_before_value integer;

  v_after_enabled boolean;
  v_after_value integer;

  v_pro_enabled boolean;
  v_pro_value integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Not authenticated', 'limit_type', 'auth');
  END IF;

  -- Determine Pro status
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.plan = 'pro'
      AND us.status = 'active'
      AND (us.expires_at IS NULL OR us.expires_at > now())
  ) INTO v_is_pro;

  -- Total leads added (lifetime counter)
  SELECT COALESCE(p.total_leads_added, 0)
  INTO v_total_added
  FROM public.profiles p
  WHERE p.user_id = p_user_id;

  v_total_added := COALESCE(v_total_added, 0);

  -- Today's uploaded count
  SELECT COALESCE(u.upload_count, 0)
  INTO v_today_count
  FROM public.user_daily_uploads u
  WHERE u.user_id = p_user_id
    AND u.upload_date = CURRENT_DATE;

  v_today_count := COALESCE(v_today_count, 0);

  -- Base threshold
  SELECT COALESCE(l.config_value, 1000)
  INTO v_free_total_threshold
  FROM public.admin_usage_limits l
  WHERE l.config_key = 'free_total_leads' AND l.is_enabled = true
  LIMIT 1;

  v_free_total_threshold := COALESCE(v_free_total_threshold, 1000);

  -- BEFORE threshold rule (new key preferred)
  SELECT COALESCE(l.is_enabled, false), COALESCE(l.config_value, 0)
  INTO v_before_enabled, v_before_value
  FROM public.admin_usage_limits l
  WHERE l.config_key = 'free_daily_before_total'
  LIMIT 1;

  IF v_before_enabled IS NULL THEN
    v_before_enabled := false;
    v_before_value := 0;
  END IF;

  -- Backward compatibility: if new key missing, use free_daily_upload as BEFORE rule
  IF NOT EXISTS (SELECT 1 FROM public.admin_usage_limits WHERE config_key = 'free_daily_before_total') THEN
    SELECT COALESCE(l.is_enabled, false), COALESCE(l.config_value, 0)
    INTO v_before_enabled, v_before_value
    FROM public.admin_usage_limits l
    WHERE l.config_key = 'free_daily_upload'
    LIMIT 1;
  END IF;

  -- AFTER threshold rule
  SELECT COALESCE(l.is_enabled, false), COALESCE(l.config_value, 0)
  INTO v_after_enabled, v_after_value
  FROM public.admin_usage_limits l
  WHERE l.config_key = 'free_daily_after_total'
  LIMIT 1;

  IF v_after_enabled IS NULL THEN
    v_after_enabled := false;
    v_after_value := 0;
  END IF;

  -- PRO daily rule (when disabled => unlimited)
  SELECT COALESCE(l.is_enabled, false), COALESCE(l.config_value, 0)
  INTO v_pro_enabled, v_pro_value
  FROM public.admin_usage_limits l
  WHERE l.config_key = 'pro_daily_upload'
  LIMIT 1;

  v_pro_enabled := COALESCE(v_pro_enabled, false);
  v_pro_value := COALESCE(v_pro_value, 0);

  -- PRO logic
  IF v_is_pro THEN
    IF v_pro_enabled AND v_pro_value > 0 AND (v_today_count + p_count) > v_pro_value THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Daily Pro upload limit reached',
        'limit_type', 'pro_daily',
        'today_count', v_today_count,
        'limit_value', v_pro_value
      );
    END IF;

    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'pro',
      'today_count', v_today_count
    );
  END IF;

  -- FREE logic: choose rule set based on whether threshold is reached
  IF v_total_added < v_free_total_threshold THEN
    -- CASE A: BEFORE total threshold
    IF v_before_enabled THEN
      IF v_before_value <= 0 THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Daily free upload limit reached',
          'limit_type', 'free_daily_before',
          'today_count', v_today_count,
          'limit_value', v_before_value
        );
      END IF;

      IF (v_today_count + p_count) > v_before_value THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Daily free upload limit reached',
          'limit_type', 'free_daily_before',
          'today_count', v_today_count,
          'limit_value', v_before_value
        );
      END IF;
    END IF;

    -- If disabled => unlimited until threshold
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'free_before',
      'today_count', v_today_count
    );
  ELSE
    -- CASE B: AFTER total threshold
    IF NOT v_after_enabled THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Total free leads limit reached',
        'limit_type', 'free_total',
        'today_count', v_today_count,
        'limit_value', v_after_value
      );
    END IF;

    IF v_after_value <= 0 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Total free leads limit reached',
        'limit_type', 'free_total',
        'today_count', v_today_count,
        'limit_value', v_after_value
      );
    END IF;

    IF (v_today_count + p_count) > v_after_value THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Daily free upload limit reached',
        'limit_type', 'free_daily_after',
        'today_count', v_today_count,
        'limit_value', v_after_value
      );
    END IF;

    RETURN jsonb_build_object(
      'allowed', true,
      'reason', '',
      'limit_type', 'free_after',
      'today_count', v_today_count,
      'limit_value', v_after_value
    );
  END IF;
END;
$$;

-- 3) Increment today's upload count (idempotent for the day)
CREATE OR REPLACE FUNCTION public.increment_daily_upload(p_user_id uuid, p_count integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_count integer;
BEGIN
  IF p_user_id IS NULL OR p_count IS NULL OR p_count <= 0 THEN
    RETURN NULL;
  END IF;

  -- Bypass RLS for this write
  PERFORM set_config('row_security', 'off', true);

  INSERT INTO public.user_daily_uploads (user_id, upload_date, upload_count)
  VALUES (p_user_id, CURRENT_DATE, p_count)
  ON CONFLICT (user_id, upload_date)
  DO UPDATE SET
    upload_count = public.user_daily_uploads.upload_count + EXCLUDED.upload_count,
    updated_at = now()
  RETURNING upload_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- 4) Ensure admin_offers has offer_payment_link and expose it in get_app_config
ALTER TABLE public.admin_offers
  ADD COLUMN IF NOT EXISTS offer_payment_link text;

CREATE OR REPLACE FUNCTION public.get_app_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    'limits', COALESCE((
      SELECT jsonb_object_agg(config_key, config_value)
      FROM admin_usage_limits
      WHERE is_enabled = true
    ), '{}'::jsonb),
    'features', COALESCE((
      SELECT jsonb_object_agg(
        feature_key,
        jsonb_build_object(
          'feature_name', feature_name,
          'description', description,
          'free_access', free_access,
          'pro_access', pro_access,
          'is_enabled', is_enabled
        )
      )
      FROM admin_feature_flags
    ), '{}'::jsonb)
  );
END;
$$;

-- 5) Coupon usage idempotency (store payment_id)
ALTER TABLE public.coupon_usages
  ADD COLUMN IF NOT EXISTS payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS coupon_usages_user_coupon_payment_uidx
  ON public.coupon_usages (user_id, coupon_code, payment_id)
  WHERE payment_id IS NOT NULL;

-- 6) Audit log: RLS + RPCs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_audit_logs' AND policyname = 'Admins can read audit logs'
  ) THEN
    CREATE POLICY "Admins can read audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_audit_logs' AND policyname = 'Admins can insert audit logs'
  ) THEN
    CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_logs
    FOR INSERT
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND admin_user_id = auth.uid()
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type text,
  p_target_type text,
  p_target_id text,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  INSERT INTO public.admin_audit_logs (
    action_type,
    target_type,
    target_id,
    old_value,
    new_value,
    description,
    admin_user_id,
    created_at
  ) VALUES (
    p_action_type,
    p_target_type,
    p_target_id,
    p_old_value,
    p_new_value,
    COALESCE(p_description, ''),
    auth.uid(),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_action_type text DEFAULT NULL,
  p_target_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  admin_user_id uuid,
  admin_email text,
  action_type text,
  target_type text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  description text,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.admin_audit_logs al
  WHERE (p_action_type IS NULL OR al.action_type = p_action_type)
    AND (p_target_type IS NULL OR al.target_type = p_target_type);

  RETURN QUERY
  SELECT
    al.id,
    al.admin_user_id,
    (SELECT au.email FROM auth.users au WHERE au.id = al.admin_user_id) as admin_email,
    al.action_type,
    al.target_type,
    al.target_id,
    al.old_value,
    al.new_value,
    al.description,
    al.created_at,
    v_total as total_count
  FROM public.admin_audit_logs al
  WHERE (p_action_type IS NULL OR al.action_type = p_action_type)
    AND (p_target_type IS NULL OR al.target_type = p_target_type)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;