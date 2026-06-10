
-- 1. Remove broad public read on admin_subscription_plans (exposed razorpay IDs)
DROP POLICY IF EXISTS "Anyone can read subscription plans" ON public.admin_subscription_plans;

-- 2. Update get_app_config to stop returning razorpay_plan_id to clients
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
          'display_name', display_name,
          'description', description,
          'price_inr', price_inr,
          'duration_days', duration_days,
          'payment_link', payment_link,
          'billing_type', billing_type,
          'tier', tier,
          'features', features,
          'is_active', is_active,
          'is_default', is_default,
          'sort_order', sort_order,
          'badge_text', badge_text,
          'monthly_price_inr', monthly_price_inr,
          'yearly_price_inr', yearly_price_inr,
          'first_month_price_inr', first_month_price_inr,
          'renewal_price_inr', renewal_price_inr,
          'trial_days', trial_days,
          'billing_cycle', billing_cycle,
          'offer_badge_text', offer_badge_text,
          'is_popular', is_popular,
          'is_free', is_free,
          'cancel_anytime', cancel_anytime,
          'highlight_savings_text', highlight_savings_text
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
          'free_access', free_access,
          'pro_access', pro_access,
          'trial_access', trial_access,
          'is_enabled', is_enabled,
          'free_limit', free_limit,
          'pro_limit', pro_limit,
          'trial_limit', trial_limit,
          'category', category,
          'required_tier', required_tier,
          'module', module
        )
      )
      FROM admin_feature_flags
    ), '{}'::jsonb)
  );
END;
$function$;

-- 3. Demo leads: remove blanket authenticated SELECT; admin policy still grants full access
DROP POLICY IF EXISTS "Authenticated read demo master" ON public.demo_leads_master;
