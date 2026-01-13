-- Add subscription_source column to track which app the subscription came from
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_source text DEFAULT 'neverai';

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.subscription_source IS 'Source app of subscription: neverai or trackup';