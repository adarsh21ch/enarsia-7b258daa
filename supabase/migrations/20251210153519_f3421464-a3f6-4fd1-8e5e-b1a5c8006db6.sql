-- Add is_filter_tag column to custom_options table
ALTER TABLE public.custom_options 
ADD COLUMN IF NOT EXISTS is_filter_tag boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.custom_options.is_filter_tag IS 'When true, prospects with this tag will appear in the Filter view';