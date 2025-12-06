-- Add explicit DENY INSERT policy for user_roles (prevent unauthorized role creation)
CREATE POLICY "Deny insert on user_roles"
ON public.user_roles
FOR INSERT
WITH CHECK (false);

-- Add explicit DENY UPDATE policy for user_roles (prevent role modification)
CREATE POLICY "Deny update on user_roles"
ON public.user_roles
FOR UPDATE
USING (false);

-- Add explicit DENY DELETE policy for user_roles (prevent role deletion)
CREATE POLICY "Deny delete on user_roles"
ON public.user_roles
FOR DELETE
USING (false);

-- Add explicit DENY DELETE policy for user_subscriptions (prevent billing bypass)
CREATE POLICY "Deny delete on user_subscriptions"
ON public.user_subscriptions
FOR DELETE
USING (false);

-- Add explicit DENY DELETE policy for profiles (maintain data integrity)
CREATE POLICY "Deny delete on profiles"
ON public.profiles
FOR DELETE
USING (false);