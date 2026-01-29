-- ============================================================================
-- NEVORAI FUNNELS SYSTEM - DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- TABLE 1: funnels
-- Main funnel configuration table
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  allow_speed_control BOOLEAN DEFAULT true,
  allow_forward_seek BOOLEAN DEFAULT false,
  lock_cta_until_complete BOOLEAN DEFAULT true,
  price INTEGER DEFAULT 0,
  payment_type TEXT DEFAULT 'free' 
    CHECK (payment_type IN ('razorpay', 'upi_manual', 'free')),
  upi_id TEXT,
  cta_button_text TEXT DEFAULT 'Get Access Now',
  cta_redirect_url TEXT,
  success_message TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnels_slug ON funnels(slug) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_funnels_owner ON funnels(owner_user_id);

-- ============================================================================
-- TABLE 2: funnel_leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  video_watch_percent INTEGER DEFAULT 0,
  video_completed BOOLEAN DEFAULT false,
  last_watched_second INTEGER DEFAULT 0,
  max_watched_second INTEGER DEFAULT 0,
  payment_status_cache TEXT DEFAULT 'pending' 
    CHECK (payment_status_cache IN ('pending', 'paid', 'failed')),
  access_token TEXT UNIQUE,
  access_token_expires_at TIMESTAMPTZ,
  whatsapp_consent BOOLEAN DEFAULT false,
  conversation_id TEXT,
  last_whatsapp_interaction TIMESTAMPTZ,
  synced_to_trackup_at TIMESTAMPTZ,
  source TEXT DEFAULT 'funnel',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_leads_funnel ON funnel_leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_owner ON funnel_leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_token ON funnel_leads(access_token);

-- ============================================================================
-- TABLE 3: funnel_payments (SOURCE OF TRUTH)
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES funnel_leads(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'manual')),
  provider_order_id TEXT,
  provider_payment_id TEXT,
  provider_signature TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  upi_screenshot_url TEXT,
  manual_verified_by UUID,
  manual_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_payments_lead ON funnel_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_funnel_payments_funnel ON funnel_payments(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_payments_owner ON funnel_payments(owner_user_id);

-- ============================================================================
-- TABLE 4: funnel_video_analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES funnel_leads(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL 
    CHECK (event_type IN ('page_view', 'lead_capture', 'play', 'pause', 
                          'progress', 'seek', 'complete', 'cta_click', 
                          'payment_start', 'payment_complete')),
  timestamp_second INTEGER,
  watched_percent INTEGER,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_time ON funnel_video_analytics(funnel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_lead ON funnel_video_analytics(lead_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON funnel_video_analytics(event_type);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_payment_status(p_lead_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT status FROM funnel_payments 
     WHERE lead_id = p_lead_id 
     ORDER BY created_at DESC LIMIT 1),
    'pending'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION sync_lead_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE funnel_leads 
  SET payment_status_cache = NEW.status,
      updated_at = now()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_payment_status ON funnel_payments;
CREATE TRIGGER trigger_sync_payment_status
AFTER INSERT OR UPDATE ON funnel_payments
FOR EACH ROW EXECUTE FUNCTION sync_lead_payment_status();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_video_analytics ENABLE ROW LEVEL SECURITY;

-- Funnels policies
DROP POLICY IF EXISTS "Owners can manage funnels" ON funnels;
CREATE POLICY "Owners can manage funnels" ON funnels
  FOR ALL USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Public can view published funnels" ON funnels;
CREATE POLICY "Public can view published funnels" ON funnels
  FOR SELECT USING (is_published = true);

-- Funnel leads policies
DROP POLICY IF EXISTS "Owners can view leads" ON funnel_leads;
CREATE POLICY "Owners can view leads" ON funnel_leads
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update leads" ON funnel_leads;
CREATE POLICY "Owners can update leads" ON funnel_leads
  FOR UPDATE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert leads" ON funnel_leads;
CREATE POLICY "Anyone can insert leads" ON funnel_leads
  FOR INSERT WITH CHECK (true);

-- Funnel payments policies
DROP POLICY IF EXISTS "Owners can view payments" ON funnel_payments;
CREATE POLICY "Owners can view payments" ON funnel_payments
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update payments" ON funnel_payments;
CREATE POLICY "Owners can update payments" ON funnel_payments
  FOR UPDATE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert payments" ON funnel_payments;
CREATE POLICY "Anyone can insert payments" ON funnel_payments
  FOR INSERT WITH CHECK (true);

-- Analytics policies
DROP POLICY IF EXISTS "Owners can view analytics" ON funnel_video_analytics;
CREATE POLICY "Owners can view analytics" ON funnel_video_analytics
  FOR SELECT USING (
    funnel_id IN (SELECT id FROM funnels WHERE owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can insert analytics" ON funnel_video_analytics;
CREATE POLICY "Anyone can insert analytics" ON funnel_video_analytics
  FOR INSERT WITH CHECK (true);