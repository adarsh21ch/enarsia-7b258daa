
-- Enarsia Academy tables

create table if not exists public.academy_tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  video_url text not null default '',
  thumbnail_url text,
  category text not null default 'getting-started',
  order_index integer not null default 0,
  duration_seconds integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academy_tutorials_order
  on public.academy_tutorials (category, order_index);
create index if not exists idx_academy_tutorials_published
  on public.academy_tutorials (is_published);

grant select on public.academy_tutorials to anon;
grant select, insert, update, delete on public.academy_tutorials to authenticated;
grant all on public.academy_tutorials to service_role;

alter table public.academy_tutorials enable row level security;

drop policy if exists "Public can read published tutorials" on public.academy_tutorials;
create policy "Public can read published tutorials"
  on public.academy_tutorials for select
  using (is_published = true);

drop policy if exists "Admins read all tutorials" on public.academy_tutorials;
create policy "Admins read all tutorials"
  on public.academy_tutorials for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins insert tutorials" on public.academy_tutorials;
create policy "Admins insert tutorials"
  on public.academy_tutorials for insert
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update tutorials" on public.academy_tutorials;
create policy "Admins update tutorials"
  on public.academy_tutorials for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete tutorials" on public.academy_tutorials;
create policy "Admins delete tutorials"
  on public.academy_tutorials for delete
  using (public.has_role(auth.uid(), 'admin'));

-- Completion tracking
create table if not exists public.academy_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  tutorial_id uuid not null references public.academy_tutorials(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, tutorial_id)
);

grant select, insert, delete on public.academy_completions to authenticated;
grant all on public.academy_completions to service_role;

alter table public.academy_completions enable row level security;

drop policy if exists "Users read own completions" on public.academy_completions;
create policy "Users read own completions"
  on public.academy_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own completions" on public.academy_completions;
create policy "Users write own completions"
  on public.academy_completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own completions" on public.academy_completions;
create policy "Users delete own completions"
  on public.academy_completions for delete
  using (auth.uid() = user_id);

-- Category ordering
create table if not exists public.academy_category_order (
  category text primary key,
  label text not null default '',
  order_index int not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.academy_category_order to anon;
grant select, insert, update, delete on public.academy_category_order to authenticated;
grant all on public.academy_category_order to service_role;

alter table public.academy_category_order enable row level security;

drop policy if exists "Anyone read category order" on public.academy_category_order;
create policy "Anyone read category order"
  on public.academy_category_order for select using (true);

drop policy if exists "Admins manage category order" on public.academy_category_order;
create policy "Admins manage category order"
  on public.academy_category_order for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.touch_academy_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_academy_tutorials on public.academy_tutorials;
create trigger trg_touch_academy_tutorials
  before update on public.academy_tutorials
  for each row execute function public.touch_academy_updated_at();

-- Seed categories (CRM context)
insert into public.academy_category_order (category, label, order_index) values
  ('getting-started', 'Getting Started', 1),
  ('calling',         'Calling',          2),
  ('forms',           'Forms',            3),
  ('follow-up',       'Follow-Up',        4),
  ('to-do',           'To-Do',            5),
  ('trackup',         'TrackUp',          6),
  ('appointments',    'Appointments',     7),
  ('billing',         'Billing & Plans',  8),
  ('advanced',        'Advanced',         9)
on conflict (category) do update set
  label = excluded.label,
  order_index = excluded.order_index;

-- Placeholder tutorials
insert into public.academy_tutorials (title, slug, description, category, order_index, duration_seconds, is_published)
values
  ('Welcome to Enarsia — Quick start', 'welcome-to-enarsia', 'A quick walkthrough of the Enarsia CRM and how to set yourself up for success.', 'getting-started', 1, 0, true),
  ('Make your first call', 'make-your-first-call', 'Learn how to use the Calling tab to track every prospect call.', 'calling', 1, 0, true),
  ('Build your first form', 'build-your-first-form', 'Capture leads automatically with Enarsia Forms.', 'forms', 1, 0, true),
  ('Set up follow-up reminders', 'setup-follow-up-reminders', 'Never miss a follow-up — set reminders and stay consistent.', 'follow-up', 1, 0, true),
  ('Manage your to-do list', 'manage-your-to-do-list', 'Master daily tasks and build a productive routine.', 'to-do', 1, 0, true)
on conflict (slug) do nothing;
