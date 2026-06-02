UPDATE public.admin_branding
SET app_name = 'Enarsia',
    short_name = 'Enarsia',
    tagline = 'Your personal CRM for network marketers',
    updated_at = now()
WHERE id = 1;