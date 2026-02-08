CREATE POLICY "Users can claim video access"
ON public.video_assets_access
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own access records"
ON public.video_assets_access
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = granted_by_user_id);