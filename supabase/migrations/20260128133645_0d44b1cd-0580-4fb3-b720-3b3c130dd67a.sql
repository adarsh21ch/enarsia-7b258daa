-- Create admin_audit_logs table for tracking all admin actions
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action_type);
CREATE INDEX idx_audit_logs_target ON admin_audit_logs(target_type, target_id);

-- RLS: Admin-only access (immutable - no UPDATE/DELETE)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit logs"
  ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add is_suspended column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Create logging helper function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_description TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  INSERT INTO admin_audit_logs (
    admin_user_id, action_type, target_type, 
    target_id, old_value, new_value, description
  ) VALUES (
    auth.uid(), p_action_type, p_target_type,
    p_target_id, p_old_value, p_new_value, p_description
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create function to get audit logs with pagination
CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_action_type TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  admin_user_id UUID,
  admin_email TEXT,
  action_type TEXT,
  target_type TEXT,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get total count with filters
  SELECT COUNT(*) INTO v_total
  FROM admin_audit_logs al
  WHERE (p_action_type IS NULL OR al.action_type = p_action_type)
    AND (p_target_type IS NULL OR al.target_type = p_target_type);

  RETURN QUERY
  SELECT 
    al.id,
    al.admin_user_id,
    au.email as admin_email,
    al.action_type,
    al.target_type,
    al.target_id,
    al.old_value,
    al.new_value,
    al.description,
    al.created_at,
    v_total as total_count
  FROM admin_audit_logs al
  LEFT JOIN auth.users au ON au.id = al.admin_user_id
  WHERE (p_action_type IS NULL OR al.action_type = p_action_type)
    AND (p_target_type IS NULL OR al.target_type = p_target_type)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create function for enhanced user search with more details
CREATE OR REPLACE FUNCTION public.admin_search_users_enhanced(
  search_query TEXT DEFAULT '',
  plan_filter TEXT DEFAULT NULL,
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  neverai_id TEXT,
  plan TEXT,
  is_admin_override BOOLEAN,
  subscribed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_leads_count BIGINT,
  source_app TEXT,
  last_active_at TIMESTAMPTZ,
  is_suspended BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_normalized_query TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  v_normalized_query := LOWER(TRIM(search_query));

  -- Get total count
  SELECT COUNT(DISTINCT p.user_id) INTO v_total
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE (
    v_normalized_query = '' OR
    LOWER(COALESCE(p.email, au.email, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.display_name, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.neverai_id, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.upline_email, '')) LIKE '%' || v_normalized_query || '%'
  )
  AND (
    plan_filter IS NULL OR
    plan_filter = 'all' OR
    (plan_filter = 'free' AND (us.plan IS NULL OR us.plan = 'free')) OR
    (plan_filter = 'pro' AND us.plan = 'pro')
  );

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, au.email) as email,
    p.display_name,
    p.neverai_id,
    COALESCE(us.plan::text, 'free') as plan,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id)::bigint as total_leads_count,
    p.source_app,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active_at,
    COALESCE(p.is_suspended, false) as is_suspended,
    p.created_at,
    v_total as total_count
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE (
    v_normalized_query = '' OR
    LOWER(COALESCE(p.email, au.email, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.display_name, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.neverai_id, '')) LIKE '%' || v_normalized_query || '%' OR
    LOWER(COALESCE(p.upline_email, '')) LIKE '%' || v_normalized_query || '%'
  )
  AND (
    plan_filter IS NULL OR
    plan_filter = 'all' OR
    (plan_filter = 'free' AND (us.plan IS NULL OR us.plan = 'free')) OR
    (plan_filter = 'pro' AND us.plan = 'pro')
  )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Create function to toggle user suspension with audit logging
CREATE OR REPLACE FUNCTION public.admin_toggle_user_suspension(
  p_user_id UUID,
  p_suspend BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status BOOLEAN;
  v_user_email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get current status and email
  SELECT is_suspended, email INTO v_old_status, v_user_email
  FROM profiles WHERE user_id = p_user_id;

  -- Update suspension status
  UPDATE profiles 
  SET is_suspended = p_suspend, updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the action
  PERFORM log_admin_action(
    CASE WHEN p_suspend THEN 'user_suspended' ELSE 'user_unsuspended' END,
    'user',
    p_user_id::text,
    jsonb_build_object('is_suspended', v_old_status),
    jsonb_build_object('is_suspended', p_suspend),
    CASE WHEN p_suspend 
      THEN 'Suspended user: ' || COALESCE(v_user_email, p_user_id::text)
      ELSE 'Unsuspended user: ' || COALESCE(v_user_email, p_user_id::text)
    END
  );

  RETURN true;
END;
$$;

-- Create function to get conversion analytics
CREATE OR REPLACE FUNCTION public.admin_get_conversion_analytics()
RETURNS TABLE(
  total_users BIGINT,
  free_users BIGINT,
  pro_users BIGINT,
  conversion_rate NUMERIC,
  conversions_this_month BIGINT,
  conversions_last_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      COUNT(DISTINCT p.user_id) as total,
      COUNT(DISTINCT CASE WHEN us.plan = 'pro' THEN p.user_id END) as pro,
      COUNT(DISTINCT CASE WHEN us.plan IS NULL OR us.plan = 'free' THEN p.user_id END) as free
    FROM profiles p
    LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  ),
  monthly_conversions AS (
    SELECT 
      COUNT(CASE WHEN subscribed_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month,
      COUNT(CASE WHEN subscribed_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' 
                  AND subscribed_at < date_trunc('month', CURRENT_DATE) THEN 1 END) as last_month
    FROM user_subscriptions
    WHERE plan = 'pro'
  )
  SELECT 
    uc.total::bigint,
    uc.free::bigint,
    uc.pro::bigint,
    CASE WHEN uc.total > 0 THEN ROUND((uc.pro::numeric / uc.total::numeric) * 100, 2) ELSE 0 END as conversion_rate,
    mc.this_month::bigint,
    mc.last_month::bigint
  FROM user_counts uc, monthly_conversions mc;
END;
$$;