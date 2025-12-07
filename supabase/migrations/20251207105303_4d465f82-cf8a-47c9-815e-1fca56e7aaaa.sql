-- Create funnel_configs table for user-defined funnels
CREATE TABLE public.funnel_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  funnel_name TEXT NOT NULL,
  funnel_length INTEGER NOT NULL DEFAULT 3,
  day_1_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnel_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own funnel configs"
ON public.funnel_configs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funnel configs"
ON public.funnel_configs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnel configs"
ON public.funnel_configs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnel configs"
ON public.funnel_configs
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_funnel_configs_updated_at
BEFORE UPDATE ON public.funnel_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();