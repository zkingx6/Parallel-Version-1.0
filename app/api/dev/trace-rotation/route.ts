/**
 * DEV ONLY: Trace rotation for a real meeting from Supabase.
 * GET /api/dev/trace-rotation?meetingId=<id> | ?title=<substring>
 * - Returns meeting, team, finalResult, perWeekTrace.
 * - No auth, read-only, uses service role.
 * - Does NOT modify any production scheduling behavior.
 */
import { NextRequest, NextResponse } from "next/server"
import { isDevRouteAllowed } from "@/lib/dev-route-guard"
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
  computeConsecutiveMax,
} from "@/lib/rotation"
import { DEFAULT_FAIRNESS_THRESHOLDS, type TeamMember } from "@/lib/types"
import { validateTeamInput } from "@/lib/contract/validateTeamInput"

export async function GET(request: NextRequest) {
  if (!isDevRouteAllowed()) {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(request.url)
  const meetingId = searchParams.get("meetingId")
  const title = searchParams.get("title")
  const devSkipBurdenDiff = searchParams.get("devSkipBurdenDiff") === "1"

  if (!meetingId && !title) {
    return NextResponse.json(
      { error: "Provide meetingId or title query param" },
      { status: 400 }
    )
  }

  const supabase = createServiceSupabase()

  let meeting: DbMeeting | null = null

  if (meetingId) {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .single()
    if (error || !data) {
      return NextResponse.json(
        { error: "Meeting not found", detail: error?.message ?? "No data" },
        { status: 404 }
      )
    }
    meeting = data as DbMeeting
  } else if (title) {
    const { data, error } = await supabase
      .from("meetings")
      .select("id, title")
      .ilike("title", `%${title}%`)
    if (error) {
      return NextResponse.json(
        { error: "Failed to search meetings", detail: error.message },
        { status: 500 }
      )
    }
    const matches = (data ?? []) as { id: string; title: string }[]
    if (matches.length === 0) {
      return NextResponse.json(
        { error: "No meeting matches title", query: title },
        { status: 404 }
      )
    }
    if (matches.length > 1) {
      return NextResponse.json(
        {
          error: "Multiple meetings match title; use meetingId",
          query: title,
          candidates: matches.map((m) => ({ id: m.id, title: m.title })),
        },
        { status: 400 }
      )
    }
    const { data: full, error: fullErr } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", matches[0].id)
      .single()
    if (fullErr || !full) {
      return NextResponse.json(
        { error: "Meeting not found", detail: fullErr?.message ?? "No data" },
        { status: 404 }
      )
    }
    meeting = full as DbMeeting
  }

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  const { data: members, error: membersErr } = await supabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", meeting.id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  if (membersErr) {
    return NextResponse.json(
      { error: "Failed to fetch members", detail: membersErr.message },
      { status: 500 }
    )
  }

  const rawTeam = (members ?? []).map((m: DbMemberSubmission) =>
    dbMemberToTeamMember(m)
  )
  const validation = validateTeamInput(rawTeam)
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 422 }
    )
  }
  const team = validation.team

  const useFixedBaseTime = meeting.base_time_minutes != null
  const meetingForConfig = meeting as DbMeeting
  const baseConfig = dbMeetingToConfig(meetingForConfig)
  const config = {
    ...(useFixedBaseTime
      ? baseConfig
      : {
          ...baseConfig,
          baseTimeMinutes: null,
          anchorOffset: meetingForConfig.anchor_offset,
        }),
    ...(devSkipBurdenDiff && { devSkipBurdenDiff: true }),
  }

  const result = generateRotation(team, config)

  const meetingOut = {
    id: meeting.id,
    title: meeting.title,
    durationMinutes: meeting.duration_minutes,
    rotationWeeks: meeting.rotation_weeks,
    weekday: meeting.day_of_week,
    ...(meeting.display_timezone != null && {
      displayTimezone: meeting.display_timezone,
    }),
  }

  const teamOut = team.map((m: TeamMember) => ({
    memberId: m.id,
    name: m.name,
    timezone: m.timezone,
    workingHours: { start: m.workStartHour, end: m.workEndHour },
    hardNoRanges: m.hardNoRanges,
  }))

  let finalResult: Record<string, unknown>
  let perWeekTrace: Array<Record<string, unknown>> = []

  if (isNoViableTimeResult(result)) {
    finalResult = {
      status: "NO_VIABLE_TIME",
      reason: result.reason,
      diagnosis: result.diagnosis,
    }
  } else if (Array.isArray(result) && result.length === 0) {
    finalResult = {
      status: "EMPTY",
      reason: "No rotation generated (e.g. team size < 2)",
    }
  } else if (isRotationResult(result)) {
    const explain = result.explain
    const evidence = explain.evidence
    // Single source of truth: result.weeks + team. All burden metrics derived here.
    const burdenTotals: Record<string, number> = result.weeks.length
      ? (() => {
          const totals: Record<string, number> = {}
          for (const m of team) totals[m.id] = 0
          for (const w of result.weeks) {
            for (const mt of w.memberTimes) {
              totals[mt.memberId] = (totals[mt.memberId] ?? 0) + (mt.score ?? 0)
            }
          }
          return totals
        })()
      : {}
    const values = Object.values(burdenTotals)
    const minBurden = values.length ? Math.min(...values) : 0
    const maxBurden = values.length ? Math.max(...values) : 0
    const spread = maxBurden - minBurden
    const maxBurdenMemberIds = team
      .filter((m) => (burdenTotals[m.id] ?? 0) === maxBurden)
      .map((m) => m.id)
    const memberById = new Map(team.map((m) => [m.id, m]))
    const maxBurdenMembers = maxBurdenMemberIds.map((id) => {
      const m = memberById.get(id)
      return { memberId: id, name: m?.name ?? null, timezone: m?.timezone ?? null }
    })
    const burdenBreakdown = Object.entries(burdenTotals)
      .map(([memberId]) => {
        const m = memberById.get(memberId)
        return {
          memberId,
          name: m?.name ?? null,
          timezone: m?.timezone ?? null,
          burden: burdenTotals[memberId] ?? 0,
        }
      })
      .sort((a, b) => b.burden - a.burden)
    const maxMemberIdsPerWeek = result.weeks.map((w) => {
      const maxScore = Math.max(
        ...w.memberTimes.map((mt) => mt.score ?? 0),
        0
      )
      if (maxScore === 0) return ""
      const first = w.memberTimes.find((mt) => (mt.score ?? 0) === maxScore)
      return first?.memberId ?? ""
    })
    const consecutiveMax = computeConsecutiveMax(maxMemberIdsPerWeek)
    const thresholds = config.fairnessThresholds ?? DEFAULT_FAIRNESS_THRESHOLDS
    finalResult = {
      actualPathUsed: "generateRotation",
      modeUsed: result.modeUsed,
      traceCoverage: "PATH_ONLY",
      finalWeeks: result.weeks.map((w) => ({
        week: w.week,
        utcHour: w.utcHour,
        utcDateIso: w.utcDateIso,
      })),
      shareablePlanExists: explain.shareablePlanExists,
      spread,
      consecutiveMax,
      minBurden,
      maxBurden,
      spreadLimit: thresholds.spreadLimit,
      consecutiveMaxLimit: thresholds.consecutiveMaxLimit,
      burdenBreakdown,
      maxBurdenMembers,
      burdenTotals: result.weeks.length ? burdenTotals : undefined,
      ...(explain.forcedReason && { forcedReason: explain.forcedReason }),
      ...(explain.forcedSummary && { forcedSummary: explain.forcedSummary }),
      ...(evidence?.beamDebug && { beamDebug: evidence.beamDebug }),
      ...(explain.weeks.some((w) => w.failureReason) && {
        strictFailureAtWeek: explain.weeks.find((w) => w.failureReason)?.week,
        strictFailureReason: explain.weeks.find((w) => w.failureReason)?.failureReason,
      }),
    }
    perWeekTrace = result.weeks.map((w, i) => {
      const ex = explain.weeks[i]
      return {
        week: w.week,
        hardValidCandidatesCount: ex?.hardValidCandidatesCount ?? 0,
        totalCandidatesCount: ex?.totalCandidatesCount ?? 0,
        selectedUtcHour: w.utcHour,
        utcDateIso: w.utcDateIso,
        ...(ex?.failureReason && { failureReason: ex.failureReason }),
        ...(ex?.primaryCause && { primaryCause: ex.primaryCause }),
        ...(evidence?.perWeekFeasibleUtcHours?.[i] != null && {
          feasibleUtcHours: evidence.perWeekFeasibleUtcHours[i],
        }),
      }
    })
  } else {
    finalResult = {
      status: "UNKNOWN",
      reason: "Unexpected result shape",
    }
  }

  return NextResponse.json({
    meeting: meetingOut,
    team: teamOut,
    finalResult,
    perWeekTrace,
  })
}
