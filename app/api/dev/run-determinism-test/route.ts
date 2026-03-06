/**
 * DEV ONLY: Determinism test for rotation algorithm.
 * GET /api/dev/run-determinism
 * - Fetches meeting + member_submissions, runs generateRotation 10x, compares results.
 * - No auth, read-only for member_submissions, uses service role.
 *
 * SAFEGUARD: This route must NEVER write to member_submissions.
 * - Only reads member_submissions; only updates meetings.anchor_offset when needed.
 * - hard_no_ranges must never be derived from overlap/selected time or persisted here.
 */
import { NextResponse } from "next/server"
import { createServiceSupabase } from "@/lib/supabase-server"
import {
  dbMemberToTeamMember,
  dbMeetingToConfig,
  type DbMeeting,
  type DbMemberSubmission,
} from "@/lib/database.types"
import {
  generateRotation,
  isRotationResult,
  isNoViableTimeResult,
} from "@/lib/rotation"
import type { TeamMember } from "@/lib/types"
import { DateTime } from "luxon"
import {
  ensureDisplayTimezoneIana,
  getMemberTimezone,
  getOffsetLabelForLocalDateTime,
  getTimezoneDisplayLabelNow,
  utcToLocalInZone,
} from "@/lib/timezone"
import {
  validateResultInvariants,
  validateMaxBurdenConsistency,
  type ResultInvariantViolation,
} from "@/lib/run-determinism-invariants"
import { validateTeamInput } from "@/lib/contract/validateTeamInput"

const MEETING_ID = "363b08dc-3b9f-4914-bc78-02c1c470ccd4"

function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const intH = Math.floor(h)
  const minutes = Math.round((h - intH) * 60)
  const minStr = minutes.toString().padStart(2, "0")
  if (intH === 0) return `12:${minStr} AM`
  if (intH === 12) return `12:${minStr} PM`
  return intH < 12 ? `${intH}:${minStr} AM` : `${intH - 12}:${minStr} PM`
}

type RunSnapshot = {
  modeUsed: string | undefined
  shareablePlanExists: boolean | undefined
  spread: number | undefined
  selectedTimes: number[]
  maxBurdenMembers: string[]
  evidence: unknown
  status?: string
}

function extractSnapshot(
  result: ReturnType<typeof generateRotation>
): RunSnapshot {
  if (isNoViableTimeResult(result)) {
    return {
      modeUsed: undefined,
      shareablePlanExists: undefined,
      spread: undefined,
      selectedTimes: [],
      maxBurdenMembers: [],
      evidence: undefined,
      status: "NO_VIABLE_TIME",
    }
  }
  if (Array.isArray(result) && result.length === 0) {
    return {
      modeUsed: undefined,
      shareablePlanExists: undefined,
      spread: undefined,
      selectedTimes: [],
      maxBurdenMembers: [],
      evidence: undefined,
      status: "EMPTY",
    }
  }
  if (isRotationResult(result)) {
    const explain = result.explain
    return {
      modeUsed: result.modeUsed,
      shareablePlanExists: explain.shareablePlanExists,
      spread: explain.currentPlanMetrics?.spread,
      selectedTimes: result.weeks.map((w) => w.utcHour),
      maxBurdenMembers: explain.currentPlanMetrics?.maxBurdenMemberIds ?? [],
      evidence: explain.evidence,
    }
  }
  return {
    modeUsed: undefined,
    shareablePlanExists: undefined,
    spread: undefined,
    selectedTimes: [],
    maxBurdenMembers: [],
    evidence: undefined,
    status: "UNKNOWN",
  }
}

function snapshotsDiffer(a: RunSnapshot, b: RunSnapshot): string[] {
  const diffs: string[] = []
  if (a.modeUsed !== b.modeUsed) diffs.push("modeUsed")
  if (a.shareablePlanExists !== b.shareablePlanExists)
    diffs.push("shareablePlanExists")
  if (a.spread !== b.spread) diffs.push("spread")
  if (
    JSON.stringify(a.selectedTimes) !== JSON.stringify(b.selectedTimes)
  )
    diffs.push("selectedTimes")
  if (
    JSON.stringify(a.maxBurdenMembers) !== JSON.stringify(b.maxBurdenMembers)
  )
    diffs.push("maxBurdenMembers")
  if (JSON.stringify(a.evidence) !== JSON.stringify(b.evidence))
    diffs.push("evidence")
  if (a.status !== b.status) diffs.push("status")
  return diffs
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 404 }
    )
  }

  const supabase = createServiceSupabase()

  const { data: meeting, error: meetingErr } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", MEETING_ID)
    .single()

  if (meetingErr || !meeting) {
    return NextResponse.json(
      {
        ok: false,
        error: "Meeting not found",
        detail: meetingErr?.message ?? "No data",
      },
      { status: 404 }
    )
  }

  const { data: members, error: membersErr } = await supabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", MEETING_ID)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  if (membersErr) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch members", detail: membersErr.message },
      { status: 500 }
    )
  }

  const rawTeam = (members ?? []).map((m: DbMemberSubmission) =>
    dbMemberToTeamMember(m)
  )
  const validation = validateTeamInput(rawTeam)
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: validation.error,
      },
      { status: 422 }
    )
  }
  const team = validation.team
  const useFixedBaseTime = meeting.base_time_minutes != null

  let meetingForConfig = meeting as DbMeeting
  if (!useFixedBaseTime && meeting.anchor_offset !== 0) {
    await supabase
      .from("meetings")
      .update({ anchor_offset: 0 })
      .eq("id", MEETING_ID)
    meetingForConfig = { ...meeting, anchor_offset: 0 } as DbMeeting
  }

  const baseConfig = dbMeetingToConfig(meetingForConfig)
  // Config uses meeting.base_time_minutes (same as UI anchor time) when useFixedBaseTime
  const config = useFixedBaseTime
    ? baseConfig
    : {
        ...baseConfig,
        baseTimeMinutes: null,
        anchorOffset: meetingForConfig.anchor_offset,
      }

  // --- DST debug: before generateRotation ---
  const displayTimezoneRaw = (meeting as DbMeeting).display_timezone ?? null
  const startDateRaw = (meeting as DbMeeting).start_date ?? null
  const week1DateIso =
    startDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(startDateRaw.trim())
      ? startDateRaw
      : (() => {
          const now = DateTime.utc()
          const current = now.weekday
          const dayOfWeek = meeting.day_of_week
          let daysUntil = dayOfWeek - current
          if (daysUntil <= 0) daysUntil += 7
          return now.plus({ days: daysUntil }).toISODate() ?? ""
        })()
  const displayTimezoneIana = ensureDisplayTimezoneIana(displayTimezoneRaw)
  const week1DtAtNoon = DateTime.fromISO(week1DateIso, {
    zone: displayTimezoneIana,
  }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
  const week1OffsetMinutes = week1DtAtNoon.offset
  const labelFromNow = getTimezoneDisplayLabelNow(displayTimezoneIana)
  const labelForWeek1 = getOffsetLabelForLocalDateTime(
    displayTimezoneIana,
    week1DateIso,
    12,
    0
  )

  console.log("[run-determinism] DST debug:")
  console.log("  displayTimezone (raw):", JSON.stringify(displayTimezoneRaw))
  console.log("  startDate (raw):", JSON.stringify(startDateRaw))
  console.log("  week1Date (computed):", week1DateIso)
  console.log("  displayTimezone (IANA resolved):", displayTimezoneIana)
  console.log("  week1OffsetMinutes:", week1OffsetMinutes)
  console.log("  labelFromNow:", JSON.stringify(labelFromNow))
  console.log("  labelForWeek1:", JSON.stringify(labelForWeek1))

  // --- Debug: before generateRotation ---
  const debugMeetingConfig = {
    day_of_week: meeting.day_of_week,
    start_date: (meeting as DbMeeting).start_date ?? null,
    duration_minutes: meeting.duration_minutes,
    rotation_weeks: meeting.rotation_weeks,
    anchor_offset: meetingForConfig.anchor_offset,
    base_time_minutes: meeting.base_time_minutes ?? null,
    useFixedBaseTime,
    effective_anchor_offset: config.anchorOffset,
  }
  const debugRawMembers = (members ?? []).map((m: DbMemberSubmission) => ({
    name: m.name,
    timezone: dbMemberToTeamMember(m).timezone,
    work_start_hour: m.work_start_hour,
    work_end_hour: m.work_end_hour,
    hard_no_ranges: m.hard_no_ranges,
  }))
  const debugTeamMembers = team.map((m: TeamMember) => ({
    memberId: m.id,
    name: m.name,
    timezone: m.timezone,
    workWindowLocal: `${formatHourLabel(m.workStartHour)}–${formatHourLabel(m.workEndHour)}`,
    hardNoRanges: m.hardNoRanges,
  }))

  console.log("[run-determinism] meeting:", debugMeetingConfig)
  console.log(
    "[run-determinism] chosen start_date:",
    (meeting as DbMeeting).start_date ?? `next occurrence of weekday ${meeting.day_of_week}`
  )
  console.log("[run-determinism] raw member_submissions:", JSON.stringify(debugRawMembers, null, 2))
  console.log("[run-determinism] computed TeamMembers:", JSON.stringify(debugTeamMembers, null, 2))

  const runs: (RunSnapshot & { runIndex: number })[] = []
  let firstRotationResult: ReturnType<typeof generateRotation> | null = null
  const resultInvariantViolations: ResultInvariantViolation[] = []

  for (let i = 0; i < 10; i++) {
    const result = generateRotation(team, config)
    if (i === 0) firstRotationResult = result
    runs.push({
      runIndex: i,
      ...extractSnapshot(result),
    })

    if (isRotationResult(result) && result.weeks.length > 0) {
      const invViolations = validateResultInvariants(
        result.weeks,
        team,
        config,
        i
      )
      resultInvariantViolations.push(...invViolations)

      const maxBurdenViolations = validateMaxBurdenConsistency(
        result.weeks,
        team,
        result.explain.currentPlanMetrics,
        i
      )
      resultInvariantViolations.push(...maxBurdenViolations)
    }
  }

  // --- Debug: week1 after generation ---
  let debugWeek1: {
    selectedTimeUtcHour: number
    perMember: Array<{
      memberId: string
      name: string
      localHour: number
      localTime: string
      localDateLabel?: string
    }>
  } | null = null
  if (
    firstRotationResult &&
    isRotationResult(firstRotationResult) &&
    firstRotationResult.weeks.length > 0
  ) {
    const w1 = firstRotationResult.weeks[0]
    const weekDates = firstRotationResult.weeks
      .map((w) => w.utcDateIso ?? "?")
      .filter((d) => d !== "?")
    console.log("[run-determinism] week dates (for DST testing):", weekDates)
    console.log("[run-determinism] week1 selectedTime UTC hour:", w1.utcHour)
    console.log(
      "[run-determinism] week1 per-member:",
      JSON.stringify(
        w1.memberTimes.map((mt) => {
          const member = team.find((t) => t.id === mt.memberId)
          return {
            name: member?.name ?? mt.memberId,
            localHour: mt.localHour,
            localTime: mt.localTime,
            localDateLabel: mt.localDateLabel,
          }
        }),
        null,
        2
      )
    )
    debugWeek1 = {
      selectedTimeUtcHour: w1.utcHour,
      perMember: w1.memberTimes.map((mt) => {
        const member = team.find((t) => t.id === mt.memberId)
        return {
          memberId: mt.memberId,
          name: member?.name ?? mt.memberId,
          localHour: mt.localHour,
          localTime: mt.localTime,
          localDateLabel: mt.localDateLabel,
        }
      }),
    }
  }

  // --- Display timezone match (legacy) ---
  const displayTzMatchViolations: Array<{
    memberName: string
    memberTimezone: string
    displayTimezone: string
    headerLocalTime: string
    memberLocalTime: string
    reason: string
  }> = []
  if (
    firstRotationResult &&
    isRotationResult(firstRotationResult) &&
    firstRotationResult.weeks.length > 0
  ) {
    const w1 = firstRotationResult.weeks[0]
    const displayTimezone = ensureDisplayTimezoneIana(
      (meeting as DbMeeting).display_timezone ?? "America/New_York"
    )
    const utcDateIso = w1.utcDateIso
    if (utcDateIso) {
      const headerDisplay = utcToLocalInZone(
        utcDateIso,
        w1.utcHour,
        displayTimezone
      )
      for (const mt of w1.memberTimes) {
        const member = team.find((t) => t.id === mt.memberId)
        if (!member) continue
        const memberTimezone = getMemberTimezone(member.timezone)
        if (memberTimezone === displayTimezone && mt.localTime !== headerDisplay.localTime) {
          displayTzMatchViolations.push({
            memberName: member.name,
            memberTimezone,
            displayTimezone,
            headerLocalTime: headerDisplay.localTime,
            memberLocalTime: mt.localTime,
            reason:
              "Member in same timezone as display must show same time as header",
          })
        }
      }
    }
  }

  const first = runs[0]
  const allDiffs: string[] = []
  for (let i = 1; i < runs.length; i++) {
    const d = snapshotsDiffer(first, runs[i])
    if (d.length > 0) {
      allDiffs.push(...d)
    }
  }
  const uniqueDiffs = [...new Set(allDiffs)]
  const ok =
    uniqueDiffs.length === 0 &&
    resultInvariantViolations.length === 0 &&
    displayTzMatchViolations.length === 0

  const week1FeasibleUtcHours =
    firstRotationResult &&
    isRotationResult(firstRotationResult) &&
    firstRotationResult.explain.evidence?.perWeekFeasibleUtcHours?.[0]

  const weekDates =
    firstRotationResult &&
    isRotationResult(firstRotationResult)
      ? firstRotationResult.weeks
          .map((w) => w.utcDateIso ?? "?")
          .filter((d) => d !== "?")
      : []

  return NextResponse.json({
    ok,
    ...(uniqueDiffs.length > 0 && { differingFields: uniqueDiffs }),
    ...(resultInvariantViolations.length > 0 && {
      violations: resultInvariantViolations,
    }),
    ...(displayTzMatchViolations.length > 0 && {
      displayTzMatchViolations,
    }),
    runs,
    debug: {
      meetingConfig: debugMeetingConfig,
      chosenStartDate: (meeting as DbMeeting).start_date ?? `next occurrence of weekday ${meeting.day_of_week}`,
      weekDates,
      dstDebug: {
        displayTimezoneRaw,
        startDateRaw,
        week1DateIso,
        displayTimezoneIana,
        week1OffsetMinutes,
        week1OffsetHours: week1OffsetMinutes / 60,
        labelFromNow,
        labelForWeek1,
      },
      rawMemberSubmissions: debugRawMembers,
      computedTeamMembers: debugTeamMembers,
      week1: debugWeek1,
      perWeekHardValidCount:
        firstRotationResult &&
        isRotationResult(firstRotationResult) &&
        firstRotationResult.explain.evidence?.perWeekHardValidCount,
      week1FeasibleUtcHours,
      ...(resultInvariantViolations.length > 0 && {
        resultInvariantViolations,
      }),
      ...(displayTzMatchViolations.length > 0 && {
        displayTzMatchViolations,
      }),
    },
  })
}
