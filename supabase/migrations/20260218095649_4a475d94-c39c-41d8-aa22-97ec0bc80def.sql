
-- 1. Create user_funnel_subscriptions table
CREATE TABLE public.user_funnel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  is_admin_override BOOLEAN DEFAULT false,
  subscribed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  payment_id TEXT,
  subscription_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_funnel_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own funnel subscription
CREATE POLICY "Users can read own funnel subscription"
  ON public.user_funnel_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can read all funnel subscriptions
CREATE POLICY "Admins can read all funnel subscriptions"
  ON public.user_funnel_subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update funnel subscriptions
CREATE POLICY "Admins can update funnel subscriptions"
  ON public.user_funnel_subscriptions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert funnel subscriptions
CREATE POLICY "Admins can insert funnel subscriptions"
  ON public.user_funnel_subscriptions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role handles webhook inserts/updates (bypasses RLS)

-- 2. Add funnel feature flags
INSERT INTO public.admin_feature_flags (feature_key, feature_name, description, category, is_enabled, free_access, free_limit, trial_access, trial_limit, pro_access, pro_limit)
VALUES
  ('funnel_create', 'Create Funnels', 'Ability to create video funnels', 'funnels', true, true, 2, true, 5, true, null),
  ('funnel_video_upload', 'Funnel Video Upload', 'Upload videos to funnels', 'funnels', true, true, 3, true, 10, true, null),
  ('funnel_advanced_analytics', 'Funnel Advanced Analytics', 'Detailed funnel analytics and insights', 'funnels', true, false, null, false, null, true, null),
  ('funnel_price_options', 'Funnel Price Options', 'Multiple pricing tiers per funnel', 'funnels', true, false, null, false, null, true, null),
  ('funnel_custom_branding', 'Funnel Custom Branding', 'Remove NevorAI branding from funnels', 'funnels', true, false, null, false, null, true, null);

-- 3. Add funnels_pro_monthly plan
INSERT INTO public.admin_subscription_plans (plan_key, plan_name, description, price_inr, duration_days, is_active, is_default, sort_order, features)
VALUES 
  ('funnels_pro_monthly', 'Funnels Pro', 'Unlock all Funnels features', 299, 30, true, false, 10,
    '["Unlimited Funnels", "Unlimited Video Uploads", "Advanced Analytics", "Multiple Price Options", "Custom Branding", "Priority Support"]'::jsonb),
  ('combined_pro_monthly', 'All-in-One Pro', 'App Pro + Funnels Pro combined', 399, 30, true, false, 11,
    '["All App Pro Features", "All Funnels Pro Features", "Best Value Bundle", "Priority Support"]'::jsonb),
  ('combined_pro_yearly', 'All-in-One Pro (Yearly)', 'App Pro + Funnels Pro for a full year', 2999, 365, true, false, 12,
    '["All App Pro Features", "All Funnels Pro Features", "Best Value Bundle", "Priority Support", "Save 40%"]'::jsonb);

-- 4. Auto-update timestamp trigger
CREATE TRIGGER update_funnel_subscriptions_updated_at
  BEFORE UPDATE ON public.user_funnel_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_config_timestamp();
