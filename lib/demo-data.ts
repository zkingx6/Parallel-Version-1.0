/**
 * Demo-only data for the landing page sandbox.
 * No Supabase, no auth, no persistent writes.
 * Matches DbMeeting, DbMemberSubmission, and schedule shapes.
 */

import type { DbMeeting, DbMemberSubmission } from "./database.types"
import type { RotationWeekData } from "./types"
import { DateTime } from "luxon"

const NOW = new Date().toISOString()
const DEMO_USER_ID = "demo-owner-id"

/** Design Sync — 4 members (Americas, Europe, Dubai). */
const DESIGN_SYNC_MEMBERS: DbMemberSubmission[] = [
  {
    id: "ds-1",
    meeting_id: "demo-meeting-1",
    name: "Alex Chen",
    timezone: "America/New_York",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 0, end: 6 }],
    role: null,
    is_owner_participant: true,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "ds-2",
    meeting_id: "demo-meeting-1",
    name: "Olivia Brown",
    timezone: "Europe/London",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 23, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "ds-3",
    meeting_id: "demo-meeting-1",
    name: "Hans Mueller",
    timezone: "Europe/Berlin",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 23, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "ds-4",
    meeting_id: "demo-meeting-1",
    name: "Sara Al-Hassan",
    timezone: "Asia/Dubai",
    work_start_hour: 9,
    work_end_hour: 19,
    hard_no_ranges: [{ start: 0, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
]

/** Global Product — 6 members (Design Sync + Singapore, Tokyo). */
const GLOBAL_PRODUCT_MEMBERS: DbMemberSubmission[] = [
  {
    id: "gp-1",
    meeting_id: "demo-meeting-2",
    name: "Alex Chen",
    timezone: "America/New_York",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 0, end: 6 }],
    role: null,
    is_owner_participant: true,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "gp-2",
    meeting_id: "demo-meeting-2",
    name: "Olivia Brown",
    timezone: "Europe/London",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 23, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "gp-3",
    meeting_id: "demo-meeting-2",
    name: "Hans Mueller",
    timezone: "Europe/Berlin",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 23, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "gp-4",
    meeting_id: "demo-meeting-2",
    name: "Sara Al-Hassan",
    timezone: "Asia/Dubai",
    work_start_hour: 9,
    work_end_hour: 19,
    hard_no_ranges: [{ start: 0, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "gp-5",
    meeting_id: "demo-meeting-2",
    name: "Wei Zhang",
    timezone: "Asia/Singapore",
    work_start_hour: 9,
    work_end_hour: 19,
    hard_no_ranges: [{ start: 0, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "gp-6",
    meeting_id: "demo-meeting-2",
    name: "Yuki Tanaka",
    timezone: "Asia/Tokyo",
    work_start_hour: 10,
    work_end_hour: 20,
    hard_no_ranges: [{ start: 0, end: 7 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
]

const anchorOffset = Math.round(
  DateTime.now().setZone("America/New_York").offset / 60
)

export const DEMO_MEETINGS: DbMeeting[] = [
  {
    id: "demo-meeting-1",
    manager_id: DEMO_USER_ID,
    title: "Design Sync",
    day_of_week: 3,
    duration_minutes: 45,
    rotation_weeks: 8,
    anchor_offset: anchorOffset,
    display_timezone: "America/New_York",
    base_time_minutes: 540, // 9:00 AM — demo preset: prefer clean all-in-working-hours when overlap exists
    start_date: null,
    published_schedule: null,
    invite_token: "demo-invite-1",
    created_at: NOW,
  },
  {
    id: "demo-meeting-2",
    manager_id: DEMO_USER_ID,
    title: "Global Product",
    day_of_week: 3,
    duration_minutes: 45,
    rotation_weeks: 8,
    anchor_offset: anchorOffset,
    display_timezone: "America/New_York",
    base_time_minutes: null,
    start_date: null,
    published_schedule: null,
    invite_token: "demo-invite-2",
    created_at: NOW,
  },
  {
    id: "demo-meeting-nd",
    manager_id: DEMO_USER_ID,
    title: "NY – Dubai",
    day_of_week: 2,
    duration_minutes: 30,
    rotation_weeks: 4,
    anchor_offset: anchorOffset,
    display_timezone: "America/New_York",
    base_time_minutes: null,
    start_date: null,
    published_schedule: null,
    invite_token: "demo-invite-nd",
    created_at: NOW,
  },
  {
    id: "demo-meeting-sl",
    manager_id: DEMO_USER_ID,
    title: "SF – London",
    day_of_week: 3,
    duration_minutes: 30,
    rotation_weeks: 4,
    anchor_offset: anchorOffset,
    display_timezone: "America/New_York",
    base_time_minutes: null,
    start_date: null,
    published_schedule: null,
    invite_token: "demo-invite-sl",
    created_at: NOW,
  },
]

const NY_DUBAI_MEMBERS: DbMemberSubmission[] = [
  {
    id: "nd-1",
    meeting_id: "demo-meeting-nd",
    name: "Jordan Lee",
    timezone: "America/New_York",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [],
    role: null,
    is_owner_participant: true,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "nd-2",
    meeting_id: "demo-meeting-nd",
    name: "Layla Hassan",
    timezone: "Asia/Dubai",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
]

const SF_LONDON_MEMBERS: DbMemberSubmission[] = [
  {
    id: "sl-1",
    meeting_id: "demo-meeting-sl",
    name: "Sam Park",
    timezone: "America/Los_Angeles",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [],
    role: null,
    is_owner_participant: true,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "sl-2",
    meeting_id: "demo-meeting-sl",
    name: "Emma Watson",
    timezone: "Europe/London",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
]

export const DEMO_MEMBERS_BY_MEETING: Record<string, DbMemberSubmission[]> = {
  "demo-meeting-1": DESIGN_SYNC_MEMBERS,
  "demo-meeting-2": GLOBAL_PRODUCT_MEMBERS,
  "demo-meeting-nd": NY_DUBAI_MEMBERS,
  "demo-meeting-sl": SF_LONDON_MEMBERS,
}

export type DemoSchedule = {
  id: string
  name: string
  team_id: string
  weeks: number
  created_at: string
  rotation_result: {
    weeks: RotationWeekData[]
    modeUsed?: string
    explain?: {
      shareablePlanExists?: boolean
      forcedSummary?: string
      forcedReason?: string
    }
  }
}

/** Mock week data for demo schedules. Static, not generated. */
function buildMockWeeks(
  members: { id: string; tzOffset: number }[],
  utcHours: number[]
): RotationWeekData[] {
  const baseDate = DateTime.now().startOf("week").plus({ weeks: 1 })
  return utcHours.map((utcHour, i) => {
    const utcDate = baseDate.plus({ weeks: i })
    const utcDateIso = utcDate.toISODate() ?? ""
    const memberTimes = members.map(({ id, tzOffset }) => {
      const localHour = utcHour + tzOffset
      const h = Math.floor(localHour)
      const m = Math.round((localHour % 1) * 60)
      const ampm = h >= 12 ? "PM" : "AM"
      const hour12 = h % 12 || 12
      const localTime = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`
      return {
        memberId: id,
        localHour,
        localTime,
        discomfort: "comfortable" as const,
        score: 0,
        dateOffset: 0,
      }
    })
    return {
      week: i + 1,
      date: utcDate.toFormat("EEE MMM d"),
      utcDateIso,
      utcHour,
      memberTimes,
      explanation: "Most members are comfortable with this time.",
    }
  })
}

/** Pre-generated demo schedules (static mock data). */
export function getInitialDemoSchedules(): DemoSchedule[] {
  const now = new Date().toISOString()
  const ndWeeks = buildMockWeeks(
    [{ id: "nd-1", tzOffset: -5 }, { id: "nd-2", tzOffset: 4 }],
    [14, 13, 14, 13]
  )
  const slWeeks = buildMockWeeks(
    [{ id: "sl-1", tzOffset: -8 }, { id: "sl-2", tzOffset: 0 }],
    [14, 15, 13, 14]
  )
  return [
    {
      id: "demo-schedule-1",
      name: "Schedule Example 1",
      team_id: "demo-meeting-nd",
      weeks: 4,
      created_at: now,
      rotation_result: {
        weeks: ndWeeks,
        modeUsed: "FAIRNESS_GUARANTEE",
        explain: {},
      },
    },
    {
      id: "demo-schedule-2",
      name: "Schedule Example 2",
      team_id: "demo-meeting-sl",
      weeks: 4,
      created_at: now,
      rotation_result: {
        weeks: slWeeks,
        modeUsed: "FAIRNESS_GUARANTEE",
        explain: {},
      },
    },
  ]
}

/** Build membersDisplay map for demo (memberId -> { name, avatarUrl }). */
export function getDemoMembersDisplay(
  members: DbMemberSubmission[]
): Map<string, { name: string; avatarUrl: string }> {
  const map = new Map<string, { name: string; avatarUrl: string }>()
  for (const m of members) {
    map.set(m.id, { name: m.name, avatarUrl: m.avatar_url ?? "" })
  }
  return map
}
