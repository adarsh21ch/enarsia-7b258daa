CREATE POLICY "Allow tracking select"
  ON public.funnel_video_sessions
  FOR SELECT
  USING (true);