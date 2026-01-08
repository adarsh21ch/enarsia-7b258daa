-- Update RLS policy on tracking_overrides for proper leader viewing
DROP POLICY IF EXISTS "Users can view own or leader can view member overrides" 
ON public.tracking_overrides;

CREATE POLICY "Users can view own or leader can view member overrides"
ON public.tracking_overrides
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  (target_user_id <> '00000000-0000-0000-0000-000000000001'::uuid 
   AND can_leader_view_member(auth.uid(), target_user_id))
  OR
  (target_user_id = '00000000-0000-0000-0000-000000000001'::uuid 
   AND can_leader_view_member(auth.uid(), user_id))
);