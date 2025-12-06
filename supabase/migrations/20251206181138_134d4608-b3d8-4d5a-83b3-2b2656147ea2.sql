-- Add explicit DENY policies for UPDATE and DELETE on activity_logs
-- This ensures audit trail integrity cannot be compromised

CREATE POLICY "Deny update on activity logs"
ON public.activity_logs
FOR UPDATE
USING (false);

CREATE POLICY "Deny delete on activity logs"
ON public.activity_logs
FOR DELETE
USING (false);