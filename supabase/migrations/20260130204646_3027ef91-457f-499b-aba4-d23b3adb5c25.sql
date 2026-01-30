-- Add visibility and intent type columns
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'public';
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS intent_type TEXT DEFAULT 'lead_only';

-- Add lead form configuration
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS lead_form_config JSONB DEFAULT '{"name":{"enabled":true,"required":true},"phone":{"enabled":true,"required":false},"email":{"enabled":true,"required":false}}';

-- Add contact information columns
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add payment and thumbnail columns
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS razorpay_payment_link TEXT;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS thumbnail_object_key TEXT;