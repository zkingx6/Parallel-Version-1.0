-- Run this in Supabase SQL Editor to debug member schedule visibility.
-- Replace YOUR_MEMBER_AUTH_USER_ID in all queries below with the actual auth.uid()
-- from debug logs (e.g. d7c00685-ed29-416d-a62c-3a50af0c5e44)

-- 1. RLS policies on public.schedules
SELECT '=== RLS POLICIES ON public.schedules ===' AS section;
SELECT policyname, cmd, qual::text AS using_expression
FROM pg_policies
WHERE tablename = 'schedules' AND schemaname = 'public';

-- 2. All schedules (raw, no RLS)
SELECT '=== ALL SCHEDULES ===' AS section;
SELECT id, team_id, name, created_at FROM public.schedules ORDER BY created_at DESC;

-- 3. member_submissions where user_id = auth user
SELECT '=== member_submissions FOR AUTH USER ===' AS section;
SELECT id, meeting_id, user_id, name
FROM public.member_submissions
WHERE user_id = 'd7c00685-ed29-416d-a62c-3a50af0c5e44'::uuid;  -- replace with actual auth user id

-- 4. member_submissions for schedule teams (all members in those teams)
SELECT '=== member_submissions FOR SCHEDULE TEAMS ===' AS section;
SELECT ms.id, ms.meeting_id, ms.user_id, ms.name, s.id AS schedule_id
FROM public.member_submissions ms
JOIN public.schedules s ON s.team_id = ms.meeting_id
ORDER BY ms.meeting_id;

-- 5. EXISTS clause evaluation: would member_select_schedules allow each schedule?
SELECT '=== EXISTS EVALUATION (would member see each schedule?) ===' AS section;
SELECT
  s.id AS schedule_id,
  s.team_id,
  s.name,
  EXISTS (
    SELECT 1 FROM public.member_submissions ms
    WHERE ms.meeting_id = s.team_id
      AND ms.user_id = 'd7c00685-ed29-416d-a62c-3a50af0c5e44'::uuid  -- replace with actual auth user id
  ) AS would_member_see
FROM public.schedules s
ORDER BY s.created_at DESC;
