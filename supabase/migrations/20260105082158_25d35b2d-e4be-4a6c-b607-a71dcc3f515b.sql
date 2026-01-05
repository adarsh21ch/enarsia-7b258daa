-- 1. Update handle_new_user to auto-generate Leader ID on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
  v_neverai_id TEXT;
BEGIN
  -- Get next sequence value for leader ID
  v_seq := nextval('leader_code_sequence');
  v_neverai_id := 'NVR' || LPAD(v_seq::TEXT, 6, '0');
  
  -- Create profile with auto-generated Leader ID
  INSERT INTO public.profiles (user_id, neverai_id, leader_code_seq)
  VALUES (NEW.id, v_neverai_id, v_seq);
  
  RETURN NEW;
END;
$$;

-- 2. Ensure auth trigger exists (drop and recreate to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Migrate old format users - assign leader_code_seq to existing users
UPDATE profiles
SET leader_code_seq = nextval('leader_code_sequence')
WHERE neverai_id IS NOT NULL 
AND leader_code_seq IS NULL;

-- 4. Update AC sync trigger to only update display_name (not create profiles)
CREATE OR REPLACE FUNCTION public.sync_ac_to_main_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update display_name if profile exists but name is empty
  UPDATE public.profiles 
  SET display_name = COALESCE(display_name, NEW.full_name),
      updated_at = now()
  WHERE user_id = NEW.user_id
  AND (display_name IS NULL OR display_name = '');
  
  RETURN NEW;
END;
$$;

-- 5. Add unique constraints (use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_neverai_id_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_neverai_id_unique UNIQUE (neverai_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_leader_code_seq_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_leader_code_seq_unique UNIQUE (leader_code_seq);
  END IF;
END $$;