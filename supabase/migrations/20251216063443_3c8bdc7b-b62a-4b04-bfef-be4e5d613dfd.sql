-- Add tags_refresh_token column to profiles for instant team sync
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tags_refresh_token text DEFAULT NULL;

-- Create index for faster lookups when updating team members
CREATE INDEX IF NOT EXISTS idx_profiles_leaders_id ON public.profiles(leaders_id_of_my_leader);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.tags_refresh_token IS 'Token updated by leader to trigger tag refresh for all team members';