-- Allow users to read their upline's profile for tag inheritance
CREATE POLICY "Users can view upline leader profile"
ON public.profiles FOR SELECT
USING (
  -- User is viewing their own profile
  auth.uid() = user_id
  OR
  -- User is viewing their direct upline's profile
  EXISTS (
    SELECT 1 FROM public.profiles AS viewer
    WHERE viewer.user_id = auth.uid()
      AND LOWER(viewer.upline_email) = LOWER(profiles.email)
  )
  OR
  -- User is viewing their root leader's profile
  EXISTS (
    SELECT 1 FROM public.profiles AS viewer
    WHERE viewer.user_id = auth.uid()
      AND UPPER(viewer.root_leader_id) = UPPER(profiles.neverai_id)
  )
);