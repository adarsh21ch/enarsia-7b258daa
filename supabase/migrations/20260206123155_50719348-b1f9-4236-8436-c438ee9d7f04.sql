
-- Add submitter_name column if missing
ALTER TABLE public.nevorai_form_submissions 
ADD COLUMN IF NOT EXISTS submitter_name text;

-- Also ensure submitter_user_id is nullable (for anonymous submissions)
ALTER TABLE public.nevorai_form_submissions 
ALTER COLUMN submitter_user_id DROP NOT NULL;

-- V2 columns on nevorai_form_submissions (idempotent)
ALTER TABLE public.nevorai_form_submissions 
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS utm_source text,
ADD COLUMN IF NOT EXISTS utm_medium text,
ADD COLUMN IF NOT EXISTS utm_campaign text,
ADD COLUMN IF NOT EXISTS utm_content text,
ADD COLUMN IF NOT EXISTS lead_id uuid,
ADD COLUMN IF NOT EXISTS lead_created boolean DEFAULT false;
