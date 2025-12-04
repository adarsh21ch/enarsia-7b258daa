-- Create enum types for dropdowns
CREATE TYPE public.funnel_stage AS ENUM ('Enrollment', 'Day 1', 'Day 2', 'Day 3', 'Minimum Bill', 'Level Up');
CREATE TYPE public.action_taken AS ENUM ('Video Sent', 'Called', 'Not Picked', 'Busy', 'Follow Up Scheduled');
CREATE TYPE public.prospect_status AS ENUM ('+VE', '-VE', '50-50', '30-70');
CREATE TYPE public.priority_level AS ENUM ('High', 'Medium', 'Low');

-- Create prospects table
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  funnel_stage public.funnel_stage DEFAULT 'Enrollment',
  action_taken public.action_taken,
  prospect_status public.prospect_status,
  priority public.priority_level DEFAULT 'Medium',
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contact_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own prospects"
ON public.prospects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prospects"
ON public.prospects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prospects"
ON public.prospects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prospects"
ON public.prospects
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_prospects_user_id ON public.prospects(user_id);
CREATE INDEX idx_prospects_funnel_stage ON public.prospects(funnel_stage);
CREATE INDEX idx_prospects_prospect_status ON public.prospects(prospect_status);
CREATE INDEX idx_prospects_priority ON public.prospects(priority);