-- Create coupon_usages table to track usage
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_code TEXT NOT NULL,
  user_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_coupon_usages_code ON public.coupon_usages(coupon_code);
CREATE UNIQUE INDEX idx_coupon_usages_unique ON public.coupon_usages(coupon_code, user_id);

-- Enable RLS
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can insert/read
CREATE POLICY "Service role can manage coupon_usages"
ON public.coupon_usages
FOR ALL
USING (false)
WITH CHECK (false);