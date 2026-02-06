
ALTER TABLE public.total_snapshot_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own total snapshots" ON public.total_snapshot_v2;
DROP POLICY IF EXISTS "Users can update own total snapshots" ON public.total_snapshot_v2;
DROP POLICY IF EXISTS "Users can read own total snapshots" ON public.total_snapshot_v2;
DROP POLICY IF EXISTS "Upline can read downline total snapshots" ON public.total_snapshot_v2;

CREATE POLICY "Users can insert own total snapshots"
  ON public.total_snapshot_v2
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own total snapshots"
  ON public.total_snapshot_v2
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own total snapshots"
  ON public.total_snapshot_v2
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Upline can read downline total snapshots"
  ON public.total_snapshot_v2
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = upline_leader_id
  );
