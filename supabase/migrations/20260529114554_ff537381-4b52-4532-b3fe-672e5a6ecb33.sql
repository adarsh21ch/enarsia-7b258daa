-- Drop ambiguous overload of nevorai_submit_form (the json-returning variant).
-- Two overloads with identical client-callable parameter names caused PostgREST
-- PGRST203 ambiguity errors, breaking all public form submissions. We keep the
-- jsonb-returning variant which has p_attachments_json DEFAULT '[]'.
DROP FUNCTION IF EXISTS public.nevorai_submit_form(
  p_form_id uuid,
  p_token text,
  p_share_token text,
  p_submitter_name text,
  p_submitter_email text,
  p_answers jsonb,
  p_answers_json jsonb,
  p_attachments_json jsonb,
  p_source text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text
);