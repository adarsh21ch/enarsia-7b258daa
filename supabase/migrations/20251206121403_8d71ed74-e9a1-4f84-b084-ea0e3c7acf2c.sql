-- Add missing columns for prospect tracking fields
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS funnel_stage text,
ADD COLUMN IF NOT EXISTS action_taken text,
ADD COLUMN IF NOT EXISTS prospect_status text,
ADD COLUMN IF NOT EXISTS priority text;