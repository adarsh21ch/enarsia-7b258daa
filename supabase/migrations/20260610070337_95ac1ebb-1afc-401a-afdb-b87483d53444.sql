
-- Funnel video sessions: remove header-based viewer access; restrict to funnel owner only
DROP POLICY IF EXISTS "Allow tracking updates for own session" ON public.funnel_video_sessions;
DROP POLICY IF EXISTS "Viewers can read own session" ON public.funnel_video_sessions;

CREATE POLICY "Funnel owners can update sessions"
  ON public.funnel_video_sessions
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM funnels f
    WHERE f.id = funnel_video_sessions.funnel_id
      AND f.owner_user_id = auth.uid()
  ));

-- Realtime: scope broadcast/presence channels to the signed-in user's own topics
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime" ON realtime.messages;

CREATE POLICY "Users can receive on own channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('private:' || auth.uid()::text || '%')
  );

CREATE POLICY "Users can send on own channels"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    OR realtime.topic() LIKE ('private:' || auth.uid()::text || '%')
  );
