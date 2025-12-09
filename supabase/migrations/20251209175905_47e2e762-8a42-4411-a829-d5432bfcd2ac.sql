-- Fix generate_neverai_id function with proper security settings
CREATE OR REPLACE FUNCTION public.generate_neverai_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate ID like NVR-XXXXX (5 alphanumeric characters)
    new_id := 'NVR-' || upper(substring(md5(random()::text) from 1 for 5));
    
    -- Check if it exists
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE neverai_id = new_id;
    
    IF exists_count = 0 THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;