-- Create schedules table for published rotation plans
-- Each schedule belongs to a team (meeting) and stores the rotation result.

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.meetings(id) on delete cascade,
  name text not null,
  rotation_result jsonb not null,
  weeks int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedules_team_id on public.schedules(team_id);
create index if not exists idx_schedules_created_at on public.schedules(created_at desc);

-- RLS: owner can manage schedules for their teams
alter table public.schedules enable row level security;

create policy "owner_select_schedules" on public.schedules
  for select
  using (
    exists (
      select 1 from public.meetings
      where meetings.id = schedules.team_id
        and meetings.manager_id = auth.uid()
    )
  );

create policy "owner_insert_schedules" on public.schedules
  for insert
  with check (
    exists (
      select 1 from public.meetings
      where meetings.id = schedules.team_id
        and meetings.manager_id = auth.uid()
    )
  );
