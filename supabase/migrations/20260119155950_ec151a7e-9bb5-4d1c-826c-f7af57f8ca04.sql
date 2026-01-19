-- Fix the signup failure: "duplicate key value violates unique constraint profiles_neverai_id_key"
-- Root cause: leader_code_sequence is out of sync, causing duplicate NeverAI IDs

-- Step 1: Reset sequence safely - get max from leader_code_seq directly (reliable)
DO $$
DECLARE
  v_max_seq INTEGER;
  v_new_val INTEGER;
BEGIN
  -- Get max leader_code_seq (the reliable numeric column)
  SELECT COALESCE(MAX(leader_code_seq), 0) INTO v_max_seq FROM profiles;
  
  -- Set sequence to max + 2000 buffer for safety margin
  v_new_val := v_max_seq + 2000;
  PERFORM setval('leader_code_sequence', v_new_val, true);
  
  RAISE NOTICE 'Sequence reset from % to %', v_max_seq, v_new_val;
END $$;

-- Step 2: Replace handle_new_user with collision-safe retry logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seq INTEGER;
  v_neverai_id TEXT;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 10;
BEGIN
  -- Retry loop to handle race conditions
  LOOP
    v_attempts := v_attempts + 1;
    
    -- Get next sequence value
    v_seq := nextval('leader_code_sequence');
    v_neverai_id := 'NVR' || LPAD(v_seq::TEXT, 6, '0');
    
    -- Try to insert the profile
    BEGIN
      INSERT INTO public.profiles (user_id, neverai_id, leader_code_seq, email)
      VALUES (NEW.id, v_neverai_id, v_seq, LOWER(TRIM(NEW.email)));
      
      -- Success - exit the loop
      EXIT;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- If we've exceeded max attempts, raise an error
        IF v_attempts >= v_max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique NeverAI ID after % attempts', v_max_attempts;
        END IF;
        -- Otherwise, loop again to try next sequence value
        CONTINUE;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;