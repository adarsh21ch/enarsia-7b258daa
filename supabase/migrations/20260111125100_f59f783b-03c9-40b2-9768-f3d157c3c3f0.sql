-- Create daily_tracking_logs table for daily tracking log foundation
CREATE TABLE public.daily_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  leads_count INTEGER DEFAULT 0,
  responses_count INTEGER DEFAULT 0,
  no_contact_count INTEGER DEFAULT 0,
  video_sent_count INTEGER DEFAULT 0,
  enrolled_count INTEGER DEFAULT 0,
  response_tags JSONB DEFAULT '{}'::jsonb,
  stage_tags JSONB DEFAULT '{}'::jsonb,
  final_tag TEXT,
  final_stage_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_log_date UNIQUE (user_id, log_date)
);

-- Create index for faster lookups by user and date
CREATE INDEX idx_daily_tracking_logs_user_date ON public.daily_tracking_logs (user_id, log_date DESC);

-- Enable RLS
ALTER TABLE public.daily_tracking_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own logs
CREATE POLICY "Users can view own tracking logs"
ON public.daily_tracking_logs
FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Users can only insert their own logs
CREATE POLICY "Users can insert own tracking logs"
ON public.daily_tracking_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS: Users can only update their own logs
CREATE POLICY "Users can update own tracking logs"
ON public.daily_tracking_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS: Users can delete their own logs (for edge cases)
CREATE POLICY "Users can delete own tracking logs"
ON public.daily_tracking_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_daily_tracking_logs_updated_at
BEFORE UPDATE ON public.daily_tracking_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();