-- ═══════════════════════════════════════════════════════════════
-- CREATE total_snapshot_v2 TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.total_snapshot_v2 (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  upline_leader_id uuid,
  date date NOT NULL,
  total_leads integer NOT NULL DEFAULT 0,
  total_responses integer NOT NULL DEFAULT 0,
  response_tags jsonb NOT NULL DEFAULT '{}',
  stage_tags jsonb NOT NULL DEFAULT '{}',
  funnel_tag_count integer NOT NULL DEFAULT 0,
  final_tag_count integer NOT NULL DEFAULT 0,
  funnel_tag text,
  final_tag text,
  funnel_start_date date,
  funnel_day integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.total_snapshot_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own total snapshots"
  ON public.total_snapshot_v2 FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own total snapshots"
  ON public.total_snapshot_v2 FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own or downline total snapshots"
  ON public.total_snapshot_v2 FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = upline_leader_id
  );

-- Performance indexes
CREATE INDEX idx_total_snapshot_v2_user_date 
  ON public.total_snapshot_v2(user_id, date);

CREATE INDEX idx_total_snapshot_v2_upline 
  ON public.total_snapshot_v2(upline_leader_id);

-- ═══════════════════════════════════════════════════════════════
-- CREATE tracking_source_preferences TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tracking_source_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  personal_source text NOT NULL DEFAULT 'MANUAL',
  team_source text NOT NULL DEFAULT 'MANUAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_source_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage their own preferences"
  ON public.tracking_source_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance index
CREATE INDEX idx_tracking_prefs_user 
  ON public.tracking_source_preferences(user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS FOR updated_at
-- ═══════════════════════════════════════════════════════════════
CREATE TRIGGER update_total_snapshot_v2_updated_at 
  BEFORE UPDATE ON public.total_snapshot_v2 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracking_prefs_updated_at 
  BEFORE UPDATE ON public.tracking_source_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();