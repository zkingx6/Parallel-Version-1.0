import { TeamMember, MeetingConfig, HardNoRange, getInitials } from "./types"
import { tryResolveToStandardTimezone } from "./timezone"

export type DbMeeting = {
  id: string
  manager_id: string
  title: string
  day_of_week: number
  duration_minutes: number
  rotation_weeks: number
  anchor_offset: number
  /** IANA timezone for display (e.g. America/New_York). When set, used for DST-aware header. */
  display_timezone?: string | null
  /** Base time in minutes from midnight (0–1439). null = auto fair mode. */
  base_time_minutes?: number | null
  invite_token: string
  created_at: string
}

export type DbMemberSubmission = {
  id: string
  meeting_id: string
  name: string
  /** IANA timezone (e.g. America/New_York). Required. */
  timezone: string
  work_start_hour: number
  work_end_hour: number
  hard_no_ranges: HardNoRange[]
  role: string | null
  is_owner_participant?: boolean
  created_at: string
  updated_at: string
}

export function dbMeetingToConfig(m: DbMeeting): MeetingConfig {
  return {
    dayOfWeek: m.day_of_week,
    anchorHour: 12,
    anchorOffset: m.anchor_offset,
    durationMinutes: m.duration_minutes,
    rotationWeeks: m.rotation_weeks,
    baseTimeMinutes: m.base_time_minutes === null ? null : (m.base_time_minutes ?? 540),
  }
}

export function dbMemberToTeamMember(s: DbMemberSubmission): TeamMember {
  const hardNoRanges = Array.isArray(s.hard_no_ranges)
    ? s.hard_no_ranges
    : []
  const timezone = tryResolveToStandardTimezone(s.timezone) ?? s.timezone ?? ""
  return {
    id: s.id,
    name: s.name,
    timezone,
    workStartHour: s.work_start_hour,
    workEndHour: s.work_end_hour,
    hardNoRanges,
    initials: getInitials(s.name),
  }
}
