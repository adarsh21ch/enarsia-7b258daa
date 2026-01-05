-- =====================================================
-- PART 1: CREATE MISSING TO-DO TABLES
-- =====================================================
-- To-Do Day Highlights (admin-pinned tasks)
CREATE TABLE IF NOT EXISTS public.ac_todo_day_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_item_id uuid NOT NULL REFERENCES public.ac_todo_template_items(id) ON DELETE CASCADE,
  date date NOT NULL,
  highlight_title_override text,
  send_notification boolean NOT NULL DEFAULT false,
  group_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ac_todo_day_highlights ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: DROP AND RECREATE POLICIES
-- =====================================================
-- Drop existing policies for completions
DROP POLICY IF EXISTS "Users can view own completions" ON public.ac_todo_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.ac_todo_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON public.ac_todo_completions;

-- Drop existing policies for template items
DROP POLICY IF EXISTS "Members can view active items" ON public.ac_todo_template_items;
DROP POLICY IF EXISTS "Admins can manage template items" ON public.ac_todo_template_items;

-- Template Items: Members can view active items, admins can manage
CREATE POLICY "Members can view active items" ON public.ac_todo_template_items
  FOR SELECT USING (is_active = true AND (public.is_ac_member(auth.uid()) OR public.is_ac_admin(auth.uid())));

CREATE POLICY "Admins can manage template items" ON public.ac_todo_template_items
  FOR ALL USING (public.is_ac_admin(auth.uid()));

-- Completions: Users can manage their own
CREATE POLICY "Users can view own completions" ON public.ac_todo_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" ON public.ac_todo_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions" ON public.ac_todo_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- Day Highlights: Members can view, admins can manage
CREATE POLICY "Members can view highlights" ON public.ac_todo_day_highlights
  FOR SELECT USING (public.is_ac_member(auth.uid()) OR public.is_ac_admin(auth.uid()));

CREATE POLICY "Admins can manage highlights" ON public.ac_todo_day_highlights
  FOR ALL USING (public.is_ac_admin(auth.uid()));

-- =====================================================
-- PART 3: CREATE AC NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ac_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL,
  link_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ac_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.ac_notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.ac_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.ac_notifications;

CREATE POLICY "Users can view own notifications" ON public.ac_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications" ON public.ac_notifications
  FOR INSERT WITH CHECK (public.is_ac_admin(auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.ac_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';