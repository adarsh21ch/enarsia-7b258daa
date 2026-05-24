
-- ============ admin_subscription_plans: pricing fields ============
ALTER TABLE public.admin_subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_price_inr integer,
  ADD COLUMN IF NOT EXISTS yearly_price_inr integer,
  ADD COLUMN IF NOT EXISTS first_month_price_inr integer,
  ADD COLUMN IF NOT EXISTS renewal_price_inr integer,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS offer_badge_text text,
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_anytime boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS highlight_savings_text text;

-- backfill billing_cycle and renewal_price from existing data
UPDATE public.admin_subscription_plans
SET billing_cycle = CASE
  WHEN duration_days >= 300 THEN 'yearly'
  WHEN duration_days = 0 THEN 'one_time'
  ELSE 'monthly'
END
WHERE billing_cycle = 'monthly' AND (duration_days >= 300 OR duration_days = 0);

UPDATE public.admin_subscription_plans
SET renewal_price_inr = price_inr
WHERE renewal_price_inr IS NULL;

UPDATE public.admin_subscription_plans
SET monthly_price_inr = price_inr
WHERE monthly_price_inr IS NULL AND billing_cycle = 'monthly';

UPDATE public.admin_subscription_plans
SET yearly_price_inr = price_inr
WHERE yearly_price_inr IS NULL AND billing_cycle = 'yearly';

ALTER TABLE public.admin_subscription_plans
  DROP CONSTRAINT IF EXISTS admin_subscription_plans_billing_cycle_check;
ALTER TABLE public.admin_subscription_plans
  ADD CONSTRAINT admin_subscription_plans_billing_cycle_check
  CHECK (billing_cycle IN ('monthly','yearly','one_time'));

-- ============ user_subscriptions: state model ============
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.admin_subscription_plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS first_payment_amount integer,
  ADD COLUMN IF NOT EXISTS renewal_amount integer,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS payment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (subscription_status IN ('active','trial','expired','canceled','pending','failed','grace_period','free'));

-- ============ user_funnel_subscriptions: state model ============
ALTER TABLE public.user_funnel_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.admin_subscription_plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS first_payment_amount integer,
  ADD COLUMN IF NOT EXISTS renewal_amount integer,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS payment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.user_funnel_subscriptions
  DROP CONSTRAINT IF EXISTS user_funnel_subscriptions_status_check;
ALTER TABLE public.user_funnel_subscriptions
  ADD CONSTRAINT user_funnel_subscriptions_status_check
  CHECK (subscription_status IN ('active','trial','expired','canceled','pending','failed','grace_period','free'));

-- ============ subscription_events log (idempotency) ============
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  user_id uuid,
  razorpay_subscription_id text,
  razorpay_payment_id text,
  amount integer,
  status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON public.subscription_events(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view subscription events"
ON public.subscription_events FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage subscription events" ON public.subscription_events;
CREATE POLICY "Admins can manage subscription events"
ON public.subscription_events FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
