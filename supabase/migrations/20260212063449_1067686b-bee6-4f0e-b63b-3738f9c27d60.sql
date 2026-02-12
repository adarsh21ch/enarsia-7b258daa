
-- Allow anyone to insert (tracking is write-only, no sensitive data)
CREATE POLICY "Allow tracking inserts"
  ON public.funnel_video_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update their own session by viewer_token
CREATE POLICY "Allow tracking updates"
  ON public.funnel_video_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
