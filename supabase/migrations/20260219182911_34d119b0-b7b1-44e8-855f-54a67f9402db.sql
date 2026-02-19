
ALTER TABLE public.course_leads
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.courses
  ALTER COLUMN lead_form_fields SET DEFAULT '{"name":true,"phone":true,"email":false,"city":false,"state":false}'::jsonb;
