INSERT INTO public.admin_feature_flags (feature_key, feature_name, category, is_enabled, free_access, pro_access, trial_access, free_limit, pro_limit, trial_limit)
VALUES ('ai_assistant', 'AI Assistant', 'ai', true, true, true, true, null, null, null)
ON CONFLICT (feature_key) DO NOTHING;