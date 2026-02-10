ALTER TABLE public.funnels
ADD COLUMN IF NOT EXISTS whatsapp_auto_message_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_auto_message text;