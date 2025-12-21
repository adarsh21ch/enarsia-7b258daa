-- Create tracking_overrides table for leaders to override tracking values
CREATE TABLE IF NOT EXISTS public.tracking_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  override_date DATE NOT NULL,
  leads_count INTEGER,
  responses_count INTEGER,
  response_values JSONB DEFAULT '{}',
  stage_values JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_user_id, override_date)
);

-- Enable Row Level Security
ALTER TABLE public.tracking_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own overrides
CREATE POLICY "Users can manage their own overrides" 
ON public.tracking_overrides
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tracking_overrides_updated_at
BEFORE UPDATE ON public.tracking_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();