-- Create funnel_tracking table for tracking funnel stages
CREATE TABLE public.funnel_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  funnel_number INTEGER NOT NULL,
  day_1 INTEGER DEFAULT 0,
  day_2 INTEGER DEFAULT 0,
  minimum_billing INTEGER DEFAULT 0,
  level_up INTEGER DEFAULT 0,
  two_cc INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, funnel_number)
);

-- Create daily_leads table for tracking daily leads metrics
CREATE TABLE public.daily_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  leads INTEGER DEFAULT 0,
  calls INTEGER DEFAULT 0,
  videos INTEGER DEFAULT 0,
  enrolls INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_year, day_number)
);

-- Enable Row Level Security
ALTER TABLE public.funnel_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for funnel_tracking
CREATE POLICY "Users can view their own funnel tracking" 
ON public.funnel_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funnel tracking" 
ON public.funnel_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnel tracking" 
ON public.funnel_tracking 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnel tracking" 
ON public.funnel_tracking 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for daily_leads
CREATE POLICY "Users can view their own daily leads" 
ON public.daily_leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily leads" 
ON public.daily_leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily leads" 
ON public.daily_leads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily leads" 
ON public.daily_leads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_funnel_tracking_updated_at
BEFORE UPDATE ON public.funnel_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_leads_updated_at
BEFORE UPDATE ON public.daily_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();