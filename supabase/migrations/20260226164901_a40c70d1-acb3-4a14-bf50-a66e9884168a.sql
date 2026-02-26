
-- 1. Replace funnel_leads INSERT policy: require valid published funnel
DROP POLICY IF EXISTS "Anyone can insert leads" ON funnel_leads;
CREATE POLICY "Insert leads for published funnels"
  ON funnel_leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = funnel_leads.funnel_id
      AND funnels.is_published = true
    )
  );

-- 2. Replace funnel_payments INSERT policy: require valid lead exists
DROP POLICY IF EXISTS "Anyone can insert payments" ON funnel_payments;
CREATE POLICY "Insert payments for valid leads"
  ON funnel_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM funnel_leads
      WHERE funnel_leads.id = funnel_payments.lead_id
    )
  );

-- 3. Replace funnel_video_analytics INSERT policy: require valid lead exists
DROP POLICY IF EXISTS "Anyone can insert analytics" ON funnel_video_analytics;
CREATE POLICY "Insert analytics for valid leads"
  ON funnel_video_analytics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM funnel_leads
      WHERE funnel_leads.id = funnel_video_analytics.lead_id
    )
  );
