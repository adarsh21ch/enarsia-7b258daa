-- Create a security definer function to get user email for admin
CREATE OR REPLACE FUNCTION public.get_user_email_for_admin(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN 
      (SELECT email FROM auth.users WHERE id = target_user_id)
    ELSE NULL
  END
$$;