/**
 * Public schedule fetch by share_token.
 * Uses service role to allow unauthenticated access.
 * Only returns display-safe data (no emails, no internal user IDs in output).
 */

import { createServiceSupabase } from "./supabase-server"
import type { RotationWeekData } from "./types"
import { getInitials } from "./types"
import { ensureDisplayTimezoneIana } from "./timezone"
import type { TeamMember } from "./types"

export type PublicScheduleData = {
  scheduleName: string
  meetingTitle: string
  displayTimezone: string
  useBaseTime: boolean
  weeks: RotationWeekData[]
  team: TeamMember[]
}

export async function getPublicScheduleByToken(
  shareToken: string
): Promise<PublicScheduleData | null> {
  const supabase = createServiceSupabase()

  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, name, team_id, rotation_result")
    .eq("share_token", shareToken)
    .single()

  if (!schedule) return null

  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, display_timezone, base_time_minutes")
    .eq("id", schedule.team_id)
    .single()

  if (!meeting) return null

  const { data: members } = await supabase
    .from("member_submissions")
    .select("id, name, timezone, avatar_url")
    .eq("meeting_id", schedule.team_id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  const rotationResult = schedule.rotation_result as { weeks: RotationWeekData[] } | null
  const weeks: RotationWeekData[] =
    rotationResult && Array.isArray(rotationResult.weeks)
      ? rotationResult.weeks
      : []

  const team: TeamMember[] = (members ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    timezone: m.timezone ?? "America/New_York",
    workStartHour: 9,
    workEndHour: 17,
    hardNoRanges: [],
    initials: getInitials(m.name),
    avatar_url: m.avatar_url ?? undefined,
  }))

  const displayTimezone = ensureDisplayTimezoneIana(
    meeting.display_timezone ?? "America/New_York"
  )
  const useBaseTime = (meeting.base_time_minutes ?? null) != null

  return {
    scheduleName: schedule.name,
    meetingTitle: meeting.title,
    displayTimezone,
    useBaseTime,
    weeks,
    team,
  }
}
