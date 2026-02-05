-- ============================================================================
-- FIX: video_assets RLS infinite recursion
-- ============================================================================

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Users can view shared videos" ON video_assets;

-- Step 2: Create a SECURITY DEFINER function to check shared access
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION has_video_access(video_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM video_assets_access 
    WHERE video_asset_id = video_id 
    AND user_id = check_user_id 
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Step 3: Create fixed policy using the function
CREATE POLICY "Users can view owned and shared videos" ON video_assets
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR has_video_access(id, auth.uid())
  );

-- Step 4: Also fix the video_assets_access policy to avoid recursion
DROP POLICY IF EXISTS "Owners can manage video access" ON video_assets_access;

-- Create helper function for video ownership check
CREATE OR REPLACE FUNCTION is_video_owner(video_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM video_assets 
    WHERE id = video_id 
    AND owner_user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the policy using the function
CREATE POLICY "Owners can manage video access" ON video_assets_access
  FOR ALL USING (
    granted_by_user_id = auth.uid()
    OR is_video_owner(video_asset_id, auth.uid())
  );