-- Part 1: Make ac_profiles fields nullable with defaults for auto-creation
ALTER TABLE public.ac_profiles 
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN mobile SET DEFAULT '',
  ALTER COLUMN mobile DROP NOT NULL,
  ALTER COLUMN city SET DEFAULT '',
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state SET DEFAULT '',
  ALTER COLUMN state DROP NOT NULL,
  ALTER COLUMN dob DROP NOT NULL;

-- Part 2: Create function to ensure ac_profiles entry exists on first login
CREATE OR REPLACE FUNCTION public.ensure_ac_profile_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
  v_display_name text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if ac_profiles entry already exists
  SELECT EXISTS(SELECT 1 FROM ac_profiles WHERE user_id = v_user_id) INTO v_exists;
  
  IF v_exists THEN
    RETURN json_build_object('success', true, 'created', false);
  END IF;

  -- Get display_name from main profiles table
  SELECT display_name INTO v_display_name FROM profiles WHERE user_id = v_user_id;

  -- Create ac_profiles entry with data from profiles
  INSERT INTO ac_profiles (user_id, full_name, mobile, city, state)
  VALUES (
    v_user_id, 
    COALESCE(v_display_name, ''),
    '',
    '',
    ''
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'created', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_ac_profile_exists() TO authenticated;