-- Add RLS policy to allow viewing prospects shared via team_access
CREATE POLICY "Users can view shared prospects via team_access" 
ON public.prospects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.team_access 
    WHERE team_access.owner_user_id = prospects.user_id 
    AND team_access.shared_with_user_id = auth.uid()
  )
);