
-- Storage bucket for creator voice notes (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-audio', 'creator-audio', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects scoped to {user_id}/* prefix
DO $$ BEGIN
  CREATE POLICY "Creator audio: users read own"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'creator-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creator audio: users upload own"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'creator-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creator audio: users update own"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'creator-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creator audio: users delete own"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'creator-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-section audio fields on content_pieces
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS hook_audio_url text;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS body_audio_url text;
ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS cta_audio_url text;
