
-- =============================================
-- ACHIEVERS CLUB INTEGRATION - CORRECTED VERSION
-- =============================================

-- =============================================
-- STEP 1: Create Achievers Club Community Entry
-- =============================================

-- First, get the owner's user_id and create community
DO $$
DECLARE
  v_owner_id UUID;
  v_community_uuid UUID := gen_random_uuid();
BEGIN
  SELECT user_id INTO v_owner_id FROM profiles WHERE email = 'krishnaaroraflp@gmail.com' LIMIT 1;
  
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO communities (id, community_id, slug, name, description, created_by, root_owner_user_id)
    VALUES (
      v_community_uuid,
      'achievers-club',
      'achievers-club',
      'Achievers Club',
      'Achievers Club Community - Powered by NevorAI',
      v_owner_id,
      v_owner_id
    )
    ON CONFLICT (slug) DO NOTHING;
    
    -- Add owner membership
    INSERT INTO community_memberships (community_id, user_id, role, status)
    VALUES (v_community_uuid, v_owner_id, 'owner', 'active')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =============================================
-- STEP 2: Create Helper Functions for RLS
-- =============================================

-- Check if user is an active AC community member
CREATE OR REPLACE FUNCTION public.is_ac_member(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.communities c ON c.id = cm.community_id
    WHERE cm.user_id = user_uuid
    AND c.community_id = 'achievers-club'
    AND cm.status = 'active'
  );
$$;

-- Check if user is an AC admin (owner or admin role in community)
CREATE OR REPLACE FUNCTION public.is_ac_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_memberships cm
    JOIN public.communities c ON c.id = cm.community_id
    WHERE cm.user_id = user_uuid
    AND c.community_id = 'achievers-club'
    AND cm.role IN ('owner', 'admin')
    AND cm.status = 'active'
  );
$$;

-- =============================================
-- STEP 3: Create AC Announcements Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ac_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AC members can view announcements" ON public.ac_announcements FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC admins can insert announcements" ON public.ac_announcements FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update announcements" ON public.ac_announcements FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete announcements" ON public.ac_announcements FOR DELETE USING (is_ac_admin(auth.uid()));

-- =============================================
-- STEP 4: Create AC Chat Messages Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL DEFAULT 'community',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  attachments_json JSONB,
  reply_to_id UUID REFERENCES public.ac_chat_messages(id),
  poll_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  mentioned_user_ids UUID[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ac_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ac_chat_messages;

CREATE POLICY "AC members can read chat" ON public.ac_chat_messages FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC members can create chat" ON public.ac_chat_messages FOR INSERT WITH CHECK (is_ac_member(auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.ac_chat_messages FOR UPDATE USING (auth.uid() = user_id OR is_ac_admin(auth.uid()));

-- =============================================
-- STEP 5: Create AC Chat Read Status Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_chat_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  room_id TEXT NOT NULL DEFAULT 'community',
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_message_id UUID REFERENCES public.ac_chat_messages(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_id)
);

ALTER TABLE public.ac_chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own status" ON public.ac_chat_read_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own status" ON public.ac_chat_read_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own status" ON public.ac_chat_read_status FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- STEP 6: Create AC Polls Tables
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_chat_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ac_chat_poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.ac_chat_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ac_chat_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.ac_chat_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.ac_chat_poll_options(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

ALTER TABLE public.ac_chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_chat_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AC members can read polls" ON public.ac_chat_polls FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC admins can create polls" ON public.ac_chat_polls FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update polls" ON public.ac_chat_polls FOR UPDATE USING (is_ac_admin(auth.uid()));

CREATE POLICY "AC members can read poll options" ON public.ac_chat_poll_options FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC admins can insert poll options" ON public.ac_chat_poll_options FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update poll options" ON public.ac_chat_poll_options FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete poll options" ON public.ac_chat_poll_options FOR DELETE USING (is_ac_admin(auth.uid()));

CREATE POLICY "AC members can read votes" ON public.ac_chat_poll_votes FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC members can vote" ON public.ac_chat_poll_votes FOR INSERT WITH CHECK (is_ac_member(auth.uid()) AND auth.uid() = voter_id);
CREATE POLICY "Users can update own vote" ON public.ac_chat_poll_votes FOR UPDATE USING (auth.uid() = voter_id);

-- =============================================
-- STEP 7: Create AC Events Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  link TEXT,
  host_name TEXT,
  category TEXT DEFAULT 'meeting',
  visibility TEXT NOT NULL DEFAULT 'members',
  capacity INTEGER,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.ac_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AC members can view events" ON public.ac_events FOR SELECT USING (is_ac_member(auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "AC admins can insert events" ON public.ac_events FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update events" ON public.ac_events FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete events" ON public.ac_events FOR DELETE USING (is_ac_admin(auth.uid()));

-- =============================================
-- STEP 8: Create AC Event RSVPs Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.ac_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'going',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.ac_event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AC members can view RSVPs" ON public.ac_event_rsvps FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC members can RSVP" ON public.ac_event_rsvps FOR INSERT WITH CHECK (is_ac_member(auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Users can update own RSVP" ON public.ac_event_rsvps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own RSVP" ON public.ac_event_rsvps FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- STEP 9: Create AC Todo Tables
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_todo_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  group_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ac_todo_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.ac_todo_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ac_todo_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_item_id UUID NOT NULL REFERENCES public.ac_todo_template_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_item_id, date)
);

ALTER TABLE public.ac_todo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_todo_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_todo_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AC members can view templates" ON public.ac_todo_templates FOR SELECT USING (is_ac_member(auth.uid()) AND active = true);
CREATE POLICY "AC admins can insert templates" ON public.ac_todo_templates FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update templates" ON public.ac_todo_templates FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete templates" ON public.ac_todo_templates FOR DELETE USING (is_ac_admin(auth.uid()));

CREATE POLICY "AC members can view template items" ON public.ac_todo_template_items FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC admins can insert template items" ON public.ac_todo_template_items FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update template items" ON public.ac_todo_template_items FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete template items" ON public.ac_todo_template_items FOR DELETE USING (is_ac_admin(auth.uid()));

CREATE POLICY "Users can view own completions" ON public.ac_todo_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.ac_todo_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own completions" ON public.ac_todo_completions FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- STEP 10: Create AC Resources Tables
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_resource_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ac_resource_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.ac_resource_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ac_resource_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_resource_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AC members can view resource groups" ON public.ac_resource_groups FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC admins can insert resource groups" ON public.ac_resource_groups FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update resource groups" ON public.ac_resource_groups FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete resource groups" ON public.ac_resource_groups FOR DELETE USING (is_ac_admin(auth.uid()));

CREATE POLICY "AC members can view resource items" ON public.ac_resource_items FOR SELECT USING (is_ac_member(auth.uid()));
CREATE POLICY "AC admins can insert resource items" ON public.ac_resource_items FOR INSERT WITH CHECK (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can update resource items" ON public.ac_resource_items FOR UPDATE USING (is_ac_admin(auth.uid()));
CREATE POLICY "AC admins can delete resource items" ON public.ac_resource_items FOR DELETE USING (is_ac_admin(auth.uid()));

-- =============================================
-- STEP 11: Create AC Notifications Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.ac_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  announcement_id UUID REFERENCES public.ac_announcements(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ac_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.ac_notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can create notifications" ON public.ac_notifications FOR INSERT WITH CHECK (is_ac_admin(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.ac_notifications FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- STEP 12: Create Storage Buckets
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('ac-chat-attachments', 'ac-chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ac-announcements', 'ac-announcements', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ac-resources', 'ac-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "AC members can upload chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ac-chat-attachments' AND is_ac_member(auth.uid()));
CREATE POLICY "AC members can view chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ac-chat-attachments' AND is_ac_member(auth.uid()));

CREATE POLICY "AC announcements are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'ac-announcements');
CREATE POLICY "AC admins can upload announcements" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ac-announcements' AND is_ac_admin(auth.uid()));

CREATE POLICY "AC members can view resources" ON storage.objects FOR SELECT USING (bucket_id = 'ac-resources' AND is_ac_member(auth.uid()));
CREATE POLICY "AC admins can upload resources" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ac-resources' AND is_ac_admin(auth.uid()));
