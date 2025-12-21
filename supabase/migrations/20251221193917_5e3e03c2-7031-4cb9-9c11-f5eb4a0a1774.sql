-- Create todo_template_items table (reusable checklist items per level)
CREATE TABLE public.todo_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL,
  level_position integer NOT NULL,
  template_name text NOT NULL DEFAULT 'Todo Template',
  item_title text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create todo_daily_task_status table (daily date-wise saved answers)
CREATE TABLE public.todo_daily_task_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  template_item_id uuid NOT NULL REFERENCES public.todo_template_items(id) ON DELETE CASCADE,
  status text NULL CHECK (status IS NULL OR status IN ('yes', 'no')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint for upsert on todo_daily_task_status
ALTER TABLE public.todo_daily_task_status 
ADD CONSTRAINT todo_daily_task_status_user_date_item_unique 
UNIQUE (user_id, date, template_item_id);

-- Create indexes for performance
CREATE INDEX idx_todo_template_items_leader_level ON public.todo_template_items(leader_id, level_position);
CREATE INDEX idx_todo_daily_task_status_user_date ON public.todo_daily_task_status(user_id, date);

-- Enable Row Level Security on both tables
ALTER TABLE public.todo_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_daily_task_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for todo_template_items (leader owns templates)
CREATE POLICY "Leaders can view their own templates"
ON public.todo_template_items
FOR SELECT
USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can create their own templates"
ON public.todo_template_items
FOR INSERT
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their own templates"
ON public.todo_template_items
FOR UPDATE
USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their own templates"
ON public.todo_template_items
FOR DELETE
USING (auth.uid() = leader_id);

-- Members can view templates from their leader (read-only)
CREATE POLICY "Members can view their leader's templates"
ON public.todo_template_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.profiles leader_p ON (
      UPPER(leader_p.neverai_id) = UPPER(p.leaders_id_of_my_leader) 
      OR UPPER(leader_p.neverai_id) = UPPER(p.root_leader_id)
    )
    WHERE p.user_id = auth.uid() 
    AND leader_p.user_id = todo_template_items.leader_id
  )
);

-- RLS policies for todo_daily_task_status (user owns their status)
CREATE POLICY "Users can view their own daily task status"
ON public.todo_daily_task_status
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily task status"
ON public.todo_daily_task_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily task status"
ON public.todo_daily_task_status
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily task status"
ON public.todo_daily_task_status
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at on todo_template_items
CREATE TRIGGER update_todo_template_items_updated_at
BEFORE UPDATE ON public.todo_template_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on todo_daily_task_status
CREATE TRIGGER update_todo_daily_task_status_updated_at
BEFORE UPDATE ON public.todo_daily_task_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();