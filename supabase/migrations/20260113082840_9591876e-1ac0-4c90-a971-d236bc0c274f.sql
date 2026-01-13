-- Function to check if a user was provisioned externally (e.g., from Achievers Club)
-- and help determine if they need a password reset
CREATE OR REPLACE FUNCTION public.check_provisioned_user(target_email TEXT)
RETURNS TABLE(is_provisioned BOOLEAN, source_app TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.source_app IS NOT NULL AND p.source_app != '', false) as is_provisioned,
    p.source_app
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(TRIM(target_email))
  LIMIT 1;
END;
$$;