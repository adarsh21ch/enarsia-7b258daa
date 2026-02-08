DROP FUNCTION IF EXISTS public.upline_set_member_level(UUID, UUID);

CREATE OR REPLACE FUNCTION public.upline_set_member_level(
  p_member_user_id UUID,
  p_level_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_email TEXT;
  v_caller_neverai_id TEXT;
  v_is_direct_upline BOOLEAN := FALSE;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email, neverai_id
  INTO v_caller_email, v_caller_neverai_id
  FROM public.profiles
  WHERE user_id = v_caller_id;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_member_user_id
      AND (
        upline_email = v_caller_email
        OR leaders_id_of_my_leader = v_caller_neverai_id
      )
  ) INTO v_is_direct_upline;

  IF NOT v_is_direct_upline THEN
    RETURN json_build_object('success', false, 'error', 'You can only assign levels to your direct team members');
  END IF;

  IF p_level_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.leader_levels WHERE id = p_level_id) THEN
      RETURN json_build_object('success', false, 'error', 'Level not found');
    END IF;
  END IF;

  UPDATE public.profiles
  SET level_id = p_level_id, updated_at = now()
  WHERE user_id = p_member_user_id;

  RETURN json_build_object('success', true);
END;
$$;