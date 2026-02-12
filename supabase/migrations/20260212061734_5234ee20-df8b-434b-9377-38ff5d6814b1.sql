
-- 1. Create table
CREATE TABLE IF NOT EXISTS public.funnel_video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL,
  lead_id uuid DEFAULT NULL,
  viewer_token text NOT NULL,
  max_watched_seconds integer NOT NULL DEFAULT 0,
  total_watch_seconds integer NOT NULL DEFAULT 0,
  last_position_seconds integer NOT NULL DEFAULT 0,
  video_duration_seconds integer NOT NULL DEFAULT 0,
  watch_percent numeric(5,2) NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  is_currently_watching boolean NOT NULL DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_fvs_funnel_viewer
  ON public.funnel_video_sessions (funnel_id, viewer_token);

-- 3. Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_fvs_funnel_id
  ON public.funnel_video_sessions (funnel_id);

-- 4. Index for "active now" queries
CREATE INDEX IF NOT EXISTS idx_fvs_last_active
  ON public.funnel_video_sessions (last_active_at);

-- 5. Index for lead lookup
CREATE INDEX IF NOT EXISTS idx_fvs_lead_id
  ON public.funnel_video_sessions (lead_id);

-- 6. Enable RLS
ALTER TABLE public.funnel_video_sessions ENABLE ROW LEVEL SECURITY;

-- 7. RLS: Funnel owners can read their funnel's sessions
CREATE POLICY "Funnel owners can view sessions"
  ON public.funnel_video_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.funnels f
      WHERE f.id = funnel_video_sessions.funnel_id
        AND f.owner_user_id = auth.uid()
    )
  );

-- 8. No public INSERT/UPDATE/DELETE — all writes go through edge function with service role key

-- 9. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_fvs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_funnel_video_sessions_updated_at
  BEFORE UPDATE ON public.funnel_video_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fvs_updated_at();
