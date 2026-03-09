/**
 * Demo-only data for the landing page sandbox.
 * No Supabase, no auth, no persistent writes.
 * Matches DbMeeting, DbMemberSubmission, and schedule shapes.
 */

import type { DbMeeting, DbMemberSubmission } from "./database.types"
import type { RotationWeekData } from "./types"
import type { Discomfort } from "./types"
import { DateTime } from "luxon"

const NOW = new Date().toISOString()
const DEMO_USER_ID = "demo-owner-id"

const anchorOffset = Math.round(
  DateTime.now().setZone("America/New_York").offset / 60
)

export const DEMO_MEETINGS: DbMeeting[] = [
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
  {
    id: "demo-meeting-pts",
    manager_id: DEMO_USER_ID,
    title: "Product Team Sync",
    day_of_week: 3,
    duration_minutes: 45,
    rotation_weeks: 4,
    anchor_offset: anchorOffset,
    display_timezone: "America/New_York",
    base_time_minutes: null,
    start_date: null,
    published_schedule: null,
    invite_token: "demo-invite-pts",
    created_at: NOW,
  },
  {
    id: "demo-meeting-ges",
    manager_id: DEMO_USER_ID,
    title: "Global Engineering Sync",
    day_of_week: 3,
    duration_minutes: 60,
    rotation_weeks: 4,
    anchor_offset: anchorOffset,
    display_timezone: "America/New_York",
    base_time_minutes: null,
    start_date: null,
    published_schedule: null,
    invite_token: "demo-invite-ges",
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

/** Product Team Sync — 4 members (NY, London, Dubai, Tokyo). */
const PRODUCT_TEAM_SYNC_MEMBERS: DbMemberSubmission[] = [
  {
    id: "pts-1",
    meeting_id: "demo-meeting-pts",
    name: "Marcus Chen",
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
    id: "pts-2",
    meeting_id: "demo-meeting-pts",
    name: "Emma Thompson",
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
    id: "pts-3",
    meeting_id: "demo-meeting-pts",
    name: "Omar Al-Rashid",
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
    id: "pts-4",
    meeting_id: "demo-meeting-pts",
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

/** Global Engineering Sync — 8 members across global time zones. */
const GLOBAL_ENGINEERING_SYNC_MEMBERS: DbMemberSubmission[] = [
  {
    id: "ges-1",
    meeting_id: "demo-meeting-ges",
    name: "Sarah Mitchell",
    timezone: "America/Los_Angeles",
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
    id: "ges-2",
    meeting_id: "demo-meeting-ges",
    name: "James Wilson",
    timezone: "America/New_York",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [{ start: 0, end: 6 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "ges-3",
    meeting_id: "demo-meeting-ges",
    name: "Olivia Clarke",
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
    id: "ges-4",
    meeting_id: "demo-meeting-ges",
    name: "Lukas Weber",
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
    id: "ges-5",
    meeting_id: "demo-meeting-ges",
    name: "Fatima Hassan",
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
    id: "ges-6",
    meeting_id: "demo-meeting-ges",
    name: "Arjun Patel",
    timezone: "Asia/Kolkata",
    work_start_hour: 10,
    work_end_hour: 19,
    hard_no_ranges: [{ start: 0, end: 8 }],
    role: null,
    is_owner_participant: false,
    avatar_url: null,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "ges-7",
    meeting_id: "demo-meeting-ges",
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
    id: "ges-8",
    meeting_id: "demo-meeting-ges",
    name: "Kenji Yamamoto",
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

export const DEMO_MEMBERS_BY_MEETING: Record<string, DbMemberSubmission[]> = {
  "demo-meeting-nd": NY_DUBAI_MEMBERS,
  "demo-meeting-sl": SF_LONDON_MEMBERS,
  "demo-meeting-pts": PRODUCT_TEAM_SYNC_MEMBERS,
  "demo-meeting-ges": GLOBAL_ENGINEERING_SYNC_MEMBERS,
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

type BurdenOverride = {
  weekIndex: number
  memberId: string
  discomfort: Discomfort
  score: number
}

type DemoMemberInput = {
  id: string
  tzOffset: number
  workStartHour?: number
  workEndHour?: number
}

/**
 * Compute burden from working hours. Outside [workStart, workEnd) = inconvenience.
 * Does not change algorithm; demo visualization only.
 */
function computeBurdenFromWorkHours(
  localHour: number,
  workStartHour: number,
  workEndHour: number
): { discomfort: Discomfort; score: number } {
  let effectiveHour = localHour
  if (effectiveHour < 0) effectiveHour += 24
  else if (effectiveHour >= 24) effectiveHour -= 24
  const inWorkHours =
    effectiveHour >= workStartHour && effectiveHour < workEndHour
  if (inWorkHours) return { discomfort: "comfortable", score: 0 }
  const beforeWork = effectiveHour < workStartHour
  const afterWork = effectiveHour >= workEndHour
  const hoursOutside = beforeWork
    ? workStartHour - effectiveHour
    : effectiveHour - workEndHour
  if (hoursOutside >= 4) return { discomfort: "sacrifice", score: 3 }
  return { discomfort: "stretch", score: 2 }
}

/** Mock week data for demo schedules. Static, not generated. */
function buildMockWeeks(
  members: DemoMemberInput[],
  utcHours: number[],
  burdenOverrides?: BurdenOverride[],
  weekExplanations?: string[]
): RotationWeekData[] {
  const baseDate = DateTime.now().startOf("week").plus({ weeks: 1 })
  const overrideMap = new Map<string, { discomfort: Discomfort; score: number }>()
  for (const o of burdenOverrides ?? []) {
    overrideMap.set(`${o.weekIndex}:${o.memberId}`, {
      discomfort: o.discomfort,
      score: o.score,
    })
  }
  return utcHours.map((utcHour, i) => {
    const utcDate = baseDate.plus({ weeks: i })
    const utcDateIso = utcDate.toISODate() ?? ""
    const memberTimes = members.map(
      ({ id, tzOffset, workStartHour, workEndHour }) => {
        const localHour = utcHour + tzOffset
        let h = Math.floor(localHour)
        let m = Math.round((localHour % 1) * 60)
        let dateOffset = 0
        if (h < 0) {
          h += 24
          dateOffset = -1
        } else if (h >= 24) {
          h -= 24
          dateOffset = 1
        }
        const ampm = h >= 12 ? "PM" : "AM"
        const hour12 = h % 12 || 12
        const localTime = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`
        const override = overrideMap.get(`${i}:${id}`)
        let discomfort: Discomfort = "comfortable"
        let score = 0
        if (override) {
          discomfort = override.discomfort
          score = override.score
        } else if (
          workStartHour !== undefined &&
          workEndHour !== undefined
        ) {
          const burden = computeBurdenFromWorkHours(
            localHour,
            workStartHour,
            workEndHour
          )
          discomfort = burden.discomfort
          score = burden.score
        }
        return {
          memberId: id,
          localHour,
          localTime,
          discomfort,
          score,
          dateOffset,
        }
      }
    )
    const hasHeavyBurden = memberTimes.some((mt) => mt.discomfort !== "comfortable")
    const defaultExplanation = hasHeavyBurden
      ? "Some members take a less convenient time this week."
      : "Most members are comfortable with this time."
    return {
      week: i + 1,
      date: utcDate.toFormat("EEE MMM d"),
      utcDateIso,
      utcHour,
      memberTimes,
      explanation: weekExplanations?.[i] ?? defaultExplanation,
    }
  })
}

/** Pre-generated demo schedules (static mock data). */
export function getInitialDemoSchedules(): DemoSchedule[] {
  const now = new Date().toISOString()

  // Demo 1 — Product Team Sync: 4 members (NY, London, Dubai, Tokyo), 4-week rotation
  // Burden computed from work hours: outside [workStart, workEnd) = highlight
  const ptsMembers: DemoMemberInput[] = [
    { id: "pts-1", tzOffset: -5, workStartHour: 9, workEndHour: 18 },
    { id: "pts-2", tzOffset: 0, workStartHour: 9, workEndHour: 18 },
    { id: "pts-3", tzOffset: 4, workStartHour: 9, workEndHour: 19 },
    { id: "pts-4", tzOffset: 9, workStartHour: 10, workEndHour: 20 },
  ]
  const ptsWeeks = buildMockWeeks(ptsMembers, [14, 12, 13, 11])

  // Demo 2 — Global Engineering Sync: 8 members, 4-week burden rotation
  // Curated for landing: burden group rotates each week so no one is burdened every week.
  // Week 1 (10 UTC): Americas burdened — SF 2am, NY 5am
  // Week 2 (6 UTC):  Europe burdened — London 6am, Berlin 7am (+ SF 10pm, NY 1am)
  // Week 3 (14 UTC): Asia burdened — Singapore 10pm, Tokyo 11pm (+ SF 6am)
  // Week 4 (18 UTC): Middle+Asia burdened — Dubai 10pm, Mumbai 11:30pm, Singapore 2am, Tokyo 3am (+ Berlin 7pm)
  const gesMembers: DemoMemberInput[] = [
    { id: "ges-1", tzOffset: -8, workStartHour: 9, workEndHour: 18 },
    { id: "ges-2", tzOffset: -5, workStartHour: 9, workEndHour: 18 },
    { id: "ges-3", tzOffset: 0, workStartHour: 9, workEndHour: 18 },
    { id: "ges-4", tzOffset: 1, workStartHour: 9, workEndHour: 18 },
    { id: "ges-5", tzOffset: 4, workStartHour: 9, workEndHour: 19 },
    { id: "ges-6", tzOffset: 5.5, workStartHour: 10, workEndHour: 19 },
    { id: "ges-7", tzOffset: 8, workStartHour: 9, workEndHour: 19 },
    { id: "ges-8", tzOffset: 9, workStartHour: 10, workEndHour: 20 },
  ]
  const gesWeeks = buildMockWeeks(gesMembers, [10, 6, 14, 18], undefined, [
    "Americas take the early slot this week.",
    "Europe takes the early slot this week.",
    "Asia takes the late slot this week.",
    "Middle East and Asia share the burden this week.",
  ])

  return [
    {
      id: "demo-schedule-1",
      name: "Product Team Sync",
      team_id: "demo-meeting-pts",
      weeks: 4,
      created_at: now,
      rotation_result: {
        weeks: ptsWeeks,
        modeUsed: "STRICT",
        explain: { shareablePlanExists: true },
      },
    },
    {
      id: "demo-schedule-2",
      name: "Global Engineering Sync",
      team_id: "demo-meeting-ges",
      weeks: 4,
      created_at: now,
      rotation_result: {
        weeks: gesWeeks,
        modeUsed: "STRICT",
        explain: { shareablePlanExists: true },
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
