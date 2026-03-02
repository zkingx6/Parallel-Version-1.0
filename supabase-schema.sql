-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Base schema for meetings and member_submissions

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Team Meeting',
  day_of_week int not null default 2,
  duration_minutes int not null default 60,
  rotation_weeks int not null default 8,
  anchor_offset float not null default -5,
  invite_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.member_submissions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  name text not null,
  timezone_offset float not null default 0,
  work_start_hour int not null default 9,
  work_end_hour int not null default 18,
  hard_no_ranges jsonb not null default '[]'::jsonb,
  role text,
  is_owner_participant boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meetings_invite_token on public.meetings(invite_token);
create unique index if not exists idx_member_submissions_one_owner_per_meeting
  on public.member_submissions (meeting_id)
  where is_owner_participant = true;

alter table public.meetings enable row level security;
alter table public.member_submissions enable row level security;

create policy "manager_all" on public.meetings
  for all using (auth.uid() = manager_id);

create policy "manager_read_submissions" on public.member_submissions
  for select using (
    exists (
      select 1 from public.meetings
      where meetings.id = member_submissions.meeting_id
        and meetings.manager_id = auth.uid()
    )
  );

create policy "manager_delete_submissions" on public.member_submissions
  for delete using (
    exists (
      select 1 from public.meetings
      where meetings.id = member_submissions.meeting_id
        and meetings.manager_id = auth.uid()
    )
  );

create policy "manager_insert_owner_participant" on public.member_submissions
  for insert with check (
    is_owner_participant = true
    and exists (
      select 1 from public.meetings
      where meetings.id = member_submissions.meeting_id
        and meetings.manager_id = auth.uid()
    )
  );

create policy "manager_update_owner_participant" on public.member_submissions
  for update using (
    is_owner_participant = true
    and exists (
      select 1 from public.meetings
      where meetings.id = member_submissions.meeting_id
        and meetings.manager_id = auth.uid()
    )
  )
  with check (
    is_owner_participant = true
    and exists (
      select 1 from public.meetings
      where meetings.id = member_submissions.meeting_id
        and meetings.manager_id = auth.uid()
    )
  );
