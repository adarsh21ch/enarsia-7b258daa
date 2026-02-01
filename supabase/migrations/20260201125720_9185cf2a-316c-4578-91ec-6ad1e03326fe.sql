-- Add CTA timing and video access columns to funnels
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS cta_trigger_type text DEFAULT 'complete';
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS cta_trigger_value integer DEFAULT NULL;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS video_access_limit_minutes integer DEFAULT NULL;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS audio_url text DEFAULT NULL;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS audio_play_timing text DEFAULT 'before';

-- Add access control columns to funnel_leads
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS video_access_expires_at timestamptz DEFAULT NULL;
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS access_granted boolean DEFAULT false;
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS access_granted_at timestamptz DEFAULT NULL;

-- Create notifications table
CREATE TABLE IF NOT EXISTS funnel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  funnel_id uuid REFERENCES funnels(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES funnel_leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on funnel_notifications
ALTER TABLE funnel_notifications ENABLE ROW LEVEL SECURITY;

-- Owners can view their own notifications
CREATE POLICY "Owners can view their notifications"
ON funnel_notifications FOR SELECT
USING (auth.uid() = owner_user_id);

-- Owners can update their notifications (mark as read)
CREATE POLICY "Owners can update their notifications"
ON funnel_notifications FOR UPDATE
USING (auth.uid() = owner_user_id);

-- Owners can delete their notifications
CREATE POLICY "Owners can delete their notifications"
ON funnel_notifications FOR DELETE
USING (auth.uid() = owner_user_id);

-- Service role can insert notifications (for edge functions)
CREATE POLICY "Service role can insert notifications"
ON funnel_notifications FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_funnel_notifications_owner ON funnel_notifications(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_notifications_unread ON funnel_notifications(owner_user_id, is_read) WHERE is_read = false;