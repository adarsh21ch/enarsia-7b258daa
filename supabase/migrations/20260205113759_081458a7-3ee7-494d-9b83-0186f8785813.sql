-- ============================================================================
-- MIGRATION: funnel_view_analytics
-- Purpose: Detailed viewer session tracking
-- ============================================================================

-- Create enhanced view analytics table
CREATE TABLE IF NOT EXISTS funnel_view_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,  -- Denormalized for efficient owner queries
  
  -- Viewer identification
  viewer_id TEXT NOT NULL,  -- Cookie/fingerprint ID, lead_id, or user_id
  viewer_type TEXT DEFAULT 'anonymous' 
    CHECK (viewer_type IN ('anonymous', 'lead', 'user')),
  
  -- Engagement metrics (updated during session)
  opened_video BOOLEAN DEFAULT false,
  watch_percentage INTEGER DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
  watch_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  
  -- Session timing
  session_start TIMESTAMPTZ DEFAULT now(),
  session_end TIMESTAMPTZ,
  
  -- Device/browser info
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  referrer TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_view_analytics_funnel 
  ON funnel_view_analytics(funnel_id);

CREATE INDEX IF NOT EXISTS idx_view_analytics_owner 
  ON funnel_view_analytics(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_view_analytics_viewer 
  ON funnel_view_analytics(viewer_id);

CREATE INDEX IF NOT EXISTS idx_view_analytics_created 
  ON funnel_view_analytics(created_at);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_view_analytics_owner_time 
  ON funnel_view_analytics(owner_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE funnel_view_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for funnel_view_analytics
-- ============================================================================

-- Owners can view their own funnel analytics
CREATE POLICY "Owners can view analytics" ON funnel_view_analytics
  FOR SELECT USING (owner_user_id = auth.uid());

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics" ON funnel_view_analytics
  FOR SELECT USING (is_funnels_admin(auth.uid()));

-- Public/Anonymous can insert analytics (via anon key)
CREATE POLICY "Anyone can insert view analytics" ON funnel_view_analytics
  FOR INSERT WITH CHECK (true);

-- Allow updates for session tracking
CREATE POLICY "Viewers can update their session" ON funnel_view_analytics
  FOR UPDATE USING (true);

-- ============================================================================
-- Aggregation helper function for dashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_funnel_view_stats(p_funnel_id UUID)
RETURNS TABLE (
  total_views BIGINT,
  unique_viewers BIGINT,
  avg_watch_percent NUMERIC,
  completion_count BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_views,
    COUNT(DISTINCT viewer_id)::BIGINT as unique_viewers,
    COALESCE(AVG(watch_percentage), 0)::NUMERIC as avg_watch_percent,
    COUNT(*) FILTER (WHERE completed = true)::BIGINT as completion_count,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE completed = true)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0 
    END as completion_rate
  FROM funnel_view_analytics
  WHERE funnel_id = p_funnel_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;