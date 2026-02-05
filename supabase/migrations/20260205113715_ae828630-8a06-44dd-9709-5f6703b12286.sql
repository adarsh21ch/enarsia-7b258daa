-- Fix Security Definer View issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public_verified_users;

CREATE VIEW public_verified_users 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  city,
  verified_at
FROM user_kyc_submissions
WHERE status = 'approved';

-- Re-grant permissions
GRANT SELECT ON public_verified_users TO authenticated;
GRANT SELECT ON public_verified_users TO anon;