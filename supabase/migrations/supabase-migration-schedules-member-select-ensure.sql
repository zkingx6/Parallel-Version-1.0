-- Ensure member_select_schedules policy exists and is correct.
-- Run this in Supabase SQL Editor or via supabase db push.
--
-- Root cause: member_select_schedules may be missing or incorrect in production.
-- Verified: data and app logic are correct; RLS policy state was the blocker.

-- 1. Drop existing policy if present (handles wrong/corrupted version)
drop policy if exists "member_select_schedules" on public.schedules;

-- 2. Create correct policy: members see schedules when they have a member_submissions
--    row with meeting_id = schedules.team_id and user_id = auth.uid()
create policy "member_select_schedules" on public.schedules
  for select
  using (
    exists (
      select 1 from public.member_submissions
      where member_submissions.meeting_id = schedules.team_id
        and member_submissions.user_id = auth.uid()
    )
  );
