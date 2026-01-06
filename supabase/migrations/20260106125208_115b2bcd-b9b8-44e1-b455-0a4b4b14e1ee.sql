-- One-time ROOT OWNER Leader ID assignment
-- Target: Krishna Arora (krishnaaroraflp@gmail.com)
-- Purpose: Reserve NVR000001 as permanent system root identifier

-- Step 1: Verify no conflict exists (safety check)
DO $$
DECLARE
  v_conflict_user_id UUID;
BEGIN
  SELECT user_id INTO v_conflict_user_id
  FROM public.profiles
  WHERE neverai_id = 'NVR000001';
  
  IF v_conflict_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLICT: NVR000001 is already assigned to user %', v_conflict_user_id;
  END IF;
END $$;

-- Step 2: Assign NVR000001 to Krishna Arora
UPDATE public.profiles
SET 
  neverai_id = 'NVR000001',
  updated_at = NOW()
WHERE user_id = '713f4671-4de6-4c4d-9121-28e9b0be507e'
  AND email = 'krishnaaroraflp@gmail.com';