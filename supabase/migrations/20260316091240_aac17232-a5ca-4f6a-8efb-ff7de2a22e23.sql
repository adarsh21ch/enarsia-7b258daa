-- Add missing app features to registry
INSERT INTO admin_feature_flags (feature_key, feature_name, module, category, required_tier, is_enabled, free_access, pro_access, trial_access)
VALUES
  -- Application: Notes
  ('notes_create', 'Create Notes', 'application', 'general', 'basic', true, true, true, true),
  ('notes_audio', 'Audio Recording in Notes', 'application', 'general', 'pro', true, false, true, true),
  ('notes_share', 'Share Notes', 'application', 'general', 'pro', true, false, true, true),
  -- Application: Inbox
  ('inbox_messages', 'Inbox Messages', 'application', 'general', 'basic', true, true, true, true),
  ('send_message', 'Send Message to Team', 'application', 'team', 'pro', true, false, true, true),
  -- Application: Dashboard
  ('dashboard_widgets', 'Dashboard Widgets', 'application', 'analytics', 'basic', true, true, true, true),
  ('weekly_report', 'Weekly Report Card', 'application', 'analytics', 'basic', true, true, true, true),
  ('streak_tracking', 'Streak Tracking', 'application', 'analytics', 'basic', true, true, true, true),
  -- Application: Profile  
  ('share_profile', 'Share Profile', 'application', 'general', 'basic', true, true, true, true),
  ('connect_upline', 'Connect Upline', 'application', 'team', 'basic', true, true, true, true),
  -- TrackUp features
  ('trackup_personal_view', 'Personal Tracking View', 'trackup', 'tracking', 'basic', true, true, true, true),
  ('trackup_total_view', 'Total Tracking View', 'trackup', 'tracking', 'basic', true, true, true, true),
  ('trackup_manual_update', 'Manual Tracking Update', 'trackup', 'tracking', 'basic', true, true, true, true),
  ('trackup_export', 'Export Tracking Data', 'trackup', 'export', 'pro', true, false, true, true),
  ('trackup_funnel_view', 'Funnel-wise Tracking', 'trackup', 'tracking', 'pro', true, false, true, true),
  -- Forms
  ('forms_create', 'Create Forms', 'application', 'general', 'pro', true, false, true, true),
  ('forms_submissions', 'View Form Submissions', 'application', 'general', 'pro', true, false, true, true),
  ('forms_lead_mapping', 'Form Lead Mapping', 'application', 'leads', 'premium', true, false, true, true),
  -- Calendar
  ('calendar_view', 'Calendar Strip View', 'application', 'general', 'basic', true, true, true, true)
ON CONFLICT (feature_key) DO NOTHING;
