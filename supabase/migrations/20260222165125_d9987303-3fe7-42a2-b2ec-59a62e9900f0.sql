CREATE POLICY "Receivers can delete shared leads"
ON public.shared_leads
FOR DELETE
USING (auth.uid() = receiver_id);