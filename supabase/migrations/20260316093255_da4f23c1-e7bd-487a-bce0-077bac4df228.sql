-- Auto-downgrade function that can be called periodically or via cron
CREATE OR REPLACE FUNCTION public.auto_downgrade_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_subscriptions
  SET plan = 'free', tier = 'basic', status = 'expired', is_admin_override = false, updated_at = NOW()
  WHERE plan IN ('pro', 'mini')
    AND expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status = 'active'
    AND is_admin_override = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;