-- Allow team members (not just owners) to read schedules
-- User can see schedule if they are owner (manager) OR a member (member_submissions with user_id)

create policy "member_select_schedules" on public.schedules
  for select
  using (
    exists (
      select 1 from public.member_submissions
      where member_submissions.meeting_id = schedules.team_id
        and member_submissions.user_id = auth.uid()
    )
  );
