
-- Drop the three redundant SELECT policies
DROP POLICY IF EXISTS "video_assets_owner_select" ON public.video_assets;
DROP POLICY IF EXISTS "video_assets_shared_select" ON public.video_assets;
DROP POLICY IF EXISTS "video_assets_select" ON public.video_assets;

-- Create one unified SELECT policy
CREATE POLICY "Users with access can view video assets"
ON public.video_assets
FOR SELECT
USING (
  auth.uid() = owner_user_id
  OR public.has_video_access(id, auth.uid())
);
