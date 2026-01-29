-- Add trial_start_date column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone DEFAULT NULL;