
DROP POLICY IF EXISTS "Users can insert own personal snapshots" ON public.personal_snapshot_v2;
DROP POLICY IF EXISTS "Users can update own personal snapshots" ON public.personal_snapshot_v2;

CREATE POLICY "Users can insert own personal snapshots"
  ON public.personal_snapshot_v2
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal snapshots"
  ON public.personal_snapshot_v2
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
