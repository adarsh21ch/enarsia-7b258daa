-- C) Create user_app_access table for tracking app-specific user access
-- This allows NeverAI and Achievers Club to have separate user counts
CREATE TABLE IF NOT EXISTS public.user_app_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  app TEXT NOT NULL CHECK (app IN ('neverai', 'achievers_club')),
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, app)
);

-- Enable RLS
ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

-- Users can upsert their own access record
CREATE POLICY "Users can upsert their own app access"
ON public.user_app_access
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can read all records for analytics
CREATE POLICY "Admins can read all app access records"
ON public.user_app_access
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for fast lookups
CREATE INDEX idx_user_app_access_app ON public.user_app_access(app);
CREATE INDEX idx_user_app_access_user ON public.user_app_access(user_id);

-- J) Add numeric leader code for simplified NVR###### format
-- Add column for the numeric sequence
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_code_seq INTEGER;

-- Create a sequence for generating unique leader codes
CREATE SEQUENCE IF NOT EXISTS leader_code_sequence START WITH 1;

-- Function to generate simplified NVR ID (NVR + 6 digits, no dash)
CREATE OR REPLACE FUNCTION public.generate_simple_neverai_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  -- Get next sequence value
  v_seq := nextval('leader_code_sequence');
  -- Return NVR + zero-padded 6 digits (supports up to 999,999 users)
  RETURN 'NVR' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- Update existing profiles to have a leader_code_seq based on their existing neverai_id
-- This preserves backward compatibility - old IDs still work, but we show new format in UI
UPDATE public.profiles
SET leader_code_seq = COALESCE(
  -- Try to extract number from existing ID if it's already numeric-based
  NULLIF(REGEXP_REPLACE(neverai_id, '[^0-9]', '', 'g'), '')::INTEGER,
  -- Otherwise assign new sequence number
  nextval('leader_code_sequence')
)
WHERE leader_code_seq IS NULL AND neverai_id IS NOT NULL;

-- Set sequence to max value + 1 to avoid collisions
SELECT setval('leader_code_sequence', COALESCE((SELECT MAX(leader_code_seq) FROM profiles), 0) + 1);

-- Create function to get app-specific user counts for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_get_app_user_counts()
RETURNS TABLE(app TEXT, total_users BIGINT, today_active BIGINT, week_active BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    ua.app,
    COUNT(DISTINCT ua.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN ua.last_seen_at >= CURRENT_DATE THEN ua.user_id END) as today_active,
    COUNT(DISTINCT CASE WHEN ua.last_seen_at >= CURRENT_DATE - INTERVAL '7 days' THEN ua.user_id END) as week_active
  FROM public.user_app_access ua
  GROUP BY ua.app;
END;
$$;

-- Function to record app access (called on app load)
CREATE OR REPLACE FUNCTION public.record_app_access(p_app TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_app_access (user_id, app, first_seen_at, last_seen_at)
  VALUES (auth.uid(), p_app, now(), now())
  ON CONFLICT (user_id, app)
  DO UPDATE SET last_seen_at = now();
END;
$$;