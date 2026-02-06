
-- Create user_daily_activity table
CREATE TABLE public.user_daily_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL,
  has_activity BOOLEAN DEFAULT false,
  activity_sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_daily_activity
  ADD CONSTRAINT user_daily_activity_user_date_unique UNIQUE (user_id, activity_date);

ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily activity"
  ON public.user_daily_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily activity"
  ON public.user_daily_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily activity"
  ON public.user_daily_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Create user_streaks table
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  grace_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin config rows
INSERT INTO public.admin_usage_limits (config_key, config_value, description, is_enabled)
VALUES
  ('streak_enabled', 1, 'Enable/disable streak feature', true),
  ('streak_grace_days', 1, 'Number of grace days before streak reset', true);

INSERT INTO public.admin_config_text (config_key, config_value, description, is_enabled)
VALUES
  ('streak_active_actions', 'manual_add,import,call,tracking_update', 'Comma-separated actions that count for streak', true);
