DROP POLICY IF EXISTS "Authenticated users can read video assets" ON public.video_assets;

CREATE POLICY "Users can view owned or shared videos"
ON public.video_assets
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.video_assets_access
    WHERE video_assets_access.video_asset_id = video_assets.id
      AND video_assets_access.user_id = auth.uid()
      AND video_assets_access.revoked_at IS NULL
  )
);