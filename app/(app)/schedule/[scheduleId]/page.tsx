import { redirect } from "next/navigation"
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server"
import { ScheduleDetailContent } from "@/components/parallel/schedule-detail-content"
import type { RotationWeekData } from "@/lib/types"
import {
  resolveMembersDisplay,
  authUserToProfile,
} from "@/lib/profile-resolver"

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, name, team_id, rotation_result, weeks, share_token")
    .eq("id", scheduleId)
    .single()

  if (!schedule) redirect("/schedule")

  const serviceSupabase = createServiceSupabase()
  const { data: meeting } = await serviceSupabase
    .from("meetings")
    .select("*")
    .eq("id", schedule.team_id)
    .single()

  if (!meeting) redirect("/schedule")

  const { data: members } = await serviceSupabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", schedule.team_id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  const rotationResult = schedule.rotation_result as { weeks: RotationWeekData[] } | null
  const weeks: RotationWeekData[] =
    rotationResult && Array.isArray(rotationResult.weeks)
      ? rotationResult.weeks
      : []

  const isOwner = meeting.manager_id === user.id
  const ownerAuthProfile = isOwner ? authUserToProfile(user) : null
  const membersDisplay = await resolveMembersDisplay(
    members ?? [],
    ownerAuthProfile ?? undefined
  )

  return (
    <ScheduleDetailContent
      scheduleId={scheduleId}
      scheduleName={schedule.name}
      meeting={meeting}
      members={members ?? []}
      weeks={weeks}
      membersDisplay={membersDisplay}
      showShareActions
      shareToken={schedule.share_token ?? undefined}
    />
  )
}
