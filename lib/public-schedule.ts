/**
 * Public schedule fetch by share_token.
 * Uses service role to allow unauthenticated access.
 * Only returns display-safe data (no emails, no internal user IDs in output).
 * Uses profile resolver for consistent identity display when user_id exists.
 */

import { createServiceSupabase } from "./supabase-server"
import type { RotationWeekData } from "./types"
import { getInitials } from "./types"
import { ensureDisplayTimezoneIana } from "./timezone"
import type { TeamMember } from "./types"
import { resolveMembersDisplay, fetchProfilesForUserIds } from "./profile-resolver"

export type PublicScheduleData = {
  scheduleId: string
  teamId: string
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKeyPresent = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const urlHost = supabaseUrl ? new URL(supabaseUrl).host : "(missing)"

  const supabase = createServiceSupabase()

  const { data: schedule, error } = await supabase
    .from("schedules")
    .select("id, name, team_id, rotation_result")
    .eq("share_token", shareToken)
    .single()

  if (process.env.NEXT_PUBLIC_DEBUG_SHARE_LINK === "1") {
    console.warn("[share-link] token=" + shareToken + " host=" + urlHost + " serviceKey=" + serviceKeyPresent + " error=" + (error?.message ?? "none") + " scheduleId=" + (schedule?.id ?? "null"))
  }

  if (!schedule) return null

  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, display_timezone, base_time_minutes, manager_id")
    .eq("id", schedule.team_id)
    .single()

  if (!meeting) return null

  const { data: members } = await supabase
    .from("member_submissions")
    .select("id, name, timezone, avatar_url, user_id, is_owner_participant")
    .eq("meeting_id", schedule.team_id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  const rotationResult = schedule.rotation_result as { weeks: RotationWeekData[] } | null
  const weeks: RotationWeekData[] =
    rotationResult && Array.isArray(rotationResult.weeks)
      ? rotationResult.weeks
      : []

  const ownerProfile = meeting.manager_id
    ? (await fetchProfilesForUserIds([meeting.manager_id])).get(meeting.manager_id) ?? null
    : null
  const membersDisplay = await resolveMembersDisplay(
    (members ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? "",
      timezone: m.timezone ?? "America/New_York",
      avatar_url: m.avatar_url,
      user_id: m.user_id,
      is_owner_participant: m.is_owner_participant ?? false,
    })),
    ownerProfile ?? undefined
  )

  const team: TeamMember[] = (members ?? []).map((m) => {
    const resolved = membersDisplay.get(m.id)
    const name = resolved?.name ?? m.name ?? "?"
    return {
      id: m.id,
      name,
      timezone: m.timezone ?? "America/New_York",
      workStartHour: 9,
      workEndHour: 17,
      hardNoRanges: [],
      initials: getInitials(name),
      avatar_url: resolved?.avatarUrl ?? m.avatar_url ?? undefined,
    }
  })

  const displayTimezone = ensureDisplayTimezoneIana(
    meeting.display_timezone ?? "America/New_York"
  )
  const useBaseTime = (meeting.base_time_minutes ?? null) != null

  return {
    scheduleId: schedule.id,
    teamId: schedule.team_id,
    scheduleName: schedule.name,
    meetingTitle: meeting.title,
    displayTimezone,
    useBaseTime,
    weeks,
    team,
  }
}
