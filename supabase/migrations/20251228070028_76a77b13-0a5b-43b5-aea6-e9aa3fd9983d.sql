-- =====================================================
-- COMMUNITY TABLES FOR APP SUPABASE
-- =====================================================

-- 1. CREATE ENUMS
CREATE TYPE public.community_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.membership_status AS ENUM ('active', 'blocked', 'left');
CREATE TYPE public.message_type AS ENUM ('text', 'media', 'system');
CREATE TYPE public.feed_post_type AS ENUM ('activity', 'achievement', 'system');
CREATE TYPE public.notification_type AS ENUM ('achievement', 'reminder', 'system', 'mention');

-- 2. SECURITY DEFINER FUNCTIONS (to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND status = 'active'::membership_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_memberships
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND status = 'active'::membership_status
      AND role IN ('owner'::community_role, 'admin'::community_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_learnup_resource(p_topic_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.learnup_topics t
    WHERE t.id = p_topic_id
      AND is_community_member(t.community_id, p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_admin_learnup_resource(p_topic_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.learnup_topics t
    WHERE t.id = p_topic_id
      AND is_community_admin(t.community_id, p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_reminder(p_reminder_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reminders r
    WHERE r.id = p_reminder_id
      AND is_community_member(r.community_id, p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_points_entry(p_competition_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = p_competition_id
      AND is_community_member(c.community_id, p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_admin_points_entry(p_competition_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = p_competition_id
      AND is_community_admin(c.community_id, p_user_id)
  );
END;
$$;

-- 3. COMMUNITIES TABLE
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  chat_mode text NOT NULL DEFAULT 'admins_only',
  created_by uuid NOT NULL,
  root_owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can check slug availability" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK ((auth.uid() = created_by) AND (auth.uid() = root_owner_user_id));
CREATE POLICY "Admins can update their community" ON public.communities FOR UPDATE USING (is_community_admin(id, auth.uid()));

-- 4. COMMUNITY MEMBERSHIPS TABLE
CREATE TABLE public.community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role community_role NOT NULL DEFAULT 'member',
  status membership_status NOT NULL DEFAULT 'active',
  upline_member_user_id uuid,
  upline_leader_id_text text,
  root_owner_user_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view community memberships" ON public.community_memberships FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Users can create their own membership" ON public.community_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update memberships" ON public.community_memberships FOR UPDATE USING (is_community_admin(community_id, auth.uid()));

-- 5. CHAT MESSAGES TABLE
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  body text,
  media_url text,
  message_type message_type NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chat messages" ON public.chat_messages FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Members can send chat messages" ON public.chat_messages FOR INSERT WITH CHECK (is_community_member(community_id, auth.uid()));

-- 6. FEED POSTS TABLE
CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  type feed_post_type NOT NULL DEFAULT 'activity',
  title text,
  body text,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view feed posts" ON public.feed_posts FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Admins can create feed posts" ON public.feed_posts FOR INSERT WITH CHECK (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can update feed posts" ON public.feed_posts FOR UPDATE USING (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can delete feed posts" ON public.feed_posts FOR DELETE USING (is_community_admin(community_id, auth.uid()));

-- 7. ACHIEVEMENTS TABLE
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  media_url text,
  achieved_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view achievements" ON public.achievements FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Admins can create achievements" ON public.achievements FOR INSERT WITH CHECK (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can update achievements" ON public.achievements FOR UPDATE USING (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can delete achievements" ON public.achievements FOR DELETE USING (is_community_admin(community_id, auth.uid()));

-- 8. COMMENTS TABLE
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Members can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- 9. REACTIONS TABLE
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT '👏',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_id, target_type, user_id)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Members can create reactions" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their reactions" ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- 11. REMINDERS TABLE
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  message text,
  remind_at timestamptz NOT NULL,
  expires_at timestamptz,
  rsvp_enabled boolean DEFAULT false,
  also_post_to_chat boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reminders" ON public.reminders FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Admins can create reminders" ON public.reminders FOR INSERT WITH CHECK (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can update reminders" ON public.reminders FOR UPDATE USING (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can delete reminders" ON public.reminders FOR DELETE USING (is_community_admin(community_id, auth.uid()));

-- 12. REMINDER RESPONSES TABLE
CREATE TABLE public.reminder_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reminder_id, user_id)
);

ALTER TABLE public.reminder_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reminder responses" ON public.reminder_responses FOR SELECT USING (can_access_reminder(reminder_id, auth.uid()));
CREATE POLICY "Members can respond to reminders" ON public.reminder_responses FOR INSERT WITH CHECK ((auth.uid() = user_id) AND can_access_reminder(reminder_id, auth.uid()));
CREATE POLICY "Members can update their responses" ON public.reminder_responses FOR UPDATE USING (auth.uid() = user_id);

-- 13. COMPETITIONS TABLE
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view competitions" ON public.competitions FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Admins can create competitions" ON public.competitions FOR INSERT WITH CHECK (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can update competitions" ON public.competitions FOR UPDATE USING (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can delete competitions" ON public.competitions FOR DELETE USING (is_community_admin(community_id, auth.uid()));

-- 14. POINTS ENTRIES TABLE
CREATE TABLE public.points_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.points_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view points entries" ON public.points_entries FOR SELECT USING (can_access_points_entry(competition_id, auth.uid()));
CREATE POLICY "Admins can create points entries" ON public.points_entries FOR INSERT WITH CHECK (can_admin_points_entry(competition_id, auth.uid()));
CREATE POLICY "Admins can delete points entries" ON public.points_entries FOR DELETE USING (can_admin_points_entry(competition_id, auth.uid()));

-- 15. LEARNUP TOPICS TABLE
CREATE TABLE public.learnup_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learnup_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view learnup topics" ON public.learnup_topics FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Admins can create learnup topics" ON public.learnup_topics FOR INSERT WITH CHECK (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can update learnup topics" ON public.learnup_topics FOR UPDATE USING (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can delete learnup topics" ON public.learnup_topics FOR DELETE USING (is_community_admin(community_id, auth.uid()));

-- 16. LEARNUP RESOURCES TABLE
CREATE TABLE public.learnup_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.learnup_topics(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  body text,
  media_url text,
  link_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learnup_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view learnup resources" ON public.learnup_resources FOR SELECT USING (can_access_learnup_resource(topic_id, auth.uid()));
CREATE POLICY "Admins can create learnup resources" ON public.learnup_resources FOR INSERT WITH CHECK (can_admin_learnup_resource(topic_id, auth.uid()));
CREATE POLICY "Admins can update learnup resources" ON public.learnup_resources FOR UPDATE USING (can_admin_learnup_resource(topic_id, auth.uid()));
CREATE POLICY "Admins can delete learnup resources" ON public.learnup_resources FOR DELETE USING (can_admin_learnup_resource(topic_id, auth.uid()));

-- 17. TRAININGS TABLE
CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  meeting_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view trainings" ON public.trainings FOR SELECT USING (is_community_member(community_id, auth.uid()));
CREATE POLICY "Admins can create trainings" ON public.trainings FOR INSERT WITH CHECK (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can update trainings" ON public.trainings FOR UPDATE USING (is_community_admin(community_id, auth.uid()));
CREATE POLICY "Admins can delete trainings" ON public.trainings FOR DELETE USING (is_community_admin(community_id, auth.uid()));

-- 18. CREATE STORAGE BUCKET FOR COMMUNITY MEDIA
INSERT INTO storage.buckets (id, name, public) VALUES ('community-media', 'community-media', true);

-- Storage policies
CREATE POLICY "Anyone can view community media" ON storage.objects FOR SELECT USING (bucket_id = 'community-media');
CREATE POLICY "Authenticated users can upload community media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'community-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their uploads" ON storage.objects FOR DELETE USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 19. ENABLE REALTIME FOR CHAT
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;