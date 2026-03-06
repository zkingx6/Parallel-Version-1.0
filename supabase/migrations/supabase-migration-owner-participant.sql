-- Migration: Manager as Participant (Owner)
-- Run in Supabase SQL Editor if you already have the base schema applied.

-- 1) Add column
alter table public.member_submissions
  add column if not exists is_owner_participant boolean not null default false;

-- 2) Partial unique index: at most one owner participant per meeting
create unique index if not exists idx_member_submissions_one_owner_per_meeting
  on public.member_submissions (meeting_id)
  where is_owner_participant = true;

-- 3) RLS: manager can insert their own owner participant row
create policy "manager_insert_owner_participant" on public.member_submissions
  for insert
  with check (
    is_owner_participant = true
    and exists (
      select 1 from public.meetings
      where meetings.id = member_submissions.meeting_id
        and meetings.manager_id = auth.uid()
    )
  );

-- 4) RLS: manager can update their own owner participant row
create policy "manager_update_owner_participant" on public.member_submissions
  for update
  using (
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
