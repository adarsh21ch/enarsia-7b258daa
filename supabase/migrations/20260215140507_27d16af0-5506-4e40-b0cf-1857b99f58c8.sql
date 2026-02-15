-- Allow form owners to delete submissions on their forms
CREATE POLICY "Owners can delete form submissions"
ON public.nevorai_form_submissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.nevorai_forms f
    WHERE f.id = nevorai_form_submissions.form_id
      AND f.owner_user_id = auth.uid()
  )
);

-- Allow deletion of answers for owned submissions
CREATE POLICY "Owners can delete submission answers"
ON public.nevorai_submission_answers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    JOIN public.nevorai_forms f ON f.id = s.form_id
    WHERE s.id = nevorai_submission_answers.submission_id
      AND f.owner_user_id = auth.uid()
  )
);

-- Allow deletion of attachments for owned submissions
CREATE POLICY "Owners can delete submission attachments"
ON public.nevorai_submission_attachments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.nevorai_form_submissions s
    JOIN public.nevorai_forms f ON f.id = s.form_id
    WHERE s.id = nevorai_submission_attachments.submission_id
      AND f.owner_user_id = auth.uid()
  )
);