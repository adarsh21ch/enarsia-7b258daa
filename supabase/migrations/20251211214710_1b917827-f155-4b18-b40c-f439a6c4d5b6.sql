-- Add new columns to profiles for leader hierarchy and stage configuration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leaders_id_of_my_leader TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS root_leader_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allow_leader_to_view BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS use_leader_stages BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS stage_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stage_labels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS response_labels JSONB DEFAULT '[]'::jsonb;

-- Add new columns to prospects for structured stage tracking
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS stage_index INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS personal_tags JSONB DEFAULT '[]'::jsonb;

-- Create function to get user by leader_id (neverai_id) for login
CREATE OR REPLACE FUNCTION public.get_user_email_by_leader_id(target_leader_id text)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, au.email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE UPPER(p.neverai_id) = UPPER(target_leader_id);
END;
$$;

-- Create function to compute and update hierarchy when leader changes
CREATE OR REPLACE FUNCTION public.update_leader_hierarchy(
  p_user_id uuid,
  p_leader_neverai_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_profile RECORD;
  v_result jsonb;
BEGIN
  -- Look up the leader's profile
  SELECT user_id, neverai_id, root_leader_id 
  INTO v_leader_profile
  FROM public.profiles 
  WHERE UPPER(neverai_id) = UPPER(p_leader_neverai_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leader ID not found');
  END IF;
  
  -- Cannot set yourself as your own leader
  IF v_leader_profile.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot set yourself as your leader');
  END IF;
  
  -- Update the user's profile with hierarchy info
  UPDATE public.profiles
  SET 
    leaders_id_of_my_leader = v_leader_profile.neverai_id,
    root_leader_id = COALESCE(v_leader_profile.root_leader_id, v_leader_profile.neverai_id),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'leaders_id_of_my_leader', v_leader_profile.neverai_id,
    'root_leader_id', COALESCE(v_leader_profile.root_leader_id, v_leader_profile.neverai_id)
  );
END;
$$;

-- Create function to get leader's stage configuration
CREATE OR REPLACE FUNCTION public.get_leader_stage_config(target_leader_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
BEGIN
  SELECT stage_count, stage_labels, response_labels
  INTO v_config
  FROM public.profiles
  WHERE UPPER(neverai_id) = UPPER(target_leader_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'stage_count', v_config.stage_count,
    'stage_labels', v_config.stage_labels,
    'response_labels', v_config.response_labels
  );
END;
$$;