-- Migration: availability_templates
-- Run in Supabase SQL Editor. Creates table for user default availability templates.
-- Does not modify member_submissions or rotation logic.

create table if not exists public.availability_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Default',
  is_default boolean not null default true,
  timezone text not null default 'America/New_York',
  weekly_hours jsonb not null default '{"sun":[],"mon":[{"start":"09:00","end":"18:00"}],"tue":[{"start":"09:00","end":"18:00"}],"wed":[{"start":"09:00","end":"18:00"}],"thu":[{"start":"09:00","end":"18:00"}],"fri":[{"start":"09:00","end":"18:00"}],"sat":[]}'::jsonb,
  weekly_hard_no jsonb not null default '{"sun":[],"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_availability_templates_one_default_per_user
  on public.availability_templates (user_id)
  where is_default = true;

create index if not exists idx_availability_templates_user_id on public.availability_templates(user_id);

alter table public.availability_templates enable row level security;

-- User can read only their own templates
create policy "user_select_own_templates" on public.availability_templates
  for select using (auth.uid() = user_id);

-- User can insert only for themselves
create policy "user_insert_own_templates" on public.availability_templates
  for insert with check (auth.uid() = user_id);

-- User can update only their own templates
create policy "user_update_own_templates" on public.availability_templates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User can delete only their own templates (but Default should not be deleted in app logic)
create policy "user_delete_own_templates" on public.availability_templates
  for delete using (auth.uid() = user_id);
