
-- STEP 1: Add billing_type and razorpay_plan_id to admin_subscription_plans
ALTER TABLE public.admin_subscription_plans
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS razorpay_plan_id text NULL;

ALTER TABLE public.admin_subscription_plans
  ADD CONSTRAINT admin_subscription_plans_billing_type_check
  CHECK (billing_type IN ('one_time', 'recurring'));

-- STEP 2: Add razorpay_subscription_id to user_subscriptions
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text NULL;

-- STEP 3: Add razorpay_subscription_id to user_funnel_subscriptions
ALTER TABLE public.user_funnel_subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text NULL;
