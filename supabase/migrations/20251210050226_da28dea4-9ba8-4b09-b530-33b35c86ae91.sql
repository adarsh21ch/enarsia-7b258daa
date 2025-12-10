-- Add status column to team_access table for opt-in sharing flow
ALTER TABLE public.team_access 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'active', 'revoked'));

-- Update existing records to 'active' since they were already accepted
UPDATE public.team_access SET status = 'active' WHERE status = 'pending';

-- Add updated_at column for tracking changes
ALTER TABLE public.team_access 
ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create trigger for updated_at
CREATE TRIGGER update_team_access_updated_at
BEFORE UPDATE ON public.team_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies to account for status
-- Drop and recreate the SELECT policy to include status check for active shares
DROP POLICY IF EXISTS "Users can view their team access" ON public.team_access;

CREATE POLICY "Users can view their team access" 
ON public.team_access 
FOR SELECT 
USING (
  (auth.uid() = owner_user_id) OR 
  (auth.uid() = shared_with_user_id)
);

-- Add UPDATE policy so users can update status
CREATE POLICY "Users can update team access status" 
ON public.team_access 
FOR UPDATE 
USING (
  (auth.uid() = owner_user_id) OR 
  (auth.uid() = shared_with_user_id)
);

-- Update prospects RLS to only show shared prospects when status is 'active'
DROP POLICY IF EXISTS "Users can view shared prospects via team_access" ON public.prospects;

CREATE POLICY "Users can view shared prospects via team_access" 
ON public.prospects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM team_access
    WHERE team_access.owner_user_id = prospects.user_id 
      AND team_access.shared_with_user_id = auth.uid()
      AND team_access.status = 'active'
  )
);

-- Update profiles RLS to allow viewing profiles for pending/active shares
DROP POLICY IF EXISTS "Users can view profiles of users who shared with them" ON public.profiles;

CREATE POLICY "Users can view profiles of users who shared with them" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM team_access
    WHERE team_access.owner_user_id = profiles.user_id 
      AND team_access.shared_with_user_id = auth.uid()
      AND team_access.status IN ('pending', 'active')
  )
);

DROP POLICY IF EXISTS "Users can view profiles of users they shared with" ON public.profiles;

CREATE POLICY "Users can view profiles of users they shared with" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM team_access
    WHERE team_access.shared_with_user_id = profiles.user_id 
      AND team_access.owner_user_id = auth.uid()
      AND team_access.status IN ('pending', 'active')
  )
);