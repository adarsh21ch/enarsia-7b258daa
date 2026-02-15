CREATE POLICY "Owners can delete their funnel leads"
ON public.funnel_leads
FOR DELETE
USING (auth.uid() = owner_user_id);