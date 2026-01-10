-- Create RPC function to get leader's funnel config (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_leader_funnel_config(target_neverai_id text)
RETURNS TABLE(
  id uuid,
  funnel_name text,
  funnel_length integer,
  day_1_start date,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_leader_user_id uuid;
BEGIN
  -- First resolve the leader's user_id from neverai_id
  SELECT p.user_id INTO v_leader_user_id
  FROM public.profiles p
  WHERE UPPER(p.neverai_id) = UPPER(target_neverai_id);
  
  IF v_leader_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the leader's funnel config
  RETURN QUERY
  SELECT 
    fc.id,
    fc.funnel_name,
    fc.funnel_length,
    fc.day_1_start,
    fc.user_id
  FROM public.funnel_configs fc
  WHERE fc.user_id = v_leader_user_id
  ORDER BY fc.created_at DESC
  LIMIT 1;
END;
$$;