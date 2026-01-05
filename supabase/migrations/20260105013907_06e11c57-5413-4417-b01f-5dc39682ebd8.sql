-- Create ac_announcement_media table for multiple media per announcement
CREATE TABLE public.ac_announcement_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.ac_announcements(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ac_announcement_media ENABLE ROW LEVEL SECURITY;

-- RLS policies - same access as announcements
CREATE POLICY "AC members can view announcement media"
ON public.ac_announcement_media
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ac_announcements a 
  WHERE a.id = announcement_id AND is_ac_member(auth.uid())
));

CREATE POLICY "AC admins can insert announcement media"
ON public.ac_announcement_media
FOR INSERT
WITH CHECK (is_ac_admin(auth.uid()));

CREATE POLICY "AC admins can update announcement media"
ON public.ac_announcement_media
FOR UPDATE
USING (is_ac_admin(auth.uid()));

CREATE POLICY "AC admins can delete announcement media"
ON public.ac_announcement_media
FOR DELETE
USING (is_ac_admin(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_ac_announcement_media_announcement_id ON public.ac_announcement_media(announcement_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';