-- Create table for user's recurring daily task templates
CREATE TABLE public.user_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for daily completion status of user tasks
CREATE TABLE public.user_daily_task_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.user_daily_tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('yes', 'no')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id, date)
);

-- Enable RLS
ALTER TABLE public.user_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_task_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_daily_tasks
CREATE POLICY "Users can view their own daily tasks"
ON public.user_daily_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily tasks"
ON public.user_daily_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily tasks"
ON public.user_daily_tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily tasks"
ON public.user_daily_tasks FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_daily_task_status
CREATE POLICY "Users can view their own task status"
ON public.user_daily_task_status FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task status"
ON public.user_daily_task_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task status"
ON public.user_daily_task_status FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_daily_tasks_user_id ON public.user_daily_tasks(user_id);
CREATE INDEX idx_user_daily_task_status_user_date ON public.user_daily_task_status(user_id, date);
CREATE INDEX idx_user_daily_task_status_task_id ON public.user_daily_task_status(task_id);