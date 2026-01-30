-- Add video_asset_id column if it doesn't exist
ALTER TABLE funnels 
ADD COLUMN IF NOT EXISTS video_asset_id UUID REFERENCES video_assets(id) ON DELETE SET NULL;

-- Make video_url nullable (for asset-based funnels)
ALTER TABLE funnels 
ALTER COLUMN video_url DROP NOT NULL;

-- Create index for video_asset_id lookups
CREATE INDEX IF NOT EXISTS idx_funnels_video_asset ON funnels(video_asset_id);