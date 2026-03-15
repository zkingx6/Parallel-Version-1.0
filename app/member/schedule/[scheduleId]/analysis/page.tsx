import { redirect } from "next/navigation"
import type { RotationWeekData } from "@/lib/types"
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server"
import { ScheduleAnalysisContent } from "@/components/parallel/schedule-analysis-content"
import {
  resolveMembersDisplay,
  getOwnerProfileForMeeting,
} from "@/lib/profile-resolver"

function getModeLabel(modeUsed: string | undefined): string {
  if (!modeUsed) return "Auto Fair"
  switch (modeUsed) {
    case "FAIRNESS_GUARANTEE":
      return "Auto Fair"
    case "FIXED_ANCHOR":
      return "Fixed Time"
    case "STRICT":
      return "Fair rotation"
    case "RELAXED":
      return "Best possible"
    case "FALLBACK":
      return "Best possible"
    default:
      return "Auto Fair"
  }
}

export default async function MemberScheduleAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<{ token?: string; memberId?: string }>
}) {
  const { scheduleId } = await params
  const { token, memberId } = await searchParams
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, name, team_id, rotation_result, weeks")
    .eq("id", scheduleId)
    .single()

  if (!schedule) redirect("/member-dashboard")

  const serviceSupabase = createServiceSupabase()
  const { data: meeting } = await serviceSupabase
    .from("meetings")
    .select("*")
    .eq("id", schedule.team_id)
    .single()

  if (!meeting) redirect("/member-dashboard")

  const { data: memberRow } = await serviceSupabase
    .from("member_submissions")
    .select("id")
    .eq("meeting_id", schedule.team_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!memberRow) redirect("/member-dashboard")

  const { data: members } = await serviceSupabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", schedule.team_id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  const rotationResult = schedule.rotation_result as
    | { weeks: unknown[]; modeUsed?: string; explain?: unknown }
    | null
  const weeks: RotationWeekData[] =
    rotationResult && Array.isArray(rotationResult.weeks)
      ? (rotationResult.weeks as RotationWeekData[])
      : []
  const modeUsed = rotationResult?.modeUsed
  const explain = rotationResult?.explain as {
    shareablePlanExists?: boolean
    forcedSummary?: string
    forcedReason?: string
    weeks?: Array<{ hardValidCandidatesCount?: number }>
    evidence?: { perWeekHardValidCount?: number[] }
  } | undefined

  const ownerAuthProfile = await getOwnerProfileForMeeting(
    meeting.manager_id,
    user
  )
  const membersDisplay = await resolveMembersDisplay(
    members ?? [],
    ownerAuthProfile ?? undefined
  )

  const baseParams =
    token && memberId
      ? `token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`
      : undefined

  return (
    <ScheduleAnalysisContent
        scheduleId={scheduleId}
        scheduleName={schedule.name}
        teamName={meeting.title}
        weeksCount={schedule.weeks ?? weeks.length}
        modeLabel={getModeLabel(modeUsed)}
        explain={explain}
        members={members ?? []}
        weeks={weeks}
        membersDisplay={membersDisplay}
        scheduleBasePath="/member/schedule"
        scheduleLinkParams={baseParams}
        displayTimezone={meeting.display_timezone}
        modeUsed={modeUsed}
        useFixedBaseTime={meeting.base_time_minutes != null}
      />
  )
}
