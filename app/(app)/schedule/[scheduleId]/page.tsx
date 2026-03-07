import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { ScheduleDetailContent } from "@/components/parallel/schedule-detail-content"

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
    .select("id, name, team_id, rotation_result, weeks")
    .eq("id", scheduleId)
    .single()

  if (!schedule) redirect("/schedule")

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", schedule.team_id)
    .eq("manager_id", user.id)
    .single()

  if (!meeting) redirect("/schedule")

  const { data: members } = await supabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", schedule.team_id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  const rotationResult = schedule.rotation_result as { weeks: unknown[] } | null
  const weeks =
    rotationResult && Array.isArray(rotationResult.weeks)
      ? rotationResult.weeks
      : []

  return (
    <ScheduleDetailContent
      scheduleName={schedule.name}
      meeting={meeting}
      members={members ?? []}
      weeks={weeks}
    />
  )
}
