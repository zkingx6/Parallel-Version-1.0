# Member Schedule Visibility — End-to-End Audit

## Query Path

| Step | File | What Happens |
|------|------|--------------|
| 1 | `app/member-dashboard/page.tsx` (client) | When `tab=schedule`, renders `ScheduleTab` |
| 2 | `ScheduleTab` (line 199-206) | `useEffect` calls `getSchedulesForCurrentUser()` |
| 3 | `lib/actions.ts` → `getSchedulesForCurrentUser()` | Server action: `createServerSupabase()` → `supabase.from("schedules").select("*").order("created_at", { ascending: false })` |
| 4 | `lib/supabase-server.ts` → `createServerSupabase()` | Uses `cookies()` from `next/headers` — same auth context as request |

## Exact Query

```ts
// lib/actions.ts:126-129
const { data: schedules, error } = await supabase
  .from("schedules")
  .select("*")
  .order("created_at", { ascending: false })
```

- **No extra filters** (.eq, .in, joins)
- **No team_id** passed — query fetches all schedules; RLS filters
- **Same query** as owner page (`app/(app)/schedule/page.tsx`)

## Auth Context

- **Owner**: Server component under `(app)` layout → request has cookies → `createServerSupabase()` gets session
- **Member**: Client component calls server action → POST request includes cookies → `createServerSupabase()` gets session
- **Both** use same `createServerSupabase()` and same query.

## Root Cause

**member_submissions has RLS enabled but NO SELECT policy.**

When `member_select_schedules` runs:

```sql
EXISTS (
  SELECT 1 FROM public.member_submissions
  WHERE member_submissions.meeting_id = schedules.team_id
    AND member_submissions.user_id = auth.uid()
)
```

PostgreSQL applies RLS to the subquery. The member has no SELECT permission on `member_submissions`, so the subquery returns 0 rows. EXISTS is false. The schedule is hidden.

## Fix (Applied)

Add a SELECT policy on `member_submissions` so the EXISTS subquery in `schedules.member_select_schedules` can see the member's row:

```sql
CREATE POLICY "member_read_own_submission" ON public.member_submissions
  FOR SELECT
  USING (user_id = auth.uid());
```

**RLS dependency**: `schedules.member_select_schedules` depends on `member_submissions` being readable by the member. Subqueries in RLS policies apply RLS to referenced tables.

## Failure Classification

- **c) Something else** — RLS on the referenced table (`member_submissions`) blocks the subquery used by the schedules policy.
