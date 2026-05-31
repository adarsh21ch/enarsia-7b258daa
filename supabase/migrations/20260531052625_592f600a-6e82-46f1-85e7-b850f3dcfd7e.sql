
-- Content accounts (multi-platform handles)
CREATE TABLE IF NOT EXISTS public.content_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram',
  name text NOT NULL,
  username text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_accounts_user_id_idx ON public.content_accounts(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_accounts TO authenticated;
GRANT ALL ON public.content_accounts TO service_role;

ALTER TABLE public.content_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own content_accounts" ON public.content_accounts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users insert own content_accounts" ON public.content_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users update own content_accounts" ON public.content_accounts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users delete own content_accounts" ON public.content_accounts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS set_content_accounts_updated_at ON public.content_accounts;
CREATE TRIGGER set_content_accounts_updated_at BEFORE UPDATE ON public.content_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Content categories
CREATE TABLE IF NOT EXISTS public.content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_categories_user_id_idx ON public.content_categories(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_categories TO authenticated;
GRANT ALL ON public.content_categories TO service_role;

ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own content_categories" ON public.content_categories FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users insert own content_categories" ON public.content_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users update own content_categories" ON public.content_categories FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users delete own content_categories" ON public.content_categories FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend content_ideas
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.content_categories(id) ON DELETE SET NULL;
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS context_note text;
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.content_accounts(id) ON DELETE SET NULL;

-- Extend content_pieces
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS hook_text text;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS body_text text;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS cta_text text;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS posted_date date;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.content_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS title text;
