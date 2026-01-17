-- Add lifetime lead counter column to profiles table
-- This counter ONLY increases when leads are added, never decreases
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_leads_added INTEGER NOT NULL DEFAULT 0;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.profiles.total_leads_added IS 'Monotonic counter tracking lifetime leads added. Never decreases, even when leads are deleted. Used for free tier limits.';

-- Create function to increment lifetime lead counter
CREATE OR REPLACE FUNCTION public.increment_leads_added(user_uuid UUID, count INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE profiles 
  SET total_leads_added = total_leads_added + count,
      updated_at = now()
  WHERE user_id = user_uuid
  RETURNING total_leads_added INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_leads_added(UUID, INTEGER) TO authenticated;