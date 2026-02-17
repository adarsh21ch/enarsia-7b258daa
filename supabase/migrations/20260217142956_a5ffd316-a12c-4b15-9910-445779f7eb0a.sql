
-- 1. video_plays (append-only event log)
CREATE TABLE IF NOT EXISTS public.video_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_asset_id UUID,
  funnel_id UUID,
  user_id UUID,
  session_id TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device TEXT,
  country TEXT,
  duration_watched_seconds INTEGER NOT NULL DEFAULT 0,
  video_duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vp_video_asset ON public.video_plays (video_asset_id);
CREATE INDEX IF NOT EXISTS idx_vp_funnel ON public.video_plays (funnel_id);
CREATE INDEX IF NOT EXISTS idx_vp_played_at ON public.video_plays (played_at);
CREATE INDEX IF NOT EXISTS idx_vp_session ON public.video_plays (session_id);

ALTER TABLE public.video_plays ENABLE ROW LEVEL SECURITY;

-- 2. video_stats_daily (pre-aggregated for fast dashboard queries)
CREATE TABLE IF NOT EXISTS public.video_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_asset_id UUID NOT NULL,
  funnel_id UUID,
  date DATE NOT NULL,
  plays INTEGER NOT NULL DEFAULT 0,
  uniques INTEGER NOT NULL DEFAULT 0,
  total_watch_seconds BIGINT NOT NULL DEFAULT 0,
  completions INTEGER NOT NULL DEFAULT 0,
  creator_user_id UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vsd_unique
  ON public.video_stats_daily (video_asset_id, COALESCE(funnel_id, '00000000-0000-0000-0000-000000000000'::uuid), date);

CREATE INDEX IF NOT EXISTS idx_vsd_date ON public.video_stats_daily (date);
CREATE INDEX IF NOT EXISTS idx_vsd_creator ON public.video_stats_daily (creator_user_id);

ALTER TABLE public.video_stats_daily ENABLE ROW LEVEL SECURITY;

-- 3. Aggregator function
CREATE OR REPLACE FUNCTION public.aggregate_video_stats()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO video_stats_daily (video_asset_id, funnel_id, date, plays, uniques, total_watch_seconds, completions, creator_user_id)
  SELECT 
    vp.video_asset_id,
    vp.funnel_id,
    vp.played_at::date AS date,
    COUNT(*) AS plays,
    COUNT(DISTINCT vp.session_id) AS uniques,
    COALESCE(SUM(vp.duration_watched_seconds), 0) AS total_watch_seconds,
    SUM(CASE WHEN vp.is_completed THEN 1 ELSE 0 END) AS completions,
    va.owner_user_id AS creator_user_id
  FROM video_plays vp
  LEFT JOIN video_assets va ON va.id = vp.video_asset_id
  WHERE vp.played_at::date <= CURRENT_DATE
  GROUP BY vp.video_asset_id, vp.funnel_id, vp.played_at::date, va.owner_user_id
  ON CONFLICT (video_asset_id, COALESCE(funnel_id, '00000000-0000-0000-0000-000000000000'::uuid), date)
  DO UPDATE SET 
    plays = EXCLUDED.plays, 
    uniques = EXCLUDED.uniques,
    total_watch_seconds = EXCLUDED.total_watch_seconds, 
    completions = EXCLUDED.completions,
    creator_user_id = EXCLUDED.creator_user_id;
END;
$$;
