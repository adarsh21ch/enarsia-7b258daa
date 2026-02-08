CREATE POLICY "Authenticated users can read video assets"
ON public.video_assets
FOR SELECT
USING (auth.uid() IS NOT NULL);