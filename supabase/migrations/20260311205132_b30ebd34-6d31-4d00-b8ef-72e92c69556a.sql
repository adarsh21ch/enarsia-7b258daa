ALTER TABLE public.funnels
ADD COLUMN IF NOT EXISTS show_contact_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_contact_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_contact_instagram BOOLEAN DEFAULT true;