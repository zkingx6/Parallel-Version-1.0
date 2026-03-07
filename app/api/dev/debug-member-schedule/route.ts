/**
 * DEV ONLY: Debug member schedule visibility.
 * GET /api/dev/debug-member-schedule
 *
 * Call while logged in as the member who cannot see schedules.
 * Returns RLS policies, raw data, and EXISTS clause evaluation.
 */
import { NextResponse } from "next/server"
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server"

export async function GET() {
  const serverSupabase = await createServerSupabase()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  const authUserId = user?.id ?? null
  const authUserEmail = user?.email ?? null

  const serviceSupabase = createServiceSupabase()
  const debug: Record<string, unknown> = {
    authUserId,
    authUserEmail,
    authUserIsNull: user === null,
  }

  // 2. All schedules (service role bypasses RLS)
  const { data: allSchedules, error: schedError } = await serviceSupabase
    .from("schedules")
    .select("id, team_id, name, created_at")
    .order("created_at", { ascending: false })

  debug.schedulesCount = allSchedules?.length ?? 0
  debug.schedules = allSchedules ?? []
  debug.schedulesError = schedError?.message ?? null

  // 3. member_submissions for this auth user (where user_id = auth.uid())
  let memberSubsForUser: { id: string; meeting_id: string; user_id: string | null; name: string }[] = []
  if (authUserId) {
    const { data: ms } = await serviceSupabase
      .from("member_submissions")
      .select("id, meeting_id, user_id, name")
      .eq("user_id", authUserId)
    memberSubsForUser = ms ?? []
  }
  debug.memberSubmissionsForAuthUser = memberSubsForUser
  debug.memberSubmissionsForAuthUserCount = memberSubsForUser.length

  // 4. All member_submissions with meeting_id in schedules.team_id (to see if user_id is null for matching rows)
  const teamIds = [...new Set((allSchedules ?? []).map((s) => s.team_id))]
  let memberSubsForSchedules: { id: string; meeting_id: string; user_id: string | null; name: string }[] = []
  if (teamIds.length > 0) {
    const { data: ms2 } = await serviceSupabase
      .from("member_submissions")
      .select("id, meeting_id, user_id, name")
      .in("meeting_id", teamIds)
    memberSubsForSchedules = ms2 ?? []
  }
  debug.memberSubmissionsForScheduleTeams = memberSubsForSchedules

  // 5. Would EXISTS clause match? For each schedule, check if any member_submissions row has meeting_id = team_id AND user_id = auth.uid()
  const existsEvaluation: { scheduleId: string; teamId: string; wouldMatch: boolean; reason: string }[] = []
  for (const s of allSchedules ?? []) {
    const matchingInUser = memberSubsForUser.find((ms) => ms.meeting_id === s.team_id)
    const wouldMatch = !!matchingInUser
    let reason: string
    if (matchingInUser) {
      reason = `member_submissions row exists with user_id=${matchingInUser.user_id} MATCHES auth.uid()`
    } else {
      const rowsForTeam = memberSubsForSchedules.filter((ms) => ms.meeting_id === s.team_id)
      const withNullUserId = rowsForTeam.filter((r) => r.user_id === null)
      if (withNullUserId.length > 0) {
        reason = `No row with user_id=auth.uid(). Found ${withNullUserId.length} member_submissions row(s) for this team with user_id=NULL (member joined before login?)`
      } else if (rowsForTeam.length > 0) {
        reason = `No member_submissions row with meeting_id=${s.team_id} AND user_id=${authUserId}. Team has ${rowsForTeam.length} member(s) but none with this auth user.`
      } else {
        reason = `No member_submissions rows for meeting_id=${s.team_id} at all.`
      }
    }
    existsEvaluation.push({ scheduleId: s.id, teamId: s.team_id, wouldMatch, reason })
  }
  debug.existsEvaluation = existsEvaluation

  // 6. RLS policies - Supabase JS doesn't expose pg_policies. Run manually in SQL Editor:
  debug.rlsCheckSql =
    "SELECT policyname, cmd, qual::text FROM pg_policies WHERE tablename = 'schedules' AND schemaname = 'public';"

  return NextResponse.json(debug, { status: 200 })
}
