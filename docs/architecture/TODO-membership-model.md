# TODO: Membership Model Refactor

## Current State (MVP)

Schedule visibility for members is determined via `member_submissions.user_id`:

- When a member joins/updates availability while logged in, we set `user_id` on their `member_submissions` row
- RLS policy `member_select_schedules` allows SELECT when `member_submissions.user_id = auth.uid()` for that team

This works for the MVP because joining the team requires submitting availability.

## Problem

`member_submissions` represents **availability data** (timezone, working hours, hard boundaries), not **membership**.

Conflating the two causes:

- Members who joined without logging in cannot see schedules until they re-submit while logged in
- No clean way to represent "member of team" without availability data
- Future features (e.g. invite-only members, read-only access) may need membership without submission

## Target State

### 1. Dedicated `team_members` table

```sql
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);
```

### 2. Populate `team_members`

- **Owners**: When creating a meeting, insert `(manager_id, meeting_id)`
- **Members**: When joining via invite (token + memberId), if user is logged in, insert `(user_id, meeting_id)`
- **Backfill**: Migrate existing `member_submissions` where `user_id` is not null to `team_members`

### 3. Update RLS policies

- **schedules**: Replace `member_select_schedules` to reference `team_members` instead of `member_submissions`:

```sql
-- Replace member_select_schedules
create policy "member_select_schedules" on public.schedules
  for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = schedules.team_id
        and team_members.user_id = auth.uid()
    )
  );
```

### 4. Remove `user_id` from `member_submissions`

After migration, `member_submissions` can drop `user_id` and rely on `member_submissions.id` (memberId) for the join flow. The link between auth user and membership lives in `team_members`.

## Migration Order

1. Create `team_members` table
2. Add RLS policies for `team_members`
3. Backfill from `meetings` (owners) and `member_submissions` (where user_id exists)
4. Add new `member_select_schedules` policy referencing `team_members`
5. Drop old `member_select_schedules` policy (if it referenced member_submissions)
6. Update join/update flows to insert into `team_members` when user is logged in
7. (Optional) Remove `user_id` from `member_submissions` after confirming no other usages

## Do Not Modify

- rotation engine
- fairness logic
- timezone system
- schedule storage format
