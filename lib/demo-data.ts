/**
 * Landing-page demo: fully static, curated marketing snapshots.
 * Each scenario is one self-contained authored preview — NOT live engine output.
 * No Supabase, no auth, no generation. All data is manually aligned.
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

/** Get UTC offset in hours for an IANA timezone (DST-aware). */
function getTzOffsetHours(iana: string): number {
  return DateTime.now().setZone(iana).offset / 60
}

type WeekOverride = {
  weekIndex: number
  memberId: string
  discomfort: Discomfort
  score: number
}

/**
 * One fully authored static scenario per demo team.
 * Contains everything needed for all demo screens. No derivation, no live computation.
 */
export type DemoScenario = {
  /** Team/meeting metadata */
  meeting: DbMeeting
  /** Member list — same order everywhere */
  members: DbMemberSubmission[]
  /** Schedule preview — authored weeks */
  schedule: {
    scheduleId: string
    /** UTC hours per week (e.g. 12.5 = 12:30 UTC) */
    utcHours: number[]
    /** Per-week, per-member discomfort overrides */
    weekOverrides: WeekOverride[]
    /** Week card explanation copy */
    weekExplanations: string[]
  }
  /** Burden chart — authored counts */
  burden: {
    memberCounts: Record<string, number>
    maxUncomfortable: number
    maxDiff: number
  }
  /** Summary bullets for schedule detail (optional overrides; else derived from burden) */
  summaryBullets?: string[]
  /** Short scenario tagline for UI (e.g. "Comfortable rotation" / "Balanced global distribution") */
  tagline?: string
}

function buildWeeksFromScenario(scenario: DemoScenario): RotationWeekData[] {
  const baseDate = DateTime.now().startOf("week").plus({ weeks: 1 })
  const overrideMap = new Map<string, { discomfort: Discomfort; score: number }>()
  for (const o of scenario.schedule.weekOverrides) {
    overrideMap.set(`${o.weekIndex}:${o.memberId}`, {
      discomfort: o.discomfort,
      score: o.score,
    })
  }
  const scheduleMembers = scenario.members.map((m) => ({
    id: m.id,
    tzOffset: getTzOffsetHours(m.timezone),
    workStartHour: m.work_start_hour,
    workEndHour: m.work_end_hour,
  }))

  return scenario.schedule.utcHours.map((utcHour, i) => {
    const utcDate = baseDate.plus({ weeks: i })
    const utcDateIso = utcDate.toISODate() ?? ""
    const memberTimes = scheduleMembers.map(
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
        return {
          memberId: id,
          localHour,
          localTime,
          discomfort: override?.discomfort ?? "comfortable",
          score: override?.score ?? 0,
          dateOffset,
        }
      }
    )
    return {
      week: i + 1,
      date: utcDate.toFormat("EEE MMM d"),
      utcDateIso,
      utcHour,
      memberTimes,
      explanation: scenario.schedule.weekExplanations[i] ?? "This week.",
    }
  })
}

/** All demo scenarios — single source of truth. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    meeting: {
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
    members: [
      { id: "pts-1", meeting_id: "demo-meeting-pts", name: "Marcus Chen", timezone: "America/New_York", work_start_hour: 9, work_end_hour: 18, hard_no_ranges: [{ start: 0, end: 6 }], role: null, is_owner_participant: true, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "pts-2", meeting_id: "demo-meeting-pts", name: "Emma Thompson", timezone: "Europe/London", work_start_hour: 9, work_end_hour: 18, hard_no_ranges: [{ start: 23, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "pts-3", meeting_id: "demo-meeting-pts", name: "Omar Al-Rashid", timezone: "Asia/Dubai", work_start_hour: 9, work_end_hour: 19, hard_no_ranges: [{ start: 0, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "pts-4", meeting_id: "demo-meeting-pts", name: "Yuki Tanaka", timezone: "Asia/Tokyo", work_start_hour: 10, work_end_hour: 20, hard_no_ranges: [{ start: 0, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
    ],
    schedule: {
      scheduleId: "demo-schedule-1",
      utcHours: [12.5, 13, 12, 13.5],
      weekOverrides: [
        { weekIndex: 0, memberId: "pts-1", discomfort: "stretch", score: 1 },
        { weekIndex: 0, memberId: "pts-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 0, memberId: "pts-3", discomfort: "stretch", score: 1 },
        { weekIndex: 0, memberId: "pts-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "pts-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "pts-2", discomfort: "stretch", score: 1 },
        { weekIndex: 1, memberId: "pts-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "pts-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 2, memberId: "pts-1", discomfort: "stretch", score: 1 },
        { weekIndex: 2, memberId: "pts-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 2, memberId: "pts-3", discomfort: "stretch", score: 1 },
        { weekIndex: 2, memberId: "pts-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "pts-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "pts-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "pts-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "pts-4", discomfort: "stretch", score: 1 },
      ],
      weekExplanations: [
        "Marcus and Omar take the early slot this week.",
        "Emma takes the early slot this week.",
        "Marcus and Omar share the early slot this week.",
        "Yuki takes the early slot this week.",
      ],
    },
    burden: {
      memberCounts: { "pts-1": 2, "pts-2": 1, "pts-3": 2, "pts-4": 1 },
      maxUncomfortable: 2,
      maxDiff: 1,
    },
    tagline: "Comfortable rotation with shared early slots.",
  },
  {
    meeting: {
      id: "demo-meeting-ges",
      manager_id: DEMO_USER_ID,
      title: "Global Engineering Sync",
      day_of_week: 3,
      duration_minutes: 60,
      rotation_weeks: 8,
      anchor_offset: anchorOffset,
      display_timezone: "America/New_York",
      base_time_minutes: null,
      start_date: null,
      published_schedule: null,
      invite_token: "demo-invite-ges",
      created_at: NOW,
    },
    members: [
      { id: "ges-1", meeting_id: "demo-meeting-ges", name: "Sarah Mitchell", timezone: "America/Chicago", work_start_hour: 8, work_end_hour: 17, hard_no_ranges: [{ start: 0, end: 6 }], role: null, is_owner_participant: true, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-2", meeting_id: "demo-meeting-ges", name: "James Wilson", timezone: "America/New_York", work_start_hour: 9, work_end_hour: 18, hard_no_ranges: [{ start: 0, end: 6 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-3", meeting_id: "demo-meeting-ges", name: "Olivia Clarke", timezone: "Europe/London", work_start_hour: 9, work_end_hour: 18, hard_no_ranges: [{ start: 23, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-4", meeting_id: "demo-meeting-ges", name: "Lukas Weber", timezone: "Europe/Berlin", work_start_hour: 9, work_end_hour: 18, hard_no_ranges: [{ start: 23, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-5", meeting_id: "demo-meeting-ges", name: "Fatima Hassan", timezone: "Asia/Dubai", work_start_hour: 9, work_end_hour: 19, hard_no_ranges: [{ start: 0, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-6", meeting_id: "demo-meeting-ges", name: "Arjun Patel", timezone: "Asia/Kolkata", work_start_hour: 10, work_end_hour: 19, hard_no_ranges: [{ start: 0, end: 8 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-7", meeting_id: "demo-meeting-ges", name: "Wei Zhang", timezone: "Asia/Singapore", work_start_hour: 9, work_end_hour: 19, hard_no_ranges: [{ start: 0, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
      { id: "ges-8", meeting_id: "demo-meeting-ges", name: "Kenji Yamamoto", timezone: "Asia/Tokyo", work_start_hour: 10, work_end_hour: 20, hard_no_ranges: [{ start: 0, end: 7 }], role: null, is_owner_participant: false, avatar_url: null, user_id: null, created_at: NOW, updated_at: NOW },
    ],
    schedule: {
      scheduleId: "demo-schedule-2",
      utcHours: [12.5, 13, 13.5, 14, 12.5, 13, 13.5, 14],
      weekOverrides: [
        { weekIndex: 0, memberId: "ges-1", discomfort: "stretch", score: 1 },
        { weekIndex: 0, memberId: "ges-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 0, memberId: "ges-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 0, memberId: "ges-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 0, memberId: "ges-5", discomfort: "stretch", score: 1 },
        { weekIndex: 0, memberId: "ges-6", discomfort: "comfortable", score: 0 },
        { weekIndex: 0, memberId: "ges-7", discomfort: "stretch", score: 1 },
        { weekIndex: 0, memberId: "ges-8", discomfort: "stretch", score: 1 },
        { weekIndex: 1, memberId: "ges-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "ges-2", discomfort: "stretch", score: 1 },
        { weekIndex: 1, memberId: "ges-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "ges-4", discomfort: "stretch", score: 1 },
        { weekIndex: 1, memberId: "ges-5", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "ges-6", discomfort: "comfortable", score: 0 },
        { weekIndex: 1, memberId: "ges-7", discomfort: "stretch", score: 1 },
        { weekIndex: 1, memberId: "ges-8", discomfort: "stretch", score: 1 },
        { weekIndex: 2, memberId: "ges-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 2, memberId: "ges-2", discomfort: "stretch", score: 1 },
        { weekIndex: 2, memberId: "ges-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 2, memberId: "ges-4", discomfort: "stretch", score: 1 },
        { weekIndex: 2, memberId: "ges-5", discomfort: "comfortable", score: 0 },
        { weekIndex: 2, memberId: "ges-6", discomfort: "stretch", score: 1 },
        { weekIndex: 2, memberId: "ges-7", discomfort: "comfortable", score: 0 },
        { weekIndex: 2, memberId: "ges-8", discomfort: "stretch", score: 1 },
        { weekIndex: 3, memberId: "ges-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "ges-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "ges-3", discomfort: "stretch", score: 1 },
        { weekIndex: 3, memberId: "ges-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 3, memberId: "ges-5", discomfort: "stretch", score: 1 },
        { weekIndex: 3, memberId: "ges-6", discomfort: "stretch", score: 1 },
        { weekIndex: 3, memberId: "ges-7", discomfort: "stretch", score: 1 },
        { weekIndex: 3, memberId: "ges-8", discomfort: "comfortable", score: 0 },
        { weekIndex: 4, memberId: "ges-1", discomfort: "stretch", score: 1 },
        { weekIndex: 4, memberId: "ges-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 4, memberId: "ges-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 4, memberId: "ges-4", discomfort: "stretch", score: 1 },
        { weekIndex: 4, memberId: "ges-5", discomfort: "comfortable", score: 0 },
        { weekIndex: 4, memberId: "ges-6", discomfort: "comfortable", score: 0 },
        { weekIndex: 4, memberId: "ges-7", discomfort: "stretch", score: 1 },
        { weekIndex: 4, memberId: "ges-8", discomfort: "stretch", score: 1 },
        { weekIndex: 5, memberId: "ges-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 5, memberId: "ges-2", discomfort: "stretch", score: 1 },
        { weekIndex: 5, memberId: "ges-3", discomfort: "stretch", score: 1 },
        { weekIndex: 5, memberId: "ges-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 5, memberId: "ges-5", discomfort: "comfortable", score: 0 },
        { weekIndex: 5, memberId: "ges-6", discomfort: "stretch", score: 1 },
        { weekIndex: 5, memberId: "ges-7", discomfort: "comfortable", score: 0 },
        { weekIndex: 5, memberId: "ges-8", discomfort: "stretch", score: 1 },
        { weekIndex: 6, memberId: "ges-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 6, memberId: "ges-2", discomfort: "comfortable", score: 0 },
        { weekIndex: 6, memberId: "ges-3", discomfort: "stretch", score: 1 },
        { weekIndex: 6, memberId: "ges-4", discomfort: "stretch", score: 1 },
        { weekIndex: 6, memberId: "ges-5", discomfort: "stretch", score: 1 },
        { weekIndex: 6, memberId: "ges-6", discomfort: "comfortable", score: 0 },
        { weekIndex: 6, memberId: "ges-7", discomfort: "stretch", score: 1 },
        { weekIndex: 6, memberId: "ges-8", discomfort: "comfortable", score: 0 },
        { weekIndex: 7, memberId: "ges-1", discomfort: "comfortable", score: 0 },
        { weekIndex: 7, memberId: "ges-2", discomfort: "stretch", score: 1 },
        { weekIndex: 7, memberId: "ges-3", discomfort: "comfortable", score: 0 },
        { weekIndex: 7, memberId: "ges-4", discomfort: "comfortable", score: 0 },
        { weekIndex: 7, memberId: "ges-5", discomfort: "stretch", score: 1 },
        { weekIndex: 7, memberId: "ges-6", discomfort: "stretch", score: 1 },
        { weekIndex: 7, memberId: "ges-7", discomfort: "comfortable", score: 0 },
        { weekIndex: 7, memberId: "ges-8", discomfort: "stretch", score: 1 },
      ],
      weekExplanations: [
        "Sarah, Fatima, Wei, and Kenji take the early slot this week.",
        "James, Lukas, Wei, and Kenji share the early slot this week.",
        "James, Lukas, Arjun, and Kenji take the early slot this week.",
        "Olivia, Fatima, Arjun, and Wei share the burden this week.",
        "Sarah, Lukas, and Wei take the early slot this week.",
        "James, Olivia, and Arjun share the early slot this week.",
        "Olivia, Lukas, Fatima, and Wei share the burden this week.",
        "James, Fatima, Arjun, and Kenji take the early slot this week.",
      ],
    },
    burden: {
      memberCounts: { "ges-1": 2, "ges-2": 3, "ges-3": 2, "ges-4": 3, "ges-5": 3, "ges-6": 3, "ges-7": 3, "ges-8": 4 },
      maxUncomfortable: 4,
      maxDiff: 2,
    },
    tagline: "Balanced burden across a global team.",
  },
]

// ─── Derived from DEMO_SCENARIOS ───────────────────────────────────────────

export const DEMO_MEETINGS: DbMeeting[] = DEMO_SCENARIOS.map((s) => s.meeting)

export const DEMO_MEMBERS_BY_MEETING: Record<string, DbMemberSubmission[]> =
  Object.fromEntries(DEMO_SCENARIOS.map((s) => [s.meeting.id, s.members]))

export const DEMO_BURDEN_SUMMARY: Record<
  string,
  { maxUncomfortable: number; maxDiff: number }
> = Object.fromEntries(
  DEMO_SCENARIOS.map((s) => [
    s.meeting.id,
    {
      maxUncomfortable: s.burden.maxUncomfortable,
      maxDiff: s.burden.maxDiff,
    },
  ])
)

export function getDemoBurdenData(
  meetingId: string,
  membersDisplay: Map<string, { name: string; avatarUrl: string }>
): {
  memberId: string
  name: string
  count: number
  sacrificeCount: number
  sacrificePoints?: number
}[] {
  const scenario = DEMO_SCENARIOS.find((s) => s.meeting.id === meetingId)
  if (!scenario) return []
  return scenario.members.map((m) => ({
    memberId: m.id,
    name: membersDisplay.get(m.id)?.name ?? m.name,
    count: scenario.burden.memberCounts[m.id] ?? 0,
    sacrificeCount: 0,
    sacrificePoints: 0,
  }))
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

export function getInitialDemoSchedules(): DemoSchedule[] {
  const now = new Date().toISOString()
  return DEMO_SCENARIOS.map((scenario) => {
    const weeks = buildWeeksFromScenario(scenario)
    return {
      id: scenario.schedule.scheduleId,
      name: scenario.meeting.title,
      team_id: scenario.meeting.id,
      weeks: weeks.length,
      created_at: now,
      rotation_result: {
        weeks,
        modeUsed: "STRICT",
        explain: { shareablePlanExists: true },
      },
    }
  })
}

export function getDemoMembersDisplay(
  members: DbMemberSubmission[]
): Map<string, { name: string; avatarUrl: string }> {
  const map = new Map<string, { name: string; avatarUrl: string }>()
  for (const m of members) {
    map.set(m.id, { name: m.name, avatarUrl: m.avatar_url ?? "" })
  }
  return map
}

export function getDemoScenarioByMeetingId(meetingId: string): DemoScenario | null {
  return DEMO_SCENARIOS.find((s) => s.meeting.id === meetingId) ?? null
}

export function getDemoScenarioByScheduleId(scheduleId: string): DemoScenario | null {
  return DEMO_SCENARIOS.find((s) => s.schedule.scheduleId === scheduleId) ?? null
}

/** Resolve meeting + members from scenario by scheduleId. */
export function getDemoMeetingAndMembersByScheduleId(scheduleId: string): {
  meeting: DbMeeting
  members: DbMemberSubmission[]
} | null {
  const scenario = getDemoScenarioByScheduleId(scheduleId)
  if (!scenario) return null
  return { meeting: scenario.meeting, members: scenario.members }
}

/** Resolve meeting + members from scenario by meetingId. */
export function getDemoMeetingAndMembersByMeetingId(meetingId: string): {
  meeting: DbMeeting
  members: DbMemberSubmission[]
} | null {
  const scenario = getDemoScenarioByMeetingId(meetingId)
  if (!scenario) return null
  return { meeting: scenario.meeting, members: scenario.members }
}

/** Get pre-built weeks for a demo meeting (for Rotation preview). */
export function getDemoPreviewWeeksForMeeting(meetingId: string): RotationWeekData[] | null {
  const scenario = getDemoScenarioByMeetingId(meetingId)
  if (!scenario) return null
  return buildWeeksFromScenario(scenario)
}
