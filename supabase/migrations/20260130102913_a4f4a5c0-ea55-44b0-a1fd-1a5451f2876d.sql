-- ============================================
-- VIDEO ASSETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.video_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  
  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  
  -- R2 Storage Keys (NOT URLs - we generate signed URLs on demand)
  r2_object_key TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT,
  
  -- Video Properties
  duration_seconds INTEGER,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT DEFAULT 'video/mp4',
  
  -- Status: processing (uploading), ready (available), failed (error)
  status TEXT DEFAULT 'processing' 
    CHECK (status IN ('processing', 'ready', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_video_assets_owner 
  ON public.video_assets(owner_user_id);
  
CREATE INDEX IF NOT EXISTS idx_video_assets_status 
  ON public.video_assets(status) 
  WHERE status = 'ready';

-- Enable RLS
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own video assets"
  ON public.video_assets FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own video assets"
  ON public.video_assets FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own video assets"
  ON public.video_assets FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own video assets"
  ON public.video_assets FOR DELETE
  USING (auth.uid() = owner_user_id);

-- ============================================
-- UPDATE FUNNELS TABLE
-- ============================================

-- Add video_asset_id column to funnels table
ALTER TABLE public.funnels 
  ADD COLUMN IF NOT EXISTS video_asset_id UUID REFERENCES public.video_assets(id);

-- Index for faster joins
CREATE INDEX IF NOT EXISTS idx_funnels_video_asset 
  ON public.funnels(video_asset_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_video_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER video_assets_updated_at
  BEFORE UPDATE ON public.video_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_assets_updated_at();