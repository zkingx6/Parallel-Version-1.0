import { TeamMember, MeetingConfig, HardNoRange, getInitials } from "./types"

export type DbMeeting = {
  id: string
  manager_id: string
  title: string
  day_of_week: number
  duration_minutes: number
  rotation_weeks: number
  anchor_offset: number
  invite_token: string
  created_at: string
}

export type DbMemberSubmission = {
  id: string
  meeting_id: string
  name: string
  timezone_offset: number
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
  }
}

export function dbMemberToTeamMember(s: DbMemberSubmission): TeamMember {
  return {
    id: s.id,
    name: s.name,
    utcOffset: s.timezone_offset,
    workStartHour: s.work_start_hour,
    workEndHour: s.work_end_hour,
    hardNoRanges: Array.isArray(s.hard_no_ranges) ? s.hard_no_ranges : [],
    initials: getInitials(s.name),
  }
}
