-- Per-user professions the user has chosen/added (Modes architecture).
-- Everyone starts with just the base profession (network_marketing). Adding a
-- profession (e.g. content_creator) from Profile appends to this array; the
-- active one lives in profiles.mode.
alter table public.profiles
  add column if not exists enabled_modes text[] not null default '{network_marketing}';

comment on column public.profiles.enabled_modes is 'Professions the user has chosen/added; always includes network_marketing.';
