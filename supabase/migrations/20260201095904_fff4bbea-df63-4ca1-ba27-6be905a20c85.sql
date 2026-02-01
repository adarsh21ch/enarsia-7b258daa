-- Grant anonymous users permission to call form RPCs
GRANT EXECUTE ON FUNCTION public.nevorai_submit_form(text, jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.nevorai_get_form_by_token(text) TO anon;