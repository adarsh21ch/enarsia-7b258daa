-- Create funnel price options table for multiple payment tiers
CREATE TABLE funnel_price_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  upi_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_price_options_funnel ON funnel_price_options(funnel_id);

-- Enable RLS
ALTER TABLE funnel_price_options ENABLE ROW LEVEL SECURITY;

-- Owners can manage their price options
CREATE POLICY "Owners can manage price options" ON funnel_price_options
  FOR ALL USING (funnel_id IN (SELECT id FROM funnels WHERE owner_user_id = auth.uid()));

-- Public can view price options for published funnels
CREATE POLICY "Public can view price options" ON funnel_price_options
  FOR SELECT USING (funnel_id IN (SELECT id FROM funnels WHERE is_published = true));