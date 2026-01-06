-- Add source_app column to track where profiles were provisioned from
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS source_app TEXT;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_source_app ON public.profiles(source_app);