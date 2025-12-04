-- Create a table for user-specific monthly targets
CREATE TABLE public.user_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL, -- e.g., 'Enrollment', 'Day 1', '2CC', etc.
  target_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type)
);

-- Enable Row Level Security
ALTER TABLE public.user_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own targets" 
ON public.user_targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own targets" 
ON public.user_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own targets" 
ON public.user_targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets" 
ON public.user_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_targets_updated_at
BEFORE UPDATE ON public.user_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();