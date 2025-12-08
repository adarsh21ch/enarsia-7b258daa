-- Create payments_log table for webhook audit trail
CREATE TABLE public.payments_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  user_email TEXT,
  razorpay_payment_id TEXT,
  amount INTEGER,
  status TEXT,
  found_user BOOLEAN DEFAULT false,
  user_id UUID,
  action_taken TEXT,
  raw_payload JSONB,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.payments_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view payments log
CREATE POLICY "Admins can view payments_log"
  ON public.payments_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Deny all other operations for regular users
CREATE POLICY "Deny insert for regular users"
  ON public.payments_log FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny update for regular users"
  ON public.payments_log FOR UPDATE
  USING (false);

CREATE POLICY "Deny delete for regular users"
  ON public.payments_log FOR DELETE
  USING (false);