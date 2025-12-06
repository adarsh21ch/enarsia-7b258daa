-- Add policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add policy to allow admins to view all subscriptions for insert (needed for toggle)
CREATE POLICY "Admins can insert subscriptions for any user"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));