-- Add delete policy for schedules (owner can delete their team's schedules)

create policy "owner_delete_schedules" on public.schedules
  for delete
  using (
    exists (
      select 1 from public.meetings
      where meetings.id = schedules.team_id
        and meetings.manager_id = auth.uid()
    )
  );
