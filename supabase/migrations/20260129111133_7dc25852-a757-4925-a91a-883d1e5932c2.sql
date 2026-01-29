-- Update all free users (not pro) to start their trial from today
-- Free users are those without an active subscription (status = 'active')
UPDATE public.profiles p
SET trial_start_date = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions us 
  WHERE us.user_id = p.user_id 
  AND us.status = 'active'
  AND (us.expires_at IS NULL OR us.expires_at > NOW())
);

-- Create a table for storing complex admin config that needs text values
CREATE TABLE IF NOT EXISTS public.admin_config_text (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_config_text ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage, everyone to read
CREATE POLICY "Anyone can read admin_config_text"
ON public.admin_config_text FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify admin_config_text"
ON public.admin_config_text FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default trial banner tabs config
INSERT INTO public.admin_config_text (config_key, config_value, description)
VALUES ('trial_banner_tabs', 'dashboard,profile,listup', 'Comma-separated list of tabs that show the trial banner')
ON CONFLICT (config_key) DO NOTHING;