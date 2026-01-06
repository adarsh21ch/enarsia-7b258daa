-- Drop the old function with old parameter name, then recreate
DROP FUNCTION IF EXISTS public.update_leader_hierarchy(uuid, text);

-- Recreate update_leader_hierarchy with leader_id parameter
CREATE OR REPLACE FUNCTION public.update_leader_hierarchy(p_user_id uuid, p_leader_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_profile RECORD;
BEGIN
  SELECT user_id, leader_id, root_leader_id 
  INTO v_leader_profile
  FROM public.profiles 
  WHERE UPPER(leader_id) = UPPER(p_leader_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leader ID not found');
  END IF;
  
  IF v_leader_profile.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot set yourself as your leader');
  END IF;
  
  UPDATE public.profiles
  SET 
    leaders_id_of_my_leader = v_leader_profile.leader_id,
    root_leader_id = COALESCE(v_leader_profile.root_leader_id, v_leader_profile.leader_id),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'leaders_id_of_my_leader', v_leader_profile.leader_id,
    'root_leader_id', COALESCE(v_leader_profile.root_leader_id, v_leader_profile.leader_id)
  );
END;
$$;