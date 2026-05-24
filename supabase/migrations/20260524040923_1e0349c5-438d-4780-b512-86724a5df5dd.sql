ALTER TABLE public.admin_subscription_plans
  ADD COLUMN IF NOT EXISTS razorpay_offer_id TEXT;

COMMENT ON COLUMN public.admin_subscription_plans.razorpay_offer_id IS
  'Optional Razorpay Offer ID applied to first invoice for intro pricing (e.g. ₹59 first month then ₹149/mo).';