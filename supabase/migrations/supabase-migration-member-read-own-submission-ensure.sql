-- Ensure member_read_own_submission policy exists (idempotent for env rebuild).
-- Required for schedules.member_select_schedules EXISTS subquery.

drop policy if exists "member_read_own_submission" on public.member_submissions;
drop policy if exists "member_select_own_submission" on public.member_submissions;

create policy "member_read_own_submission"
  on public.member_submissions
  for select
  using (user_id = auth.uid());
