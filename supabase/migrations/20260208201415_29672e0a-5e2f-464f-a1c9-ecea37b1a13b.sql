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
  v_member_upline_email TEXT;
  v_level_leader_id UUID;
  v_caller_root TEXT;
  v_level_owner_root TEXT;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email, root_leader_id INTO v_caller_email, v_caller_root
  FROM public.profiles
  WHERE user_id = v_caller_id;

  SELECT upline_email INTO v_member_upline_email
  FROM public.profiles
  WHERE user_id = p_member_user_id;

  IF v_member_upline_email IS NULL OR (
    v_member_upline_email != v_caller_email
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = p_member_user_id
        AND leaders_id_of_my_leader = (
          SELECT neverai_id FROM public.profiles WHERE user_id = v_caller_id
        )
    )
  ) THEN
    IF v_member_upline_email != v_caller_email THEN
      RETURN json_build_object('success', false, 'error', 'You can only assign levels to your direct team members');
    END IF;
  END IF;

  IF p_level_id IS NOT NULL THEN
    SELECT leader_id INTO v_level_leader_id
    FROM public.leader_levels
    WHERE id = p_level_id;

    IF v_level_leader_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Level not found');
    END IF;

    SELECT root_leader_id INTO v_level_owner_root
    FROM public.profiles
    WHERE user_id = v_level_leader_id;

    IF v_level_leader_id != v_caller_id 
       AND (v_caller_root IS NULL OR v_level_owner_root IS NULL OR v_caller_root != v_level_owner_root)
       AND v_level_leader_id != v_caller_id THEN
      RETURN json_build_object('success', false, 'error', 'Level does not belong to your team hierarchy');
    END IF;
  END IF;

  UPDATE public.profiles
  SET level_id = p_level_id,
      updated_at = now()
  WHERE user_id = p_member_user_id;

  RETURN json_build_object('success', true);
END;
$$;