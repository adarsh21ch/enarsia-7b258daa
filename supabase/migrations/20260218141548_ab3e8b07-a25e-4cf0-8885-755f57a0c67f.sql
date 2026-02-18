
-- ==============================================
-- Phase 1: Safe 3-Tier Subscription Migration
-- Additive only. No columns removed. No enums renamed.
-- ==============================================

-- 1. Add 'premium' to user_plan enum
ALTER TYPE user_plan ADD VALUE IF NOT EXISTS 'premium';

-- 2. Add 'tier' column to user_subscriptions
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'
    CHECK (tier IN ('basic','pro','premium'));

-- Backfill: active pro users get tier='pro', rest get 'basic'
UPDATE public.user_subscriptions
SET tier = CASE
  WHEN plan = 'pro' AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
    THEN 'pro'
  ELSE 'basic'
END
WHERE tier IS NULL OR tier = 'basic';

-- 3. Add 'tier' column to user_funnel_subscriptions
ALTER TABLE public.user_funnel_subscriptions
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'
    CHECK (tier IN ('basic','pro','premium'));

UPDATE public.user_funnel_subscriptions
SET tier = CASE
  WHEN plan = 'pro' AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
    THEN 'pro'
  ELSE 'basic'
END
WHERE tier IS NULL OR tier = 'basic';

-- 4. Add 'tier' column to admin_subscription_plans
ALTER TABLE public.admin_subscription_plans
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'pro'
    CHECK (tier IN ('basic','pro','premium'));

-- 5. Add required_tier and module to admin_feature_flags
ALTER TABLE public.admin_feature_flags
  ADD COLUMN IF NOT EXISTS required_tier TEXT NOT NULL DEFAULT 'basic'
    CHECK (required_tier IN ('basic','pro','premium'));

ALTER TABLE public.admin_feature_flags
  ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'application'
    CHECK (module IN ('application','trackup','funnels'));

-- Backfill required_tier based on existing free_access
UPDATE public.admin_feature_flags
SET required_tier = CASE
  WHEN free_access = true THEN 'basic'
  ELSE 'pro'
END;

-- 6. Add tier columns to admin_usage_limits
ALTER TABLE public.admin_usage_limits
  ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'application';

ALTER TABLE public.admin_usage_limits
  ADD COLUMN IF NOT EXISTS basic_value INTEGER;

ALTER TABLE public.admin_usage_limits
  ADD COLUMN IF NOT EXISTS pro_value INTEGER;

ALTER TABLE public.admin_usage_limits
  ADD COLUMN IF NOT EXISTS premium_value INTEGER;

-- Backfill: copy config_value to basic_value
UPDATE public.admin_usage_limits
SET basic_value = config_value
WHERE basic_value IS NULL;

-- 7. Update get_app_config RPC to return new fields
CREATE OR REPLACE FUNCTION public.get_app_config()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          'billing_type', billing_type,
          'razorpay_plan_id', razorpay_plan_id,
          'tier', tier,
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
    ), '{}'::jsonb),
    'limits_enabled', COALESCE((
      SELECT jsonb_object_agg(config_key, COALESCE(is_enabled, true))
      FROM admin_usage_limits
    ), '{}'::jsonb),
    'limits_tiered', COALESCE((
      SELECT jsonb_object_agg(
        config_key,
        jsonb_build_object(
          'module', module,
          'basic_value', basic_value,
          'pro_value', pro_value,
          'premium_value', premium_value,
          'is_enabled', COALESCE(is_enabled, true),
          'description', description
        )
      )
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
          'category', COALESCE(category, 'general'),
          'required_tier', required_tier,
          'module', module
        )
      )
      FROM admin_feature_flags
    ), '{}'::jsonb)
  );
END;
$function$;
