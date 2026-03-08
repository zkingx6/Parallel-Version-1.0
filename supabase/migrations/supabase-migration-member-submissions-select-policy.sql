-- Allow members to SELECT their own member_submissions row.
--
-- RLS DEPENDENCY: schedules.member_select_schedules uses an EXISTS subquery
-- against member_submissions. That subquery runs with RLS applied. Without
-- a SELECT policy here, members cannot read their own row, EXISTS evaluates
-- false, and schedules are hidden. Owner could see (owner_select_schedules),
-- member could not. Policy name may be member_read_own_submission in prod.
--
alter table public.member_submissions enable row level security;

create policy "member_select_own_submission" on public.member_submissions
  for select
  using (user_id = auth.uid());
