-- Function to check if a leader can view a member's data
CREATE OR REPLACE FUNCTION public.can_leader_view_member(
  p_leader_user_id uuid,
  p_member_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles leader
    JOIN public.profiles member
      ON member.user_id = p_member_user_id
     AND member.allow_leader_to_view = true
     AND member.leaders_id_of_my_leader = leader.neverai_id
    WHERE leader.user_id = p_leader_user_id
  );
$$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Leaders can view direct report prospects" ON public.prospects;
DROP POLICY IF EXISTS "Leaders can view direct report tracking overrides" ON public.tracking_overrides;

-- Policy for prospects table
CREATE POLICY "Leaders can view direct report prospects"
ON public.prospects
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.can_leader_view_member(auth.uid(), user_id)
);

-- Policy for tracking_overrides table
CREATE POLICY "Leaders can view direct report tracking overrides"
ON public.tracking_overrides
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.can_leader_view_member(auth.uid(), target_user_id)
);