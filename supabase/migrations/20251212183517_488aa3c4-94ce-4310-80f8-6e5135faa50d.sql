-- Create leader_levels table for flexible level definitions per leader
CREATE TABLE public.leader_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  code TEXT,
  label TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add level_id to profiles table
ALTER TABLE public.profiles ADD COLUMN level_id UUID REFERENCES public.leader_levels(id) ON DELETE SET NULL;

-- Enable RLS on leader_levels
ALTER TABLE public.leader_levels ENABLE ROW LEVEL SECURITY;

-- Leaders can view their own levels
CREATE POLICY "Leaders can view their own levels" 
ON public.leader_levels 
FOR SELECT 
USING (auth.uid() = leader_id);

-- Leaders can create their own levels
CREATE POLICY "Leaders can create their own levels" 
ON public.leader_levels 
FOR INSERT 
WITH CHECK (auth.uid() = leader_id);

-- Leaders can update their own levels
CREATE POLICY "Leaders can update their own levels" 
ON public.leader_levels 
FOR UPDATE 
USING (auth.uid() = leader_id);

-- Leaders can delete their own levels
CREATE POLICY "Leaders can delete their own levels" 
ON public.leader_levels 
FOR DELETE 
USING (auth.uid() = leader_id);

-- Members can view levels of their leader (for dropdown display)
CREATE POLICY "Members can view their leader's levels" 
ON public.leader_levels 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.profiles leader_p ON UPPER(leader_p.neverai_id) = UPPER(p.leaders_id_of_my_leader)
    WHERE p.user_id = auth.uid()
    AND leader_p.user_id = leader_levels.leader_id
  )
);

-- Create index for faster queries
CREATE INDEX idx_leader_levels_leader_id ON public.leader_levels(leader_id);
CREATE INDEX idx_profiles_level_id ON public.profiles(level_id);

-- Create function to get or create default level for a leader
CREATE OR REPLACE FUNCTION public.get_or_create_default_level(p_leader_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level_id UUID;
BEGIN
  -- Try to find existing default level
  SELECT id INTO v_level_id
  FROM public.leader_levels
  WHERE leader_id = p_leader_user_id AND is_default = true
  LIMIT 1;
  
  -- If no default level exists, create one
  IF v_level_id IS NULL THEN
    INSERT INTO public.leader_levels (leader_id, position, code, label, is_default)
    VALUES (p_leader_user_id, 1, 'L1', 'Level 1', true)
    RETURNING id INTO v_level_id;
  END IF;
  
  RETURN v_level_id;
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_leader_levels_updated_at
BEFORE UPDATE ON public.leader_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();