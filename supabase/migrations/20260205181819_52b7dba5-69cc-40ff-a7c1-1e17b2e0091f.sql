-- Add heartbeat column for tracking active sessions
ALTER TABLE funnel_view_analytics ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Index for efficient queries on recent heartbeats
CREATE INDEX IF NOT EXISTS idx_funnel_view_heartbeat ON funnel_view_analytics(funnel_id, last_heartbeat_at DESC);