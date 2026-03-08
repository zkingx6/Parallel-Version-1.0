-- Profiles table: canonical source for user display name and avatar.
-- Auth user / profiles are the single source of truth. member_submissions is NOT.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_updated_at on public.profiles(updated_at);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can insert their own profile (on signup)
create policy "users_insert_own_profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Service role can read all profiles (for schedule/member display)
-- RLS still applies; service role bypasses RLS by default when using service key

comment on table public.profiles is
  'Canonical user profile. Display name and avatar come from here (or auth), not member_submissions.';
