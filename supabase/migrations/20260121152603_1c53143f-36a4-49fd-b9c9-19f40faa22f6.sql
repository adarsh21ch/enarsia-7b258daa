-- RPC function to allow upline to update their downline's level
-- Security: Only the direct upline can update the level_id of their team members

CREATE OR REPLACE FUNCTION public.upline_set_member_level(
  p_member_user_id UUID,
  p_level_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_upline_user_id UUID;
  v_upline_email TEXT;
  v_member_upline_email TEXT;
  v_level_owner_id UUID;
BEGIN
  v_upline_user_id := auth.uid();
  
  IF v_upline_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get the upline's email
  SELECT email INTO v_upline_email
  FROM public.profiles
  WHERE user_id = v_upline_user_id;
  
  -- Get the member's upline_email to verify relationship
  SELECT upline_email INTO v_member_upline_email
  FROM public.profiles
  WHERE user_id = p_member_user_id;
  
  -- Verify the caller is the direct upline of this member
  IF v_member_upline_email IS NULL OR LOWER(TRIM(v_member_upline_email)) != LOWER(TRIM(v_upline_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not the direct upline of this member');
  END IF;
  
  -- Verify the level belongs to the upline (they created it)
  SELECT leader_id INTO v_level_owner_id
  FROM public.leader_levels
  WHERE id = p_level_id;
  
  IF v_level_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Level not found');
  END IF;
  
  IF v_level_owner_id != v_upline_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only assign levels that you created');
  END IF;
  
  -- Update the member's level
  UPDATE public.profiles
  SET level_id = p_level_id, updated_at = now()
  WHERE user_id = p_member_user_id;
  
  RETURN jsonb_build_object('success', true, 'level_id', p_level_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upline_set_member_level(UUID, UUID) TO authenticated;