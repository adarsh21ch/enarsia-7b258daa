-- Add NeverAI ID to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neverai_id TEXT UNIQUE;

-- Create function to generate NeverAI ID
CREATE OR REPLACE FUNCTION public.generate_neverai_id()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create trigger to auto-generate NeverAI ID on profile creation
CREATE OR REPLACE FUNCTION public.set_neverai_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.neverai_id IS NULL THEN
    NEW.neverai_id := generate_neverai_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_neverai_id ON public.profiles;
CREATE TRIGGER trigger_set_neverai_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_neverai_id();

-- Update existing profiles without NeverAI ID
UPDATE public.profiles SET neverai_id = generate_neverai_id() WHERE neverai_id IS NULL;

-- Create team_access table for sharing Follow Up data
CREATE TABLE IF NOT EXISTS public.team_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, shared_with_user_id)
);

-- Enable RLS on team_access
ALTER TABLE public.team_access ENABLE ROW LEVEL SECURITY;

-- Users can view team access records where they are the owner or shared_with
CREATE POLICY "Users can view their team access" 
ON public.team_access 
FOR SELECT 
USING (auth.uid() = owner_user_id OR auth.uid() = shared_with_user_id);

-- Users can create team access records as owner
CREATE POLICY "Users can create team access" 
ON public.team_access 
FOR INSERT 
WITH CHECK (auth.uid() = owner_user_id);

-- Users can delete team access records as owner
CREATE POLICY "Users can delete team access" 
ON public.team_access 
FOR DELETE 
USING (auth.uid() = owner_user_id);

-- Create function to lookup user by NeverAI ID
CREATE OR REPLACE FUNCTION public.get_user_by_neverai_id(target_neverai_id TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, neverai_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.neverai_id
  FROM public.profiles p
  WHERE p.neverai_id = target_neverai_id;
END;
$$;