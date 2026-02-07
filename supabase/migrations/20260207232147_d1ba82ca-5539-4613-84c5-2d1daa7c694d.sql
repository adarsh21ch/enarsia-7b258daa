ALTER TABLE public.total_snapshot_v2
  ADD COLUMN source team_snapshot_source NOT NULL DEFAULT 'MANUAL';