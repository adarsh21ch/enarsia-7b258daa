-- PART 1: Auto-generate display_name from email

-- A) Backfill existing users with NULL/empty/Unnamed display_name
UPDATE public.profiles
SET display_name = INITCAP(SPLIT_PART(email, '@', 1)),
    updated_at = now()
WHERE email IS NOT NULL
  AND (
    display_name IS NULL 
    OR TRIM(display_name) = '' 
    OR LOWER(TRIM(display_name)) = 'unnamed'
  );

-- B) Create function to auto-generate display_name for new users
CREATE OR REPLACE FUNCTION public.auto_generate_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only set if display_name is empty/null and email exists
  IF (NEW.display_name IS NULL OR TRIM(NEW.display_name) = '' OR LOWER(TRIM(NEW.display_name)) = 'unnamed')
     AND NEW.email IS NOT NULL THEN
    NEW.display_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  RETURN NEW;
END;
$$;

-- C) Create trigger for new profile inserts
DROP TRIGGER IF EXISTS trigger_auto_generate_display_name ON public.profiles;
CREATE TRIGGER trigger_auto_generate_display_name
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_display_name();

-- D) Helper function to get clean display name (for UI queries)
-- Returns display_name if set, otherwise email prefix
CREATE OR REPLACE FUNCTION public.get_clean_display_name(
  p_display_name TEXT,
  p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_clean_display_name(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clean_display_name(TEXT, TEXT) TO anon;