-- Fix the search_path warning for get_clean_display_name function
CREATE OR REPLACE FUNCTION public.get_clean_display_name(
  p_display_name TEXT,
  p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- If display_name is valid, return it
  IF p_display_name IS NOT NULL 
     AND TRIM(p_display_name) != '' 
     AND LOWER(TRIM(p_display_name)) != 'unnamed' THEN
    RETURN p_display_name;
  END IF;
  
  -- Otherwise, return email prefix
  IF p_email IS NOT NULL THEN
    RETURN INITCAP(SPLIT_PART(p_email, '@', 1));
  END IF;
  
  -- Fallback
  RETURN 'User';
END;
$$;