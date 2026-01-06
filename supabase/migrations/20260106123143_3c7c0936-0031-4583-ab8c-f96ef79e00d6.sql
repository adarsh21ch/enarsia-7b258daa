-- Backfill email addresses from auth.users to profiles
UPDATE public.profiles p
SET email = LOWER(TRIM(u.email))
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;

-- Add a trigger to auto-sync email on profile creation
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users if not provided
  IF NEW.email IS NULL THEN
    SELECT LOWER(TRIM(email)) INTO NEW.email
    FROM auth.users
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON public.profiles;
CREATE TRIGGER sync_profile_email_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();