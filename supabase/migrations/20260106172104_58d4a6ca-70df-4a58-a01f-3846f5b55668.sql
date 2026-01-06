-- Fix get_user_by_neverai_id to use case-insensitive matching
CREATE OR REPLACE FUNCTION public.get_user_by_neverai_id(target_neverai_id text)
RETURNS TABLE(user_id uuid, display_name text, neverai_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.neverai_id
  FROM public.profiles p
  WHERE UPPER(p.neverai_id) = UPPER(target_neverai_id);
END;
$$;