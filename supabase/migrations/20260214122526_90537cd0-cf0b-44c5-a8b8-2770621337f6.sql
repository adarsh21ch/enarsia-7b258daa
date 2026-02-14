ALTER TABLE public.funnel_leads
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS custom_field_value TEXT,
  ADD COLUMN IF NOT EXISTS custom_field_label TEXT;