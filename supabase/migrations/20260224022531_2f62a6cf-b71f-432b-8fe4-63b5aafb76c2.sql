ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS audio_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_play_position text DEFAULT 'before',
  ADD COLUMN IF NOT EXISTS audio_autoplay boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS audio_lock_video boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_skip_allowed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS audio_show_player boolean DEFAULT true;