import { DateTime } from "luxon"
import { validateTeamInput } from "./contract/validateTeamInput"
import type { ValidateTeamInputError } from "./contract/validateTeamInput"
import {
  TeamMember,
  MeetingConfig,
  RotationWeekData,
  MemberTime,
  Discomfort,
  formatHourLabel,
  type NoViableTimeResult,
  type RotationResult,
  type RotationExplain,
  type WeekExplain,
  type PlanMetrics,
  type FairnessThresholds,
  type ForcedReason,
  type ForcedPlanEvidence,
  DEFAULT_FAIRNESS_THRESHOLDS,
} from "./types"

/**
 * SCHEDULING ENGINE — UTC baseline, IANA timezones, weighted burden
 *
 * Part 1 — Timezone correctness:
 * - All candidate times stored/generated in UTC
 * - Convert UTC → member local (IANA) for boundary/work-hour checks
 * - Hard boundary evaluated in member local time; overnight (start > end) handled
 * - DST: Luxon handles automatically, no manual offset logic
 *
 * Part 2 — Weighted burden:
 * - Score 0–4 per member per week (minutes outside working + extreme hour penalty)
 * - Burden = accumulated score sum
 * - Fairness: burden diff <= BURDEN_DIFF_THRESHOLD, no consecutive max
 */

/** Resolve IANA zone for member. All members have timezone (IANA). */
function getMemberZone(member: TeamMember): string {
  return member.timezone
}

// --- UTC baseline: all scheduling in UTC ---
// Candidate times are UTC. We convert to member local for boundary/work-hour checks.
// Cross-day: e.g. Mar 1 11PM UTC → Tokyo may be Mar 2 8AM (handled by Luxon setZone).

/**
 * Convert UTC meeting time to member's local DateTime.
 * Uses IANA timezone for DST-safe conversion. Cross-day handled automatically.
 */
function utcToLocalDateTime(
  utcDate: DateTime,
  utcHour: number,
  member: TeamMember
): DateTime {
  const utcMeeting = utcDate.set({
    hour: Math.floor(utcHour),
    minute: Math.round((utcHour % 1) * 60),
    second: 0,
    millisecond: 0,
  })
  const zone = getMemberZone(member)
  return utcMeeting.setZone(zone)
}

function utcToLocalHour(
  utcDate: DateTime,
  utcHour: number,
  member: TeamMember
): number {
  const local = utcToLocalDateTime(utcDate, utcHour, member)
  return local.hour + local.minute / 60
}

/**
 * Hard boundary check in member LOCAL time.
 * Overnight rule: if start > end, boundary crosses midnight.
 */
function isInHardNoLocal(
  localHour: number,
  hardNoRanges: { start: number; end: number }[]
): boolean {
  for (const range of hardNoRanges) {
    if (range.start < range.end) {
      if (localHour >= range.start && localHour < range.end) return true
    } else {
      // Overnight: crosses midnight (e.g. 22:00 – 04:00)
      if (localHour >= range.start || localHour < range.end) return true
    }
  }
  return false
}

function isWithinWorkingHours(
  localHour: number,
  workStart: number,
  workEnd: number
): boolean {
  if (workStart < workEnd) {
    return localHour >= workStart && localHour < workEnd
  }
  return localHour >= workStart || localHour < workEnd
}

/**
 * Minutes outside working window (in member local time).
 * Before start: start - time. After end: time - end.
 * Overnight (start > end): within = hour >= start OR hour < end; outside = distance to nearest boundary.
 */
function minutesOutsideWorking(
  localHour: number,
  workStart: number,
  workEnd: number
): number {
  if (isWithinWorkingHours(localHour, workStart, workEnd)) return 0

  const localMinutes = localHour * 60

  if (workStart < workEnd) {
    // Same-day window
    const startMin = workStart * 60
    const endMin = workEnd * 60
    if (localMinutes < startMin) return startMin - localMinutes
    return localMinutes - endMin
  }

  // Overnight window (e.g. 22–6): outside = [6, 22). Distance to nearest boundary.
  const startMin = workStart * 60
  const endMin = workEnd * 60
  const distToEnd = localMinutes >= endMin ? localMinutes - endMin : endMin - localMinutes
  const distToStart = localMinutes < startMin ? startMin - localMinutes : (24 * 60 - localMinutes) + startMin
  return Math.min(distToEnd, distToStart)
}

/**
 * Weighted discomfort score 0–4.
 * - 0 min outside → 0
 * - (0, 120] min → 1
 * - (120, 240] min → 2
 * - > 240 min → 3
 * - Extreme hour (< 7 or >= 21): +1, cap at 4
 */
function computeWeightedDiscomfortScore(
  localHour: number,
  workStart: number,
  workEnd: number
): number {
  const outsideMin = minutesOutsideWorking(localHour, workStart, workEnd)
  let score: number
  if (outsideMin <= 0) score = 0
  else if (outsideMin <= 120) score = 1
  else if (outsideMin <= 240) score = 2
  else score = 3

  if (localHour < 7 || localHour >= 21) {
    score = Math.min(score + 1, 4)
  }
  return score
}

/** Derive display discomfort from score (for UI compatibility). */
function scoreToDiscomfort(score: number): Discomfort {
  if (score === 0) return "comfortable"
  if (score <= 2) return "stretch"
  return "sacrifice"
}

// --- Date utilities (UTC baseline) ---
// Luxon weekday: 1=Monday, 7=Sunday. config.dayOfWeek: 1=Mon, 2=Tue, etc.

function getNextMeetingDayUtc(dayOfWeek: number): DateTime {
  const now = DateTime.utc()
  const current = now.weekday
  let daysUntil = dayOfWeek - current
  if (daysUntil <= 0) daysUntil += 7
  return now.plus({ days: daysUntil }).startOf("day")
}

/**
 * Week 1 date for rotation schedule.
 * If config.startDateIso is set: use that date (UTC).
 * Else: next occurrence of config.dayOfWeek (backward compatible).
 */
function getWeek1DateUtc(config: MeetingConfig): DateTime {
  const iso = config.startDateIso
  if (iso && typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    const dt = DateTime.utc(parseInt(iso.slice(0, 4), 10), parseInt(iso.slice(5, 7), 10), parseInt(iso.slice(8, 10), 10))
    if (dt.isValid) return dt.startOf("day")
  }
  return getNextMeetingDayUtc(config.dayOfWeek)
}

function formatDate(dt: DateTime): string {
  return dt.toLocaleString({
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

// --- Candidate generation: UTC hours for meeting day ---

/** Generate candidate UTC hours (0–24, half-hour steps). */
function getCandidateUtcHours(): number[] {
  const hours: number[] = []
  for (let h = 0; h < 24; h += 0.5) hours.push(h)
  return hours
}

/**
 * Check if candidate UTC time is valid for all members (hard + working hours).
 * A candidate is allowed only if for EVERY member:
 * - localHour within working hours (supports cross-midnight)
 * - localHour NOT in any hardNo range (supports cross-midnight)
 */
function isCandidateValid(
  utcDate: DateTime,
  utcHour: number,
  team: TeamMember[]
): boolean {
  for (const m of team) {
    const localHour = utcToLocalHour(utcDate, utcHour, m)
    if (!isWithinWorkingHours(localHour, m.workStartHour, m.workEndHour))
      return false
    if (isInHardNoLocal(localHour, m.hardNoRanges)) return false
  }
  return true
}

/**
 * Anchor mode: hard boundaries ONLY. Working hours are soft (burden scoring).
 * A candidate is allowed if for EVERY member: localHour NOT in any hardNo range.
 */
function isCandidateHardValid(
  utcDate: DateTime,
  utcHour: number,
  team: TeamMember[]
): boolean {
  for (const m of team) {
    const localHour = utcToLocalHour(utcDate, utcHour, m)
    if (isInHardNoLocal(localHour, m.hardNoRanges)) return false
  }
  return true
}

/** Tunable: max burden diff for STRICT/RELAXED. Score-based burdens use 2. */
const BURDEN_DIFF_THRESHOLD = 2

/**
 * Fairness guardrail: burden difference must be <= BURDEN_DIFF_THRESHOLD.
 * Projected burden = accumulated score + this week's score.
 */
function wouldViolateBurdenDiff(
  team: TeamMember[],
  burden: Record<string, number>,
  memberScores: Map<string, number>
): boolean {
  const projected: Record<string, number> = { ...burden }
  for (const m of team) {
    projected[m.id] = (projected[m.id] ?? 0) + (memberScores.get(m.id) ?? 0)
  }
  const counts = Object.values(projected)
  const maxB = Math.max(...counts)
  const minB = Math.min(...counts)
  return maxB - minB > BURDEN_DIFF_THRESHOLD
}

/**
 * Fairness guardrail: no consecutive max discomfort.
 * Use member(s) with highest score in that week (not binary).
 */
function wouldBeConsecutiveMaxDiscomfort(
  memberTimes: MemberTime[],
  lastWeekMaxMemberId: string | null
): boolean {
  if (!lastWeekMaxMemberId) return false
  const scores = memberTimes.map((m) => m.score ?? 0)
  const maxScore = Math.max(...scores)
  if (maxScore === 0) return false
  const maxMembers = memberTimes.filter((m) => (m.score ?? 0) === maxScore)
  return maxMembers.some((m) => m.memberId === lastWeekMaxMemberId)
}

// --- Find valid candidates for a week ---

/** Convert base time (minutes 0–1439) to UTC hour for given anchor offset. */
function baseTimeMinutesToUtcHour(
  baseTimeMinutes: number,
  anchorOffsetHours: number
): number {
  const displayHour = baseTimeMinutes / 60
  let utcHour = displayHour - anchorOffsetHours
  utcHour = ((utcHour % 24) + 24) % 24
  return Math.round(utcHour * 2) / 2
}

function findValidCandidates(
  utcDate: DateTime,
  team: TeamMember[],
  config?: MeetingConfig | null
): number[] {
  const useAnchorMode = config?.baseTimeMinutes != null
  // Feasible window = 24h minus hard_no_ranges only. Working hours are soft (burden only).
  const isValid = isCandidateHardValid
  let candidates = getCandidateUtcHours().filter((h) =>
    isValid(utcDate, h, team)
  )
  if (useAnchorMode && config!.baseTimeMinutes != null) {
    const weekOffset = getAnchorOffsetForWeek(utcDate, config!)
    const baseUtcHour = baseTimeMinutesToUtcHour(
      config!.baseTimeMinutes,
      weekOffset
    )
    if (
      !candidates.includes(baseUtcHour) &&
      isCandidateHardValid(utcDate, baseUtcHour, team)
    ) {
      candidates = [...candidates, baseUtcHour].sort((a, b) => a - b)
    }
  }
  return candidates
}

/** Circular distance in minutes (0–1439). Used for base-time preference. */
function distanceMinutes(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 1440 - d)
}

/** Convert UTC hour to display-timezone minutes (0–1439). */
function utcHourToDisplayMinutes(utcHour: number, anchorOffsetHours: number): number {
  const displayHour = utcHour + anchorOffsetHours
  const m = Math.round(displayHour * 60)
  return ((m % 1440) + 1440) % 1440
}

/**
 * Anchor offset for a given week.
 * - Auto fair mode (baseTimeMinutes null): uses config.anchorOffset.
 * - Fixed base time: uses config.anchorOffset (captured at selection time).
 *   This ensures absolute time: "9 AM in the anchor zone at selection" stays
 *   the same UTC moment across DST. On Mar 10 (EDT), 9 AM EST → 10 AM EDT.
 */
function getAnchorOffsetForWeek(_utcDate: DateTime, config: MeetingConfig): number {
  return config.anchorOffset
}

/** Sort candidates by proximity to base time (soft preference). Closer first. */
function sortByBaseTimePreference(
  candidates: number[],
  baseTimeMinutes: number,
  anchorOffset: number
): number[] {
  return [...candidates].sort((a, b) => {
    const distA = distanceMinutes(utcHourToDisplayMinutes(a, anchorOffset), baseTimeMinutes)
    const distB = distanceMinutes(utcHourToDisplayMinutes(b, anchorOffset), baseTimeMinutes)
    return distA - distB
  })
}

// --- Constraint modes ---
type ConstraintMode = "STRICT" | "RELAXED" | "FALLBACK"

const DEBUG = typeof process !== "undefined" && process.env.NEXT_PUBLIC_ROTATION_DEBUG === "true"
const DEBUG_ROTATION =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_ROTATION === "true"
const DEBUG_VERIFY =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_ROTATION === "1"

type WeekDebugStats = {
  totalCandidates: number
  hardValidCandidates: number
  rejectedBy: { burdenDiff: number; consecutiveMax: number }
  chosenCandidate?: {
    slotIndex: number
    baseTime: string
    perMember: Record<
      string,
      { localTime: string; dateLabel?: string; discomfort: number; burdenBefore: number; burdenAfter: number }
    >
    projectedBurden: Record<string, number>
  }
}

function computeMemberTimes(
  utcDate: DateTime,
  utcHour: number,
  team: TeamMember[]
): MemberTime[] {
  const utcDayStart = utcDate.startOf("day")
  return team.map((member) => {
    const local = utcToLocalDateTime(utcDate, utcHour, member)
    const localHour = local.hour + local.minute / 60
    const score = computeWeightedDiscomfortScore(
      localHour,
      member.workStartHour,
      member.workEndHour
    )
    const discomfort = scoreToDiscomfort(score)

    const localDayStart = local.startOf("day")
    const diffDays = localDayStart.diff(utcDayStart, "days").days
    const dateOffset = Math.max(-1, Math.min(1, Math.round(diffDays)))
    const localDateLabel =
      dateOffset !== 0
        ? dateOffset > 0
          ? `+${dateOffset} day`
          : `${dateOffset} day`
        : undefined

    return {
      memberId: member.id,
      localHour,
      localTime: formatHourLabel(localHour),
      discomfort,
      score,
      dateOffset: dateOffset !== 0 ? dateOffset : undefined,
      localDateLabel:
        dateOffset !== 0
          ? local.toLocaleString({ weekday: "short", month: "short", day: "numeric" })
          : undefined,
    }
  })
}

function computeTotalScore(memberTimes: MemberTime[]): number {
  return memberTimes.reduce((s, mt) => s + (mt.score ?? 0), 0)
}

function computeMaxIndividualScore(memberTimes: MemberTime[]): number {
  return Math.max(...memberTimes.map((mt) => mt.score ?? 0), 0)
}

/**
 * Compute fairness-adjusted scores for candidate selection.
 * When a member with LOW cumulative burden would get score=0 (comfortable),
 * give them a small "burden sharing" penalty to encourage rotation.
 * This only affects selection, not display.
 */
function computeFairnessAdjustedScores(
  memberTimes: MemberTime[],
  burden: Record<string, number>
): Map<string, number> {
  const maxBurden = Math.max(...Object.values(burden), 0)
  const adjusted = new Map<string, number>()

  for (const mt of memberTimes) {
    const rawScore = mt.score ?? 0
    const currentBurden = burden[mt.memberId] ?? 0
    const burdenDeficit = maxBurden - currentBurden

    if (rawScore === 0 && burdenDeficit >= 2) {
      // Member is comfortable but has significantly less burden than the max.
      // Add a small fairness adjustment to encourage sharing the load.
      // This makes the algorithm prefer candidates where low-burden members
      // take SOME discomfort, even if it increases total discomfort slightly.
      adjusted.set(mt.memberId, 0.5)
    } else {
      adjusted.set(mt.memberId, rawScore)
    }
  }

  return adjusted
}

/**
 * Compute "burden equity penalty" for a candidate.
 * Higher penalty = worse for equity (low-burden members staying at 0).
 */
function computeEquityPenalty(
  memberTimes: MemberTime[],
  burden: Record<string, number>
): number {
  const maxBurden = Math.max(...Object.values(burden), 1)
  let penalty = 0

  for (const mt of memberTimes) {
    const currentBurden = burden[mt.memberId] ?? 0
    const score = mt.score ?? 0
    const burdenDeficit = maxBurden - currentBurden

    if (score === 0 && burdenDeficit > 0) {
      // Low-burden member staying comfortable → bad for equity
      penalty += burdenDeficit
    }
  }

  return penalty
}

/**
 * Internal: generate rotation with given constraint mode.
 * Returns [] if any week has no hard-valid candidates.
 */
/** Slot index 0–47 for utcHour 0–23.5 */
function utcHourToSlotIndex(utcHour: number): number {
  return Math.round(utcHour * 2)
}

function getMaxMemberId(memberTimes: MemberTime[]): string | null {
  const maxScore = computeMaxIndividualScore(memberTimes)
  if (maxScore === 0) return null
  const maxMembers = memberTimes.filter((m) => (m.score ?? 0) === maxScore)
  return maxMembers[0]?.memberId ?? null
}

/** All member IDs with max discomfort score (for rotation penalty). */
function getMaxMemberIds(memberTimes: MemberTime[]): string[] {
  const maxScore = computeMaxIndividualScore(memberTimes)
  if (maxScore === 0) return []
  return memberTimes
    .filter((m) => (m.score ?? 0) === maxScore)
    .map((m) => m.memberId)
}

function computeMaxRepeatPenalty(
  maxMemberId: string | null,
  lastMaxMemberIds: string[]
): number {
  if (!maxMemberId) return 0
  const count = lastMaxMemberIds.filter((id) => id === maxMemberId).length
  return count
}

function derivePrimaryCause(
  rejectedBy: { burdenDiff: number; consecutiveMax: number },
  hardValidCount: number
): "BURDEN_DIFF" | "CONSECUTIVE_MAX" | "MIXED_REJECTIONS" {
  if (rejectedBy.burdenDiff === hardValidCount) return "BURDEN_DIFF"
  if (rejectedBy.consecutiveMax === hardValidCount) return "CONSECUTIVE_MAX"
  return "MIXED_REJECTIONS"
}

function generateRotationWithMode(
  team: TeamMember[],
  config: MeetingConfig,
  mode: ConstraintMode
): { weeks: RotationWeekData[]; modeUsed: ConstraintMode; explain: RotationExplain } {
  const weeks: RotationWeekData[] = []
  const explainWeeks: WeekExplain[] = []
  const burden: Record<string, number> = {}
  let lastWeekMaxMemberId: string | null = null
  let prevSlotIndex: number = -1
  const lastMaxMemberIds: string[] = [] // Rolling window of last 4 weeks' max members
  const STREAK_WINDOW = 4
  const maxDiscomfortCounts: Record<string, number> = {}
  for (const m of team) maxDiscomfortCounts[m.id] = 0
  const ROTATION_PENALTY_WEIGHT = 500 // Significant penalty when member would exceed 60% as max
  const ROTATION_THRESHOLD = 0.6 // Max 60% of weeks as max discomfort member

  const enforceBurdenDiff = mode === "STRICT" || mode === "RELAXED"
  const enforceConsecutiveMax = mode === "STRICT"

  for (const m of team) burden[m.id] = 0

  const utcStart = getWeek1DateUtc(config)

  // Debug: Log team configuration at start
  if (DEBUG) {
    console.group("[ROTATION_DEBUG] Team configuration")
    console.table(
      team.map((m) => ({
        id: m.id.slice(0, 8),
        name: m.name,
        timezone: m.timezone,
        workStart: m.workStartHour,
        workEnd: m.workEndHour,
        hardNoRanges: JSON.stringify(m.hardNoRanges),
      }))
    )
    console.log("Config:", {
      dayOfWeek: config.dayOfWeek,
      rotationWeeks: config.rotationWeeks,
      baseTimeMinutes: config.baseTimeMinutes,
      anchorOffset: config.anchorOffset,
    })
    console.groupEnd()
  }

  for (let i = 0; i < config.rotationWeeks; i++) {
    const utcDate = utcStart.plus({ weeks: i })

    const totalCandidates = getCandidateUtcHours().length
    let hardValidCandidates = findValidCandidates(utcDate, team, config)
    const baseTimeMinutes = config.baseTimeMinutes
    if (baseTimeMinutes != null) {
      const weekOffset = getAnchorOffsetForWeek(utcDate, config)
      hardValidCandidates = sortByBaseTimePreference(
        hardValidCandidates,
        baseTimeMinutes,
        weekOffset
      )
    }

    const rejectedBy = { burdenDiff: 0, consecutiveMax: 0 }

    // Unavoidable sacrifice: same member max for every hard-valid candidate?
    let unavoidableMaxMemberId: string | undefined
    const maxMemberIds = new Set<string | null>()
    for (const utcHour of hardValidCandidates) {
      const mt = computeMemberTimes(utcDate, utcHour, team)
      maxMemberIds.add(getMaxMemberId(mt))
    }
    const uniqueMaxIds = [...maxMemberIds].filter((id): id is string => id != null)
    if (uniqueMaxIds.length === 1) {
      unavoidableMaxMemberId = uniqueMaxIds[0]
    }

    // Rotation feasibility: >1 hard-valid slot AND different maxMember sets exist
    const uniqueMaxSets = new Set<string>()
    for (const utcHour of hardValidCandidates) {
      const mt = computeMemberTimes(utcDate, utcHour, team)
      uniqueMaxSets.add(getMaxMemberIds(mt).sort().join(","))
    }
    const rotationFeasible =
      hardValidCandidates.length > 1 && uniqueMaxSets.size > 1

    // Pre-pass: which candidates would exceed 60% max if selected?
    const candidateWouldExceed60 = new Map<number, boolean>()
    if (rotationFeasible) {
      for (const utcHour of hardValidCandidates) {
        const mt = computeMemberTimes(utcDate, utcHour, team)
        const maxIds = getMaxMemberIds(mt)
        const wouldExceed = maxIds.some(
          (mid) =>
            (maxDiscomfortCounts[mid] + 1) / (i + 1) > ROTATION_THRESHOLD
        )
        candidateWouldExceed60.set(utcHour, wouldExceed)
      }
    }
    const hasRotationAlternative =
      rotationFeasible &&
      [...candidateWouldExceed60.values()].some((v) => !v)

    if (DEBUG_ROTATION) {
      console.group(`[ROTATION_DEBUG] Week ${i + 1}`)
      console.log("hardValidCandidates.length:", hardValidCandidates.length)
      console.log("uniqueMaxSetsCount:", uniqueMaxSets.size)
      console.log("Candidates:")
    }

    if (hardValidCandidates.length === 0) {
      if (DEBUG_ROTATION) {
        console.groupEnd()
      }
      explainWeeks.push({
        week: i + 1,
        hardValidCandidatesCount: 0,
        totalCandidatesCount: totalCandidates,
        rejectedBy,
        failureReason: "NO_HARD_VALID",
        weekHasMultipleBestCandidates: false,
      })
      if (DEBUG) console.log("[ROTATION_DEBUG] week", i + 1, "no hard-valid candidates, aborting")
      return {
        weeks: [],
        modeUsed: mode,
        explain: {
          weeks: explainWeeks,
          modeUsed: mode,
          shareablePlanExists: false,
        },
      }
    }

    // Anchor mode: when user fixed base time, use it if valid (no hard boundary).
    // Do not replace with in-working-hours time just to reduce burden.
    let bestHour: number | null = null
    let bestMemberTimes: MemberTime[] | null = null
    if (baseTimeMinutes != null) {
      const weekOffset = getAnchorOffsetForWeek(utcDate, config)
      const baseUtcHour = baseTimeMinutesToUtcHour(baseTimeMinutes, weekOffset)
      const baseTimeDist = distanceMinutes(
        utcHourToDisplayMinutes(baseUtcHour, weekOffset),
        baseTimeMinutes
      )
      if (baseTimeDist < 1 && hardValidCandidates.includes(baseUtcHour)) {
        bestHour = baseUtcHour
        bestMemberTimes = computeMemberTimes(utcDate, baseUtcHour, team)
      }
    }

    // Fairness weights (configurable)
    const FAIRNESS_WEIGHT = 1000 // Primary: minimax burden
    const EQUITY_WEIGHT = 100   // Secondary: penalize low-burden members staying at 0
    const GAP_WEIGHT = 10       // Tertiary: minimize spread
    const PAIN_WEIGHT = 1       // Quaternary: minimize total discomfort
    const DIVERSITY_WEIGHT = 1  // Favor time slots that differ from previous week
    const STREAK_PENALTY_WEIGHT = 5 // Soft penalty when same member is max too often in rolling window

    let bestScore = Infinity
    let bestMaxProjected = Infinity
    let bestMinProjected = -Infinity
    let bestGap = Infinity
    let bestEquityPenalty = Infinity
    let bestSumDiscomfort = Infinity
    let bestTimeDiversity = -1
    let bestBaseTimeDist = Infinity

    // For debug: collect all candidate evaluations for week 1
    const candidateEvaluations: Array<{
      utcHour: number
      score: number
      maxProjected: number
      minProjected: number
      equityPenalty: number
      gap: number
      sumDiscomfort: number
      perMember: Record<string, { localTime: string; rawScore: number; adjustedScore: number }>
    }> = []

    const candidateDebugLog: Array<{
      candidateTime: string
      maxMemberIds: string[]
      compositeScore: number
      wouldExceedRotationThreshold: boolean
    }> = []

    const SCORE_EPSILON = 1e-6
    const passingCandidateScores: Array<{ utcHour: number; compositeScore: number }> = []

    if (DEBUG_VERIFY && hardValidCandidates.length > 0) {
      type CandidateReport = {
        slotTimeUTC: number
        compositeScore: number
        maxMemberIds: string[]
        wouldExceedRotationThreshold: boolean
        rejectedByBurdenDiff: boolean
        rejectedByConsecutiveMax: boolean
        perMember: Array<{
          memberId: string
          name: string
          localTime: string
          penalty: number
          violatesHardNo: boolean
        }>
        maxBurdenAfter: number
        minBurdenAfter: number
        spreadAfter: number
        sumPenalty: number
      }
      const enumReports: CandidateReport[] = []
      for (const utcHour of hardValidCandidates) {
        const memberTimes = computeMemberTimes(utcDate, utcHour, team)
        const memberScores = new Map<string, number>()
        for (const mt of memberTimes) {
          memberScores.set(mt.memberId, mt.score ?? 0)
        }
        const rejectedByBurdenDiff =
          enforceBurdenDiff && wouldViolateBurdenDiff(team, burden, memberScores)
        const rejectedByConsecutiveMax =
          enforceConsecutiveMax &&
          wouldBeConsecutiveMaxDiscomfort(memberTimes, lastWeekMaxMemberId)

        const adjustedScores = computeFairnessAdjustedScores(memberTimes, burden)
        const projectedBurden: Record<string, number> = { ...burden }
        for (const mt of memberTimes) {
          const adjScore = adjustedScores.get(mt.memberId) ?? 0
          projectedBurden[mt.memberId] =
            (projectedBurden[mt.memberId] ?? 0) + adjScore
        }
        const burdens = Object.values(projectedBurden)
        const maxBurdenAfter = Math.max(...burdens, 0)
        const minBurdenAfter = Math.min(...burdens, 0)
        const spreadAfter = maxBurdenAfter - minBurdenAfter
        const sumPenalty = computeTotalScore(memberTimes)
        const wouldExceed60 = candidateWouldExceed60.get(utcHour) ?? false

        const equityPenalty = computeEquityPenalty(memberTimes, burden)
        const gap = maxBurdenAfter - minBurdenAfter
        const slotIndex = utcHourToSlotIndex(utcHour)
        const timeDiversity =
          prevSlotIndex < 0 ? 0 : Math.abs(slotIndex - prevSlotIndex)
        const candidateMaxMemberId = getMaxMemberId(memberTimes)
        const streakPenalty =
          computeMaxRepeatPenalty(candidateMaxMemberId, lastMaxMemberIds) *
          STREAK_PENALTY_WEIGHT
        const rotationPenalty =
          hasRotationAlternative && wouldExceed60 ? ROTATION_PENALTY_WEIGHT : 0
        const compositeScore =
          maxBurdenAfter * FAIRNESS_WEIGHT +
          equityPenalty * EQUITY_WEIGHT +
          gap * GAP_WEIGHT +
          sumPenalty * PAIN_WEIGHT +
          DIVERSITY_WEIGHT * (-timeDiversity) +
          streakPenalty +
          rotationPenalty

        const maxIds = getMaxMemberIds(memberTimes)
        const perMember = memberTimes.map((mt) => {
          const member = team.find((m) => m.id === mt.memberId)
          const localHour = mt.localHour
          const violatesHardNo = isInHardNoLocal(
            localHour,
            member?.hardNoRanges ?? []
          )
          return {
            memberId: mt.memberId,
            name: member?.name ?? "?",
            localTime: mt.localTime,
            penalty: mt.score ?? 0,
            violatesHardNo,
          }
        })

        enumReports.push({
          slotTimeUTC: utcHour,
          compositeScore,
          maxMemberIds: maxIds.map(
            (id) => team.find((m) => m.id === id)?.name ?? id
          ),
          wouldExceedRotationThreshold: wouldExceed60,
          rejectedByBurdenDiff,
          rejectedByConsecutiveMax,
          perMember,
          maxBurdenAfter,
          minBurdenAfter,
          spreadAfter,
          sumPenalty,
        })
      }
      enumReports.sort(
        (a, b) =>
          a.compositeScore - b.compositeScore || a.slotTimeUTC - b.slotTimeUTC
      )
      const top10 = enumReports.slice(0, 10)
      const bestScoreVal = enumReports[0]?.compositeScore ?? Infinity
      const tiesCount = enumReports.filter(
        (r) => Math.abs(r.compositeScore - bestScoreVal) < SCORE_EPSILON
      ).length
      const weekHasMultipleBestCandidates = tiesCount > 1

      console.group(`[ROTATION_DEBUG] Week ${i + 1} — candidate enumeration`)
      console.log("hardValidCandidatesCount:", hardValidCandidates.length)
      console.log("weekHasMultipleBestCandidates:", weekHasMultipleBestCandidates)
      console.log("tiesInBestScore:", tiesCount)
      console.log("Top 10 candidates:")
      for (const c of top10) {
        console.log(
          `  UTC ${formatHourLabel(c.slotTimeUTC)}: compositeScore=${c.compositeScore.toFixed(1)} maxMembers=[${c.maxMemberIds.join(", ")}] wouldExceed60=${c.wouldExceedRotationThreshold} rejectedBurdenDiff=${c.rejectedByBurdenDiff} rejectedConsecutive=${c.rejectedByConsecutiveMax}`
        )
        for (const p of c.perMember) {
          console.log(
            `    ${p.name}: ${p.localTime} penalty=${p.penalty} violatesHardNo=${p.violatesHardNo}`
          )
        }
        console.log(
          `    → maxBurdenAfter=${c.maxBurdenAfter} minBurdenAfter=${c.minBurdenAfter} spreadAfter=${c.spreadAfter} sumPenalty=${c.sumPenalty}`
        )
      }
      console.groupEnd()
    }

    if (bestHour == null) {
    for (const utcHour of hardValidCandidates) {
      const memberTimes = computeMemberTimes(utcDate, utcHour, team)

      const memberScores = new Map<string, number>()
      for (const mt of memberTimes) {
        memberScores.set(mt.memberId, mt.score ?? 0)
      }

      if (enforceBurdenDiff && wouldViolateBurdenDiff(team, burden, memberScores)) {
        rejectedBy.burdenDiff++
        continue
      }
      if (enforceConsecutiveMax && wouldBeConsecutiveMaxDiscomfort(memberTimes, lastWeekMaxMemberId)) {
        rejectedBy.consecutiveMax++
        continue
      }

      // Use fairness-adjusted scores for selection (not display)
      const adjustedScores = computeFairnessAdjustedScores(memberTimes, burden)

      // Compute projected burden using ADJUSTED scores (for selection)
      const projectedBurden: Record<string, number> = { ...burden }
      for (const mt of memberTimes) {
        const adjScore = adjustedScores.get(mt.memberId) ?? 0
        projectedBurden[mt.memberId] = (projectedBurden[mt.memberId] ?? 0) + adjScore
      }

      const burdens = Object.values(projectedBurden)
      const maxProjected = Math.max(...burdens, 0)
      const minProjected = Math.min(...burdens, 0)
      const gap = maxProjected - minProjected
      const equityPenalty = computeEquityPenalty(memberTimes, burden)
      const sumDiscomfort = computeTotalScore(memberTimes)
      const slotIndex = utcHourToSlotIndex(utcHour)
      const timeDiversity = prevSlotIndex < 0 ? 0 : Math.abs(slotIndex - prevSlotIndex)
      const weekOffset = getAnchorOffsetForWeek(utcDate, config)
      const baseTimeDist =
        baseTimeMinutes != null
          ? distanceMinutes(
              utcHourToDisplayMinutes(utcHour, weekOffset),
              baseTimeMinutes
            )
          : 0

      const candidateMaxMemberId = getMaxMemberId(memberTimes)
      const streakPenalty =
        computeMaxRepeatPenalty(candidateMaxMemberId, lastMaxMemberIds) *
        STREAK_PENALTY_WEIGHT

      // Rotation penalty: when feasible and alternative exists, penalize slots that would
      // cause any member to exceed 60% of weeks as max
      const wouldExceed60 = candidateWouldExceed60.get(utcHour) ?? false
      const rotationPenalty =
        hasRotationAlternative && wouldExceed60
          ? ROTATION_PENALTY_WEIGHT
          : 0

      // Composite score: lower is better
      // Primary: minimax (maxProjected)
      // Secondary: equity penalty (penalize keeping low-burden members comfortable)
      // Tertiary: gap (spread)
      // Quaternary: sum discomfort
      // Diversity: prefer slots that differ from previous week (-timeDiversity reduces score)
      // Streak: soft penalty when same member is max too often in rolling window
      // Rotation: penalize slots that would exceed 60% max when alternative exists
      const compositeScore =
        maxProjected * FAIRNESS_WEIGHT +
        equityPenalty * EQUITY_WEIGHT +
        gap * GAP_WEIGHT +
        sumDiscomfort * PAIN_WEIGHT +
        DIVERSITY_WEIGHT * (-timeDiversity) +
        streakPenalty +
        rotationPenalty

      passingCandidateScores.push({ utcHour, compositeScore })

      if (DEBUG_ROTATION) {
        const maxIds = getMaxMemberIds(memberTimes)
        const maxNames = maxIds.map((id) => team.find((m) => m.id === id)?.name ?? id)
        console.log("  candidate:", { utcStart: utcHour, compositeScore, maxMemberIds: maxNames })
      }

      if (DEBUG) {
        const maxIds = getMaxMemberIds(memberTimes)
        candidateDebugLog.push({
          candidateTime: `UTC ${formatHourLabel(utcHour)}`,
          maxMemberIds: maxIds.map(
            (id) => team.find((m) => m.id === id)?.name ?? id
          ),
          compositeScore,
          wouldExceedRotationThreshold: wouldExceed60,
        })
      }

      // Debug: record candidate evaluation
      if (DEBUG && i === 0) {
        const perMember: Record<string, { localTime: string; rawScore: number; adjustedScore: number }> = {}
        for (const mt of memberTimes) {
          perMember[mt.memberId] = {
            localTime: mt.localTime,
            rawScore: mt.score ?? 0,
            adjustedScore: adjustedScores.get(mt.memberId) ?? 0,
          }
        }
        candidateEvaluations.push({
          utcHour,
          score: compositeScore,
          maxProjected,
          minProjected,
          equityPenalty,
          gap,
          sumDiscomfort,
          perMember,
        })
      }

      // Selection: prefer lower composite score
      // For tie-breaks within same composite score, use lexicographic comparison
      const isBetter =
        compositeScore < bestScore ||
        (compositeScore === bestScore && maxProjected < bestMaxProjected) ||
        (compositeScore === bestScore &&
          maxProjected === bestMaxProjected &&
          minProjected > bestMinProjected) ||
        (compositeScore === bestScore &&
          maxProjected === bestMaxProjected &&
          minProjected === bestMinProjected &&
          gap < bestGap) ||
        (compositeScore === bestScore &&
          maxProjected === bestMaxProjected &&
          minProjected === bestMinProjected &&
          gap === bestGap &&
          sumDiscomfort < bestSumDiscomfort) ||
        (compositeScore === bestScore &&
          maxProjected === bestMaxProjected &&
          minProjected === bestMinProjected &&
          gap === bestGap &&
          sumDiscomfort === bestSumDiscomfort &&
          timeDiversity > bestTimeDiversity) ||
        (baseTimeMinutes != null &&
          compositeScore === bestScore &&
          maxProjected === bestMaxProjected &&
          minProjected === bestMinProjected &&
          gap === bestGap &&
          sumDiscomfort === bestSumDiscomfort &&
          timeDiversity === bestTimeDiversity &&
          baseTimeDist < bestBaseTimeDist)

      if (isBetter) {
        bestScore = compositeScore
        bestMaxProjected = maxProjected
        bestMinProjected = minProjected
        bestGap = gap
        bestEquityPenalty = equityPenalty
        bestSumDiscomfort = sumDiscomfort
        bestTimeDiversity = timeDiversity
        if (baseTimeMinutes != null) bestBaseTimeDist = baseTimeDist
        bestHour = utcHour
        bestMemberTimes = memberTimes
      }
    }
    }

    // Debug: log top 5 candidates for week 1
    if (DEBUG && i === 0 && candidateEvaluations.length > 0) {
      candidateEvaluations.sort((a, b) => a.score - b.score)
      console.group("[ROTATION_DEBUG] Week 1 - Top 5 candidates")
      for (const cand of candidateEvaluations.slice(0, 5)) {
        console.log(
          `UTC ${formatHourLabel(cand.utcHour)}: score=${cand.score.toFixed(1)}`,
          `maxB=${cand.maxProjected.toFixed(1)} minB=${cand.minProjected.toFixed(1)}`,
          `equity=${cand.equityPenalty} gap=${cand.gap.toFixed(1)} sum=${cand.sumDiscomfort}`
        )
        for (const [memberId, data] of Object.entries(cand.perMember)) {
          const member = team.find((m) => m.id === memberId)
          console.log(
            `  ${member?.name}: ${data.localTime} (raw=${data.rawScore}, adj=${data.adjustedScore})`
          )
        }
      }
      console.groupEnd()
    }

    // Debug: detailed per-week rotation log
    if (DEBUG && bestHour != null && bestMemberTimes) {
      const rotationForced = rotationFeasible && !hasRotationAlternative
      console.group(`[ROTATION_DEBUG] Week ${i + 1} — selection`)
      console.log("hardValidCandidatesCount:", hardValidCandidates.length)
      console.log("Candidates:")
      for (const c of candidateDebugLog) {
        console.log(
          `  ${c.candidateTime} | maxMembers: [${c.maxMemberIds.join(", ")}] | compositeScore: ${c.compositeScore.toFixed(1)} | wouldExceedRotationThreshold: ${c.wouldExceedRotationThreshold}`
        )
      }
      console.log("rotationFeasible:", rotationFeasible)
      console.log("hasRotationAlternative:", hasRotationAlternative)
      console.log(
        "selectedSlotTime:",
        `UTC ${formatHourLabel(bestHour)}`
      )
      console.log(
        "selectedSlotMaxMembers:",
        getMaxMemberIds(bestMemberTimes).map(
          (id) => team.find((m) => m.id === id)?.name ?? id
        )
      )
      if (rotationForced) {
        console.log("rotationForced: true")
      }
      console.groupEnd()
    }

    if (bestHour === null || !bestMemberTimes) {
      if (DEBUG_ROTATION) console.groupEnd()
      const primaryCause = derivePrimaryCause(rejectedBy, hardValidCandidates.length)
      explainWeeks.push({
        week: i + 1,
        hardValidCandidatesCount: hardValidCandidates.length,
        totalCandidatesCount: totalCandidates,
        rejectedBy,
        failureReason: "ALL_REJECTED",
        primaryCause,
        weekHasMultipleBestCandidates: false,
      })
      if (DEBUG) {
        console.log("[ROTATION_DEBUG] week", i + 1, "mode", mode, "no acceptable candidate", {
          totalCandidates,
          hardValidCandidates: hardValidCandidates.length,
          rejectedBy,
          primaryCause,
        })
      }
      return {
        weeks: [],
        modeUsed: mode,
        explain: {
          weeks: explainWeeks,
          modeUsed: mode,
          shareablePlanExists: false,
        },
      }
    }

    if (DEBUG_ROTATION) {
      const chosenMaxIds = getMaxMemberIds(bestMemberTimes)
      const chosenMaxNames = chosenMaxIds.map((id) => team.find((m) => m.id === id)?.name ?? id)
      console.log("chosen candidate:", {
        utcStart: bestHour,
        maxMemberIds: chosenMaxNames,
      })
      console.groupEnd()
    }

    const projectedBurden: Record<string, number> = { ...burden }
    for (const mt of bestMemberTimes) {
      const add = mt.score ?? 0
      projectedBurden[mt.memberId] = (projectedBurden[mt.memberId] ?? 0) + add
    }

    const slotIndex = utcHourToSlotIndex(bestHour!)
    const baseTimeStr = `UTC ${formatHourLabel(bestHour!)}`

    if (DEBUG) {
      const perMember: Record<
        string,
        { name: string; localTime: string; dateLabel?: string; discomfort: number; burdenBefore: number; burdenAfter: number }
      > = {}
      for (const mt of bestMemberTimes) {
        const member = team.find((t) => t.id === mt.memberId)
        perMember[mt.memberId] = {
          name: member?.name ?? "?",
          localTime: mt.localTime,
          dateLabel: mt.localDateLabel,
          discomfort: mt.score ?? 0,
          burdenBefore: burden[mt.memberId] ?? 0,
          burdenAfter: projectedBurden[mt.memberId] ?? 0,
        }
      }

      // Compute fairness stats
      const burdenValues = Object.values(projectedBurden)
      const maxBurden = Math.max(...burdenValues, 0)
      const minBurden = Math.min(...burdenValues, 0)
      const spread = maxBurden - minBurden
      const sumPenalty = computeTotalScore(bestMemberTimes)

      console.group(`[ROTATION_DEBUG] Week ${i + 1} — mode: ${mode}`)
      console.log(`Candidates: ${hardValidCandidates.length}/${totalCandidates} valid`)
      console.log(`Rejected: burdenDiff=${rejectedBy.burdenDiff}, consecutiveMax=${rejectedBy.consecutiveMax}`)
      console.log(`Chosen: ${baseTimeStr} (slot ${slotIndex})`)
      console.log(`Fairness: maxBurden=${maxBurden}, minBurden=${minBurden}, spread=${spread}, sumPenalty=${sumPenalty}`)
      console.table(
        Object.entries(perMember).map(([id, data]) => ({
          member: data.name,
          localTime: data.localTime + (data.dateLabel ? ` (${data.dateLabel})` : ""),
          penalty: data.discomfort,
          burdenBefore: data.burdenBefore,
          burdenAfter: data.burdenAfter,
        }))
      )
      console.groupEnd()
    }

    prevSlotIndex = slotIndex

    lastWeekMaxMemberId = getMaxMemberId(bestMemberTimes)

    for (const mid of getMaxMemberIds(bestMemberTimes)) {
      maxDiscomfortCounts[mid] = (maxDiscomfortCounts[mid] ?? 0) + 1
    }

    if (lastWeekMaxMemberId) {
      lastMaxMemberIds.push(lastWeekMaxMemberId)
      if (lastMaxMemberIds.length > STREAK_WINDOW) {
        lastMaxMemberIds.shift()
      }
    }

    for (const mt of bestMemberTimes) {
      burden[mt.memberId] += mt.score ?? 0
    }

    const stretchers = bestMemberTimes
      .filter((m) => m.discomfort !== "comfortable")
      .map((m) => {
        const member = team.find((t) => t.id === m.memberId)!
        return {
          firstName: member.name.split(" ")[0],
          burden: burden[m.memberId],
        }
      })

    const protectedNames = bestMemberTimes
      .filter((m) => m.discomfort === "comfortable")
      .filter((m) => burden[m.memberId] > 0)
      .map((m) => team.find((t) => t.id === m.memberId)!.name.split(" ")[0])

    const explanation =
      stretchers.length === 0
        ? "Everyone meets within working hours this week."
        : buildExplanation(stretchers, protectedNames)

    const weekHasMultipleBestCandidates =
      passingCandidateScores.filter(
        (c) => Math.abs(c.compositeScore - bestScore) < SCORE_EPSILON
      ).length > 1

    explainWeeks.push({
      week: i + 1,
      hardValidCandidatesCount: hardValidCandidates.length,
      totalCandidatesCount: totalCandidates,
      rejectedBy,
      failureReason: null,
      ...(unavoidableMaxMemberId && { unavoidableMaxMemberId }),
      ...(rotationFeasible && !hasRotationAlternative && { rotationForced: true }),
      weekHasMultipleBestCandidates,
    })

    weeks.push({
      week: i + 1,
      date: formatDate(utcDate),
      utcDateIso: utcDate.toISODate() ?? undefined,
      utcHour: bestHour,
      memberTimes: bestMemberTimes,
      explanation,
    })
  }

  if (DEBUG) {
    console.group("[ROTATION_DEBUG] Post-loop summary")
    const maxDiscomfortByName: Record<string, number> = {}
    for (const [mid, count] of Object.entries(maxDiscomfortCounts)) {
      const name = team.find((m) => m.id === mid)?.name ?? mid
      maxDiscomfortByName[name] = count
    }
    console.log("maxDiscomfortCounts per member:", maxDiscomfortByName)
    console.log("totalWeeks:", config.rotationWeeks)
    console.log("rotationThreshold:", ROTATION_THRESHOLD)
    console.groupEnd()
  }

  return {
    weeks,
    modeUsed: mode,
    explain: {
      weeks: explainWeeks,
      modeUsed: mode,
      shareablePlanExists: false, // overwritten by caller with computed value
    },
  }
}

// --- No viable time: diagnosis and suggestions ---

function formatHour24(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour % 1) * 60)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

function formatHardNoRangesSummary(ranges: { start: number; end: number }[]): string {
  if (ranges.length === 0) return ""
  return ranges
    .map((r) => `${formatHour24(r.start)}–${formatHour24(r.end)}`)
    .join(" and ")
}

function formatWorkingHoursSummary(workStart: number, workEnd: number): string {
  return `${formatHour24(workStart)}–${formatHour24(workEnd)}`
}

/**
 * Diagnose why no viable meeting time exists. Called when findValidCandidates returns empty.
 * Computes per-member blockers (hard boundary vs working hours) and suggestions.
 */
export function diagnoseNoViableTime(
  team: TeamMember[],
  config: MeetingConfig
): NoViableTimeResult {
  const utcDate = getWeek1DateUtc(config)
  const candidates = getCandidateUtcHours()

  const blockers: NoViableTimeResult["diagnosis"]["blockers"] = []

  for (const member of team) {
    let blockedByHard = 0
    let blockedByWorking = 0
    let overlapImpact = 0

    for (const utcHour of candidates) {
      const localHour = utcToLocalHour(utcDate, utcHour, member)
      const inHard = isInHardNoLocal(localHour, member.hardNoRanges)
      const inWork = isWithinWorkingHours(
        localHour,
        member.workStartHour,
        member.workEndHour
      )

      if (inHard) blockedByHard++
      if (!inWork) blockedByWorking++
      if (inHard || !inWork) overlapImpact++
    }
    const blockingType: "HARD_BOUNDARY" | "WORKING_HOURS" =
      blockedByHard >= blockedByWorking ? "HARD_BOUNDARY" : "WORKING_HOURS"

    const hardSummary =
      member.hardNoRanges.length > 0
        ? `Never available: ${formatHardNoRangesSummary(member.hardNoRanges)}`
        : ""
    const workSummary = `Working hours ${formatWorkingHoursSummary(member.workStartHour, member.workEndHour)}`
    const localBlockedSummary =
      blockingType === "HARD_BOUNDARY"
        ? hardSummary
          ? `${hardSummary}`
          : workSummary
        : workSummary

    blockers.push({
      memberId: member.id,
      name: member.name,
      timezone: member.timezone,
      blockingType,
      localBlockedSummary: localBlockedSummary || "No availability",
      overlapImpact,
    })
  }

  blockers.sort((a, b) => b.overlapImpact - a.overlapImpact)
  const topBlockers = blockers.slice(0, 6)

  const notes: string[] = [
    "Your team spans different time zones. Each person has set limits on when they can meet.",
    "Right now, those limits don't overlap. There's no time that works for everyone.",
  ]

  const suggestions: NoViableTimeResult["suggestions"] = []

  const topHardBlocker = topBlockers.find((b) => b.blockingType === "HARD_BOUNDARY")
  if (topHardBlocker) {
    const member = team.find((m) => m.id === topHardBlocker!.memberId)!
    const relaxRange = member.hardNoRanges[0]
    suggestions.push({
      id: "RELAX_HARD_BOUNDARY_1H",
      title: "Relax one \"never\" time for one person",
      description: `Temporarily allow one hour that's usually blocked for ${member.name} for this meeting plan. Their other "never" times still apply. Use this only when the team agrees.`,
      impactSummary: `Opens up more options. ${member.name} may have one less blocked hour.`,
      params: {
        memberId: member.id,
        memberName: member.name,
        relaxRange: relaxRange ? { start: relaxRange.start, end: relaxRange.end } : undefined,
      },
    })
  }

  suggestions.push({
    id: "ALLOW_OUTSIDE_WORKING_HOURS",
    title: "Allow slightly earlier or later times",
    description:
      "Consider meeting times that fall slightly outside normal working hours. \"Never\" times still apply. This only affects this meeting plan.",
    impactSummary: "Opens up more options. Some members may occasionally meet at less ideal times.",
  })

  return {
    status: "NO_VIABLE_TIME",
    reason: "HARD_BOUNDARIES_BLOCK_ALL_SLOTS",
    diagnosis: {
      blockers: topBlockers,
      notes,
    },
    suggestions,
  }
}

// --- Fairness Guarantee: plan-level beam search ---

const FAIRNESS_BEAM_K = 8
const FAIRNESS_BEAM_WIDTH = 200

function getThresholds(config: MeetingConfig): FairnessThresholds {
  return {
    ...DEFAULT_FAIRNESS_THRESHOLDS,
    ...config.fairnessThresholds,
  }
}

/** Compute max consecutive weeks same member is max-burden. */
function computeConsecutiveMax(
  maxMemberIdsPerWeek: string[]
): number {
  if (maxMemberIdsPerWeek.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < maxMemberIdsPerWeek.length; i++) {
    if (maxMemberIdsPerWeek[i] === maxMemberIdsPerWeek[i - 1]) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/** Variance of array (0 if length <= 1). */
function varianceOf(hours: number[]): number {
  if (hours.length <= 1) return 0
  const mean = hours.reduce((a, b) => a + b, 0) / hours.length
  return hours.reduce((s, h) => s + (h - mean) ** 2, 0) / hours.length
}

/** Jitter within alternating pattern (even vs odd weeks). Lower = more consistent. Exported for tests. */
export function alternatingPatternJitter(weeks: Array<{ utcHour: number }>): number {
  const evens = weeks.filter((_, i) => i % 2 === 0).map((w) => w.utcHour)
  const odds = weeks.filter((_, i) => i % 2 === 1).map((w) => w.utcHour)
  return varianceOf(evens) + varianceOf(odds)
}

/** Count distinct UTC hours in a plan. Used as tie-breaker to prefer more varied slots. */
function uniqueSlotCount(weeks: Array<{ utcHour: number }>): number {
  return new Set(weeks.map((w) => w.utcHour)).size
}

function debugLogPlanMetrics(
  team: TeamMember[],
  burden: Record<string, number>,
  label: string
): void {
  if (!DEBUG_VERIFY) return
  const memberIdsUsed = Object.keys(burden)
  const teamIds = new Set(team.map((m) => m.id))
  const missing = team.filter((m) => !memberIdsUsed.includes(m.id))
  console.log(`[ROTATION_DEBUG] PlanMetrics (${label}):`, {
    teamLength: team.length,
    memberIdsUsedForMetrics: memberIdsUsed,
    memberCountUsedForMetrics: memberIdsUsed.length,
    burdenPerMember: memberIdsUsed.map((id) => {
      const m = team.find((t) => t.id === id)
      return { id, name: m?.name ?? "?", burden: burden[id] ?? 0 }
    }),
  })
  if (missing.length > 0) {
    console.error(
      `[ROTATION_DEBUG] ERROR: memberIdsUsedForMetrics does not include all team members. Missing:`,
      missing.map((m) => ({ id: m.id, name: m.name }))
    )
  }
}

function computeFullPlanMetrics(
  team: TeamMember[],
  plan: Array<{ utcHour: number; memberTimes: MemberTime[] }>
): PlanMetrics & { consecutiveMax: number; sumPenalty: number } {
  const burden: Record<string, number> = {}
  for (const m of team) burden[m.id] = 0
  const maxMemberIdsPerWeek: string[] = []
  let sumPenalty = 0
  for (const week of plan) {
    for (const mt of week.memberTimes) {
      burden[mt.memberId] = (burden[mt.memberId] ?? 0) + (mt.score ?? 0)
      sumPenalty += mt.score ?? 0
    }
    const maxId = getMaxMemberId(week.memberTimes)
    maxMemberIdsPerWeek.push(maxId ?? "")
  }
  debugLogPlanMetrics(team, burden, "computeFullPlanMetrics")
  const values = Object.values(burden)
  const maxBurden = Math.max(...values, 0)
  const minBurden = Math.min(...values, 0)
  const spread = maxBurden - minBurden
  const maxBurdenMemberIds = team
    .filter((m) => (burden[m.id] ?? 0) === maxBurden)
    .map((m) => m.id)
  const consecutiveMax = computeConsecutiveMax(maxMemberIdsPerWeek)
  return {
    maxBurden,
    minBurden,
    spread,
    maxBurdenMemberIds,
    consecutiveMax,
    sumPenalty,
  }
}

type FairnessBeamState = {
  weeks: Array<{ utcHour: number; memberTimes: MemberTime[] }>
  burden: Record<string, number>
  lastWeekMaxMemberId: string | null
  maxMemberIdsPerWeek: string[]
  totalPenalty: number
  totalSlotDeviation: number
}

function fairnessGuaranteeBeamSearch(
  team: TeamMember[],
  config: MeetingConfig
): {
  plan: RotationWeekData[] | null
  metrics: PlanMetrics & { consecutiveMax: number; sumPenalty: number }
  shareable: boolean
  allPlansExceededThresholds: boolean
  perWeekHardValidCount: number[]
  perWeekMaxMemberSets: string[][]
  perWeekFeasibleUtcHours: number[][]
} {
  const thresholds = getThresholds(config)
  const utcStart = getWeek1DateUtc(config)
  const baseTimeMinutes = config.baseTimeMinutes

  const perWeekHardValidCount: number[] = []
  const perWeekMaxMemberSets: string[][] = []
  const perWeekFeasibleUtcHours: number[][] = []

  const initialBurden: Record<string, number> = {}
  for (const m of team) initialBurden[m.id] = 0

  let beam: FairnessBeamState[] = [
    {
      weeks: [],
      burden: { ...initialBurden },
      lastWeekMaxMemberId: null,
      maxMemberIdsPerWeek: [],
      totalPenalty: 0,
      totalSlotDeviation: 0,
    },
  ]

  for (let i = 0; i < config.rotationWeeks; i++) {
    const utcDate = utcStart.plus({ weeks: i })
    let hardValid = findValidCandidates(utcDate, team, config)
    perWeekHardValidCount.push(hardValid.length)
    perWeekFeasibleUtcHours.push([...hardValid])

    if (baseTimeMinutes != null) {
      const weekOffset = getAnchorOffsetForWeek(utcDate, config)
      hardValid = sortByBaseTimePreference(
        hardValid,
        baseTimeMinutes,
        weekOffset
      )
    }
    const topK = hardValid.slice(0, FAIRNESS_BEAM_K)
    if (topK.length === 0) {
      perWeekMaxMemberSets.push([])
      return {
        plan: null,
        metrics: {
          maxBurden: 0,
          minBurden: 0,
          spread: 0,
          maxBurdenMemberIds: [],
          consecutiveMax: 0,
          sumPenalty: 0,
        },
        shareable: false,
        allPlansExceededThresholds: true,
        perWeekHardValidCount,
        perWeekMaxMemberSets,
        perWeekFeasibleUtcHours,
      }
    }

    const weekMaxMemberSets = new Set<string>()
    for (const utcHour of topK) {
      const mt = computeMemberTimes(utcDate, utcHour, team)
      const ids = getMaxMemberIds(mt)
      weekMaxMemberSets.add(ids.sort().join(","))
    }
    perWeekMaxMemberSets.push([...weekMaxMemberSets])

    const nextBeam: FairnessBeamState[] = []
    for (const state of beam) {
      for (const utcHour of topK) {
        const memberTimes = computeMemberTimes(utcDate, utcHour, team)
        const memberScores = new Map<string, number>()
        for (const mt of memberTimes) {
          memberScores.set(mt.memberId, mt.score ?? 0)
        }
        if (wouldViolateBurdenDiff(team, state.burden, memberScores)) continue
        if (
          wouldBeConsecutiveMaxDiscomfort(memberTimes, state.lastWeekMaxMemberId)
        ) {
          continue
        }

        const newBurden: Record<string, number> = {}
        for (const m of team) {
          newBurden[m.id] =
            (state.burden[m.id] ?? 0) +
            (memberTimes.find((mt) => mt.memberId === m.id)?.score ?? 0)
        }
        const maxId = getMaxMemberId(memberTimes)
        const newMaxIds = [...state.maxMemberIdsPerWeek, maxId ?? ""]
        const newConsecutiveMax = computeConsecutiveMax(newMaxIds)
        const vals = Object.values(newBurden)
        const spread = Math.max(...vals, 0) - Math.min(...vals, 0)
        const weekPenalty = memberTimes.reduce((s, mt) => s + (mt.score ?? 0), 0)
        const weekOffset = getAnchorOffsetForWeek(utcDate, config)
        const slotDev =
          baseTimeMinutes != null
            ? distanceMinutes(
                utcHourToDisplayMinutes(utcHour, weekOffset),
                baseTimeMinutes
              )
            : 0

        if (spread > thresholds.spreadLimit) continue
        if (newConsecutiveMax > thresholds.consecutiveMaxLimit) continue

        nextBeam.push({
          weeks: [...state.weeks, { utcHour, memberTimes }],
          burden: newBurden,
          lastWeekMaxMemberId: maxId,
          maxMemberIdsPerWeek: newMaxIds,
          totalPenalty: state.totalPenalty + weekPenalty,
          totalSlotDeviation: state.totalSlotDeviation + slotDev,
        })
      }
    }

    if (DEBUG_VERIFY) {
      const numPlansExpanded = beam.length * topK.length
      const numPlansKeptInBeam = Math.min(nextBeam.length, FAIRNESS_BEAM_WIDTH)
      console.log(`[ROTATION_DEBUG] fairnessGuaranteeBeamSearch week ${i + 1}:`, {
        numPlansExpanded,
        numPlansKeptInBeam,
      })
    }

    if (nextBeam.length === 0) {
      const fallbackBeam = runFallbackBeamNoPruning(team, config)
      const bestMetrics = fallbackBeam
        ? computeFullPlanMetrics(team, fallbackBeam.weeks)
        : {
            maxBurden: 0,
            minBurden: 0,
            spread: Infinity,
            maxBurdenMemberIds: [] as string[],
            consecutiveMax: 0,
            sumPenalty: 0,
          }
      return {
        plan: fallbackBeam
          ? buildRotationWeeks(team, utcStart, fallbackBeam)
          : null,
        metrics: bestMetrics,
        shareable: false,
        allPlansExceededThresholds: true,
        perWeekHardValidCount,
        perWeekMaxMemberSets,
        perWeekFeasibleUtcHours,
      }
    }

    nextBeam.sort((a, b) => {
      const spreadA =
        Math.max(...Object.values(a.burden), 0) -
        Math.min(...Object.values(a.burden), 0)
      const spreadB =
        Math.max(...Object.values(b.burden), 0) -
        Math.min(...Object.values(b.burden), 0)
      if (spreadA !== spreadB) return spreadA - spreadB
      const maxA = Math.max(...Object.values(a.burden), 0)
      const maxB = Math.max(...Object.values(b.burden), 0)
      if (maxA !== maxB) return maxA - maxB
      const concA = computeConsecutiveMax(a.maxMemberIdsPerWeek)
      const concB = computeConsecutiveMax(b.maxMemberIdsPerWeek)
      if (concA !== concB) return concA - concB
      // Prefer plans where more distinct members become max-burden across weeks
      const distinctMaxCountA =
        new Set(a.maxMemberIdsPerWeek.filter(Boolean)).size
      const distinctMaxCountB =
        new Set(b.maxMemberIdsPerWeek.filter(Boolean)).size
      if (distinctMaxCountA !== distinctMaxCountB) {
        return distinctMaxCountB - distinctMaxCountA
      }
      if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty
      if (a.totalSlotDeviation !== b.totalSlotDeviation)
        return a.totalSlotDeviation - b.totalSlotDeviation
      const varietyA = uniqueSlotCount(a.weeks)
      const varietyB = uniqueSlotCount(b.weeks)
      if (varietyA !== varietyB) return varietyB - varietyA
      const jitterA = alternatingPatternJitter(a.weeks)
      const jitterB = alternatingPatternJitter(b.weeks)
      if (jitterA !== jitterB) return jitterA - jitterB
      const lastA = a.weeks[a.weeks.length - 1]?.utcHour ?? 0
      const lastB = b.weeks[b.weeks.length - 1]?.utcHour ?? 0
      return lastA - lastB
    })
    beam = nextBeam.slice(0, FAIRNESS_BEAM_WIDTH)
  }

  if (beam.length === 0) {
    const fallbackBeam = runFallbackBeamNoPruning(team, config)
    const bestMetrics = fallbackBeam
      ? computeFullPlanMetrics(team, fallbackBeam.weeks)
      : {
          maxBurden: 0,
          minBurden: 0,
          spread: Infinity,
          maxBurdenMemberIds: [] as string[],
          consecutiveMax: 0,
          sumPenalty: 0,
        }
    return {
      plan: fallbackBeam
        ? buildRotationWeeks(team, utcStart, fallbackBeam)
        : null,
      metrics: bestMetrics,
      shareable: false,
      allPlansExceededThresholds: true,
      perWeekHardValidCount,
      perWeekMaxMemberSets,
      perWeekFeasibleUtcHours,
    }
  }

  const best = beam[0]
  const metrics = computeFullPlanMetrics(team, best.weeks)
  const shareable =
    metrics.spread <= thresholds.spreadLimit &&
    metrics.consecutiveMax <= thresholds.consecutiveMaxLimit

  if (DEBUG_VERIFY) {
    const numFinalPlans = beam.length
    const numShareablePlansFound = beam.filter((s) => {
      const spread =
        Math.max(...Object.values(s.burden), 0) -
        Math.min(...Object.values(s.burden), 0)
      const conc = computeConsecutiveMax(s.maxMemberIdsPerWeek)
      return spread <= thresholds.spreadLimit && conc <= thresholds.consecutiveMaxLimit
    }).length
    console.log("[ROTATION_DEBUG] fairnessGuaranteeBeamSearch final:", {
      numFinalPlans,
      numShareablePlansFound,
      bestPlanWeekSlotUtcTimes: best.weeks.map((w) => w.utcHour),
    })
  }

  return {
    plan: buildRotationWeeks(team, utcStart, best),
    metrics,
    shareable,
    allPlansExceededThresholds: false,
    perWeekHardValidCount,
    perWeekMaxMemberSets,
    perWeekFeasibleUtcHours,
  }
}

function runFallbackBeamNoPruning(
  team: TeamMember[],
  config: MeetingConfig
): FairnessBeamState | null {
  const utcStart = getWeek1DateUtc(config)
  const baseTimeMinutes = config.baseTimeMinutes
  const initialBurden: Record<string, number> = {}
  for (const m of team) initialBurden[m.id] = 0

  let beam: FairnessBeamState[] = [
    {
      weeks: [],
      burden: { ...initialBurden },
      lastWeekMaxMemberId: null,
      maxMemberIdsPerWeek: [],
      totalPenalty: 0,
      totalSlotDeviation: 0,
    },
  ]

  for (let i = 0; i < config.rotationWeeks; i++) {
    const utcDate = utcStart.plus({ weeks: i })
    let hardValid = findValidCandidates(utcDate, team, config)
    if (baseTimeMinutes != null) {
      const weekOffset = getAnchorOffsetForWeek(utcDate, config)
      hardValid = sortByBaseTimePreference(
        hardValid,
        baseTimeMinutes,
        weekOffset
      )
    }
    const topK = hardValid.slice(0, FAIRNESS_BEAM_K)
    if (topK.length === 0) return null

    const nextBeam: FairnessBeamState[] = []
    for (const state of beam) {
      for (const utcHour of topK) {
        const memberTimes = computeMemberTimes(utcDate, utcHour, team)
        const memberScores = new Map<string, number>()
        for (const mt of memberTimes) {
          memberScores.set(mt.memberId, mt.score ?? 0)
        }
        if (wouldViolateBurdenDiff(team, state.burden, memberScores)) continue
        if (
          wouldBeConsecutiveMaxDiscomfort(memberTimes, state.lastWeekMaxMemberId)
        ) {
          continue
        }

        const newBurden: Record<string, number> = {}
        for (const m of team) {
          newBurden[m.id] =
            (state.burden[m.id] ?? 0) +
            (memberTimes.find((mt) => mt.memberId === m.id)?.score ?? 0)
        }
        const maxId = getMaxMemberId(memberTimes)
        const newMaxIds = [...state.maxMemberIdsPerWeek, maxId ?? ""]
        const weekPenalty = memberTimes.reduce((s, mt) => s + (mt.score ?? 0), 0)
        const weekOffset = getAnchorOffsetForWeek(utcDate, config)
        const slotDev =
          baseTimeMinutes != null
            ? distanceMinutes(
                utcHourToDisplayMinutes(utcHour, weekOffset),
                baseTimeMinutes
              )
            : 0

        nextBeam.push({
          weeks: [...state.weeks, { utcHour, memberTimes }],
          burden: newBurden,
          lastWeekMaxMemberId: maxId,
          maxMemberIdsPerWeek: newMaxIds,
          totalPenalty: state.totalPenalty + weekPenalty,
          totalSlotDeviation: state.totalSlotDeviation + slotDev,
        })
      }
    }

    nextBeam.sort((a, b) => {
      const spreadA =
        Math.max(...Object.values(a.burden), 0) -
        Math.min(...Object.values(a.burden), 0)
      const spreadB =
        Math.max(...Object.values(b.burden), 0) -
        Math.min(...Object.values(b.burden), 0)
      if (spreadA !== spreadB) return spreadA - spreadB
      const maxA = Math.max(...Object.values(a.burden), 0)
      const maxB = Math.max(...Object.values(b.burden), 0)
      if (maxA !== maxB) return maxA - maxB
      const concA = computeConsecutiveMax(a.maxMemberIdsPerWeek)
      const concB = computeConsecutiveMax(b.maxMemberIdsPerWeek)
      if (concA !== concB) return concA - concB
      if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty
      if (a.totalSlotDeviation !== b.totalSlotDeviation)
        return a.totalSlotDeviation - b.totalSlotDeviation
      const varietyA = uniqueSlotCount(a.weeks)
      const varietyB = uniqueSlotCount(b.weeks)
      if (varietyA !== varietyB) return varietyB - varietyA
      const jitterA = alternatingPatternJitter(a.weeks)
      const jitterB = alternatingPatternJitter(b.weeks)
      if (jitterA !== jitterB) return jitterA - jitterB
      const lastA = a.weeks[a.weeks.length - 1]?.utcHour ?? 0
      const lastB = b.weeks[b.weeks.length - 1]?.utcHour ?? 0
      return lastA - lastB
    })
    beam = nextBeam.slice(0, FAIRNESS_BEAM_WIDTH)
  }

  return beam.length > 0 ? beam[0] : null
}

function buildRotationWeeks(
  team: TeamMember[],
  utcStart: DateTime,
  state: FairnessBeamState
): RotationWeekData[] {
  return state.weeks.map((w, idx) => {
    const utcDate = utcStart.plus({ weeks: idx })
    const stretchers = w.memberTimes
      .filter((m) => m.discomfort !== "comfortable")
      .map((m) => {
        const member = team.find((t) => t.id === m.memberId)!
        return {
          firstName: member.name.split(" ")[0],
          burden: state.burden[m.memberId] ?? 0,
        }
      })
    const protectedNames = w.memberTimes
      .filter((m) => m.discomfort === "comfortable")
      .filter((m) => (state.burden[m.memberId] ?? 0) > 0)
      .map((m) => team.find((t) => t.id === m.memberId)!.name.split(" ")[0])
    const explanation =
      stretchers.length === 0
        ? "Everyone meets within working hours this week."
        : buildExplanation(stretchers, protectedNames)
    return {
      week: idx + 1,
      date: formatDate(utcDate),
      utcDateIso: utcDate.toISODate() ?? undefined,
      utcHour: w.utcHour,
      memberTimes: w.memberTimes,
      explanation,
    }
  })
}

function computePlanMetrics(
  team: TeamMember[],
  plan: Array<{ utcHour: number; memberTimes: MemberTime[] }>
): PlanMetrics {
  const burden: Record<string, number> = {}
  for (const m of team) burden[m.id] = 0
  for (const week of plan) {
    for (const mt of week.memberTimes) {
      burden[mt.memberId] = (burden[mt.memberId] ?? 0) + (mt.score ?? 0)
    }
  }
  debugLogPlanMetrics(team, burden, "computePlanMetrics")
  const values = Object.values(burden)
  const maxBurden = Math.max(...values, 0)
  const minBurden = Math.min(...values, 0)
  const spread = maxBurden - minBurden
  const maxBurdenMemberIds = team
    .filter((m) => (burden[m.id] ?? 0) === maxBurden)
    .map((m) => m.id)
  return { maxBurden, minBurden, spread, maxBurdenMemberIds }
}

function beamSearchBetterPlan(
  team: TeamMember[],
  config: MeetingConfig,
  currentPlan: RotationWeekData[],
  mode: ConstraintMode
): { plan: RotationWeekData[]; metrics: PlanMetrics } | null {
  const utcStart = getWeek1DateUtc(config)
  const baseTimeMinutes = config.baseTimeMinutes
  const enforceBurdenDiff = mode === "STRICT" || mode === "RELAXED"
  const enforceConsecutiveMax = mode === "STRICT"

  type BeamState = {
    weeks: Array<{ utcHour: number; memberTimes: MemberTime[] }>
    burden: Record<string, number>
    lastWeekMaxMemberId: string | null
  }

  const initialBurden: Record<string, number> = {}
  for (const m of team) initialBurden[m.id] = 0

  let beam: BeamState[] = [{ weeks: [], burden: { ...initialBurden }, lastWeekMaxMemberId: null }]

  for (let i = 0; i < config.rotationWeeks; i++) {
    const utcDate = utcStart.plus({ weeks: i })
    let hardValid = findValidCandidates(utcDate, team, config)
    if (baseTimeMinutes != null) {
      const weekOffset = getAnchorOffsetForWeek(utcDate, config)
      hardValid = sortByBaseTimePreference(
        hardValid,
        baseTimeMinutes,
        weekOffset
      )
    }
    const topK = hardValid.slice(0, FAIRNESS_BEAM_K)
    if (topK.length === 0) return null

    const nextBeam: BeamState[] = []
    for (const state of beam) {
      for (const utcHour of topK) {
        const memberTimes = computeMemberTimes(utcDate, utcHour, team)
        const memberScores = new Map<string, number>()
        for (const mt of memberTimes) {
          memberScores.set(mt.memberId, mt.score ?? 0)
        }
        if (
          enforceBurdenDiff &&
          wouldViolateBurdenDiff(team, state.burden, memberScores)
        ) {
          continue
        }
        if (
          enforceConsecutiveMax &&
          wouldBeConsecutiveMaxDiscomfort(memberTimes, state.lastWeekMaxMemberId)
        ) {
          continue
        }

        const newBurden: Record<string, number> = {}
        for (const m of team) {
          newBurden[m.id] =
            (state.burden[m.id] ?? 0) +
            (memberTimes.find((mt) => mt.memberId === m.id)?.score ?? 0)
        }
        nextBeam.push({
          weeks: [...state.weeks, { utcHour, memberTimes }],
          burden: newBurden,
          lastWeekMaxMemberId: getMaxMemberId(memberTimes),
        })
      }
    }

    nextBeam.sort((a, b) => {
      const spreadA =
        Math.max(...Object.values(a.burden), 0) -
        Math.min(...Object.values(a.burden), 0)
      const spreadB =
        Math.max(...Object.values(b.burden), 0) -
        Math.min(...Object.values(b.burden), 0)
      if (spreadA !== spreadB) return spreadA - spreadB
      const maxA = Math.max(...Object.values(a.burden), 0)
      const maxB = Math.max(...Object.values(b.burden), 0)
      return maxA - maxB
    })
    beam = nextBeam.slice(0, FAIRNESS_BEAM_WIDTH)
  }

  if (beam.length === 0) return null
  const best = beam[0]
  const metrics = computePlanMetrics(team, best.weeks)
  const plan: RotationWeekData[] = best.weeks.map((w, idx) => {
    const utcDate = utcStart.plus({ weeks: idx })
    const stretchers = w.memberTimes
      .filter((m) => m.discomfort !== "comfortable")
      .map((m) => {
        const member = team.find((t) => t.id === m.memberId)!
        return { firstName: member.name.split(" ")[0], burden: best.burden[m.memberId] ?? 0 }
      })
    const protectedNames = w.memberTimes
      .filter((m) => m.discomfort === "comfortable")
      .filter((m) => (best.burden[m.memberId] ?? 0) > 0)
      .map((m) => team.find((t) => t.id === m.memberId)!.name.split(" ")[0])
    const explanation =
      stretchers.length === 0
        ? "Everyone meets within working hours this week."
        : buildExplanation(stretchers, protectedNames)
    return {
      week: idx + 1,
      date: formatDate(utcDate),
      utcDateIso: utcDate.toISODate() ?? undefined,
      utcHour: w.utcHour,
      memberTimes: w.memberTimes,
      explanation,
    }
  })
  return { plan, metrics }
}

// --- Input integrity verification (DEBUG_VERIFY only) ---

export function verifyInputIntegrity(
  team: TeamMember[],
  config: MeetingConfig
): void {
  if (!DEBUG_VERIFY) return

  const inputLog: {
    team: Array<{
      id: string
      name: string
      timezone: string
      workStart: number
      workEnd: number
      hardNoRanges: { start: number; end: number }[]
    }>
    config: {
      dayOfWeek: number
      rotationWeeks: number
      baseTimeMinutes: number | null
      anchorOffset: number
      rotationThreshold: number
      burdenDiffThreshold: number
    }
  } = {
    team: team.map((m) => ({
      id: m.id,
      name: m.name,
      timezone: m.timezone,
      workStart: m.workStartHour,
      workEnd: m.workEndHour,
      hardNoRanges: m.hardNoRanges ?? [],
    })),
    config: {
      dayOfWeek: config.dayOfWeek,
      rotationWeeks: config.rotationWeeks,
      baseTimeMinutes: config.baseTimeMinutes ?? null,
      anchorOffset: config.anchorOffset,
      rotationThreshold: 0.6,
      burdenDiffThreshold: 2,
    },
  }

  console.log("[ROTATION_DEBUG] Input integrity:", JSON.stringify(inputLog, null, 2))

  for (const m of team) {
    const ranges = m.hardNoRanges ?? []
    if (!ranges || ranges.length === 0) {
      console.warn(`[ROTATION_DEBUG] WARNING: Member ${m.name} has missing/empty hardNoRanges`)
    }
    const ws = m.workStartHour
    const we = m.workEndHour
    if (ws >= we && !(ws > 12 && we < 12)) {
      console.warn(
        `[ROTATION_DEBUG] WARNING: Member ${m.name} workStart (${ws}) >= workEnd (${we}) - may be invalid unless overnight`
      )
    }
    if (ws < 0 || ws > 24 || we < 0 || we > 24) {
      console.warn(
        `[ROTATION_DEBUG] WARNING: Member ${m.name} workStart/workEnd out of 0-24 range: ${ws}, ${we}`
      )
    }
  }

  const rangeStrings = team.map((m) =>
    JSON.stringify((m.hardNoRanges ?? []).sort((a, b) => a.start - b.start))
  )
  const allSame = rangeStrings.every((s) => s === rangeStrings[0])
  const allEmpty = rangeStrings.every((s) => s === "[]")
  if (allSame && team.length > 1 && !allEmpty) {
    console.warn(
      "[ROTATION_DEBUG] WARNING: All members share identical hardNoRanges (likely mapping bug).",
      "Source: each member's hardNoRanges from dbMemberToTeamMember(s.hard_no_ranges).",
      "Member ids:",
      team.map((m) => ({ id: m.id, name: m.name, hardNoRanges: m.hardNoRanges }))
    )
  }
}

// --- Core rotation engine ---

export function canGenerateRotation(
  team: TeamMember[],
  config: MeetingConfig
): { valid: boolean; reason?: string } {
  if (team.length < 2) {
    return { valid: false, reason: "Add at least 2 team members." }
  }

  const utcDate = getWeek1DateUtc(config)
  const valid = findValidCandidates(utcDate, team, config)
  if (valid.length === 0) {
    return {
      valid: false,
      reason:
        "Hard boundaries leave no viable meeting time. Adjust never ranges.",
    }
  }

  return { valid: true }
}

/**
 * Anchor mode UI: check if fixed base time is blocked or outside work hours.
 * Returns null when baseTimeMinutes is not set.
 */
export function getBaseTimeStatus(
  team: TeamMember[],
  config: MeetingConfig
): { blockedByHardNo: boolean; outsideWorkHoursCount: number } | null {
  if (config.baseTimeMinutes == null) return null
  const utcDate = getWeek1DateUtc(config)
  const weekOffset = getAnchorOffsetForWeek(utcDate, config)
  const baseUtcHour = baseTimeMinutesToUtcHour(config.baseTimeMinutes, weekOffset)
  const blockedByHardNo = !isCandidateHardValid(utcDate, baseUtcHour, team)
  let outsideWorkHoursCount = 0
  for (const m of team) {
    const localHour = utcToLocalHour(utcDate, baseUtcHour, m)
    if (!isWithinWorkingHours(localHour, m.workStartHour, m.workEndHour)) {
      outsideWorkHoursCount++
    }
  }
  return { blockedByHardNo, outsideWorkHoursCount }
}

/**
 * Generate rotation with Fairness Guarantee:
 * 1. Try plan-level beam search (FAIRNESS_GUARANTEE) first — lexicographic: spread, maxBurden, consecutiveMax, sumPenalty, slotDeviation
 * 2. If beam yields shareable plan → return it
 * 3. If beam yields forced plan (no shareable) → return with evidence
 * 4. If beam yields nothing → fallback to greedy (STRICT/RELAXED/FALLBACK)
 *
 * When useFixedBaseTime=true AND anchor is within all members' work hours AND no hard overlap:
 * use the same anchor for all weeks (no rotation).
 */
function tryFixedAnchorPlan(
  team: TeamMember[],
  config: MeetingConfig
): RotationResult | null {
  const baseTimeMinutes = config.baseTimeMinutes
  if (baseTimeMinutes == null) return null

  const utcStart = getWeek1DateUtc(config)
  const weeks: RotationWeekData[] = []

  for (let i = 0; i < config.rotationWeeks; i++) {
    const utcDate = utcStart.plus({ weeks: i })
    const weekOffset = getAnchorOffsetForWeek(utcDate, config)
    const baseUtcHour = baseTimeMinutesToUtcHour(baseTimeMinutes, weekOffset)

    if (!isCandidateHardValid(utcDate, baseUtcHour, team)) return null

    for (const m of team) {
      const localHour = utcToLocalHour(utcDate, baseUtcHour, m)
      if (!isWithinWorkingHours(localHour, m.workStartHour, m.workEndHour)) {
        return null
      }
    }

    const memberTimes = computeMemberTimes(utcDate, baseUtcHour, team)
    weeks.push({
      week: i + 1,
      date: formatDate(utcDate),
      utcDateIso: utcDate.toISODate() ?? undefined,
      utcHour: baseUtcHour,
      memberTimes,
      explanation: "Everyone meets within working hours this week.",
    })
  }

  const burden: Record<string, number> = {}
  for (const m of team) burden[m.id] = 0
  for (const w of weeks) {
    for (const mt of w.memberTimes) {
      burden[mt.memberId] = (burden[mt.memberId] ?? 0) + (mt.score ?? 0)
    }
  }
  const values = Object.values(burden)
  const maxBurden = Math.max(...values, 0)
  const minBurden = Math.min(...values, 0)
  const spread = maxBurden - minBurden
  const maxBurdenMemberIds = team
    .filter((m) => (burden[m.id] ?? 0) === maxBurden)
    .map((m) => m.id)

  const thresholds = getThresholds(config)
  const shareablePlanExists =
    spread <= thresholds.spreadLimit &&
    (maxBurden === 0 || maxBurdenMemberIds.length <= 1)

  return {
    weeks,
    modeUsed: "FIXED_ANCHOR",
    explain: {
      weeks: weeks.map((w, i) => ({
        week: w.week,
        hardValidCandidatesCount: 0,
        totalCandidatesCount: getCandidateUtcHours().length,
        rejectedBy: { burdenDiff: 0, consecutiveMax: 0 },
        failureReason: null,
      })),
      modeUsed: "FIXED_ANCHOR",
      shareablePlanExists,
      currentPlanMetrics: {
        maxBurden,
        minBurden,
        spread,
        maxBurdenMemberIds,
        consecutiveMax: 0,
        sumPenalty: 0,
      },
      bestPlanMetrics: {
        maxBurden,
        minBurden,
        spread,
        maxBurdenMemberIds,
        consecutiveMax: 0,
        sumPenalty: 0,
      },
      betterPlanExists: false,
      ...(shareablePlanExists && {
        evidence: {
          perWeekHardValidCount: weeks.map(() => 0),
          perWeekMaxMemberSets: weeks.map(() => []),
          perWeekFeasibleUtcHours: weeks.map(() => []),
          bestAchievableMetrics: {
            maxBurden,
            minBurden,
            spread,
            maxBurdenMemberIds,
            consecutiveMax: 0,
            sumPenalty: 0,
          },
        },
      }),
    },
  }
}

export function generateRotation(
  team: TeamMember[],
  config: MeetingConfig
): RotationResult | NoViableTimeResult | RotationWeekData[] {
  if (team.length < 2) return []

  const utcStart = getWeek1DateUtc(config)
  const hardValidCandidates = findValidCandidates(utcStart, team, config)
  if (hardValidCandidates.length === 0) {
    if (DEBUG) console.log("[ROTATION_DEBUG] no hard-valid candidates, returning diagnosis")
    return diagnoseNoViableTime(team, config)
  }

  const fixedAnchorResult = tryFixedAnchorPlan(team, config)
  if (fixedAnchorResult) {
    if (DEBUG) console.log("[ROTATION_DEBUG] using FIXED_ANCHOR plan (anchor within all work hours)")
    return fixedAnchorResult
  }

  if (DEBUG_VERIFY) {
    const memberIdToNameTz: Record<string, { name: string; timezone: string }> = {}
    for (const m of team) {
      memberIdToNameTz[m.id] = { name: m.name, timezone: m.timezone }
    }
    console.log("[ROTATION_DEBUG] memberId -> (name, timezone):", memberIdToNameTz)
  }

  const beamResult = fairnessGuaranteeBeamSearch(team, config)

  if (beamResult.plan && beamResult.plan.length === config.rotationWeeks) {
    const weeks = beamResult.plan
    const metrics = beamResult.metrics
    const thresholds = getThresholds(config)

    const currentPlanMetrics: PlanMetrics = {
      maxBurden: metrics.maxBurden,
      minBurden: metrics.minBurden,
      spread: metrics.spread,
      maxBurdenMemberIds: metrics.maxBurdenMemberIds,
      consecutiveMax: metrics.consecutiveMax,
      sumPenalty: metrics.sumPenalty,
    }

    const shareablePlanExists =
      beamResult.shareable &&
      metrics.spread <= thresholds.spreadLimit &&
      metrics.consecutiveMax <= thresholds.consecutiveMaxLimit

    let forcedReason: ForcedReason | undefined
    let evidence: ForcedPlanEvidence | undefined
    let forcedSummary: string | undefined

    if (!shareablePlanExists) {
      if (beamResult.allPlansExceededThresholds) {
        if (metrics.spread > thresholds.spreadLimit) {
          forcedReason = "SPREAD_IMPOSSIBLE"
        } else if (metrics.consecutiveMax > thresholds.consecutiveMaxLimit) {
          forcedReason = "CONSECUTIVE_MAX_IMPOSSIBLE"
        } else {
          forcedReason = "HARD_CONSTRAINTS_TOO_TIGHT"
        }
      } else {
        forcedReason = "SPREAD_IMPOSSIBLE"
      }
      if (beamResult.perWeekHardValidCount.some((c) => c === 0)) {
        forcedReason = "NO_FEASIBLE_TIME"
      }
      evidence = {
        perWeekHardValidCount: beamResult.perWeekHardValidCount,
        perWeekMaxMemberSets: beamResult.perWeekMaxMemberSets,
        perWeekFeasibleUtcHours: beamResult.perWeekFeasibleUtcHours,
        bestAchievableMetrics: currentPlanMetrics,
      }
      const maxMemberName =
        team.find((m) => m.id === metrics.maxBurdenMemberIds[0])?.name ?? "one member"
      forcedSummary =
        forcedReason === "NO_FEASIBLE_TIME"
          ? "No feasible time: no UTC hour fits all members' work windows and hard-no ranges."
          : `Rotation could not be shared without violating limits; the only feasible slots repeatedly place ${maxMemberName} at the edge due to ${forcedReason}.`
    }

    const explainWeeks: WeekExplain[] = weeks.map((w, i) => ({
      week: w.week,
      hardValidCandidatesCount: beamResult.perWeekHardValidCount[i] ?? 0,
      totalCandidatesCount: getCandidateUtcHours().length,
      rejectedBy: { burdenDiff: 0, consecutiveMax: 0 },
      failureReason: null,
      weekHasMultipleBestCandidates: false,
    }))

    const fullExplain: RotationExplain = {
      weeks: explainWeeks,
      modeUsed: "FAIRNESS_GUARANTEE",
      shareablePlanExists,
      currentPlanMetrics,
      bestPlanMetrics: currentPlanMetrics,
      betterPlanExists: false,
      ...(forcedReason && { forcedReason }),
      ...(evidence && { evidence }),
      ...(forcedSummary && { forcedSummary }),
      ...(shareablePlanExists && {
        evidence: {
          perWeekHardValidCount: beamResult.perWeekHardValidCount,
          perWeekMaxMemberSets: beamResult.perWeekMaxMemberSets,
          perWeekFeasibleUtcHours: beamResult.perWeekFeasibleUtcHours,
          bestAchievableMetrics: currentPlanMetrics,
        },
      }),
    }

    if (DEBUG_VERIFY) {
      console.log("[ROTATION_DEBUG] currentPlan (FAIRNESS_GUARANTEE) week slot UTC times:", weeks.map((w) => w.utcHour))
      console.log("[ROTATION_DEBUG] explain:", JSON.stringify(fullExplain, null, 2))
    }

    return {
      weeks,
      modeUsed: "FAIRNESS_GUARANTEE",
      explain: fullExplain,
    }
  }

  let beamExhaustedNoFallback = false
  if (beamResult.plan === null && beamResult.allPlansExceededThresholds) {
    const fallbackBeam = runFallbackBeamNoPruning(team, config)
    if (fallbackBeam) {
      const weeks = buildRotationWeeks(team, utcStart, fallbackBeam)
      const metrics = computeFullPlanMetrics(team, fallbackBeam.weeks)
      const thresholds = getThresholds(config)
      const shareablePlanExists =
        metrics.spread <= thresholds.spreadLimit &&
        metrics.consecutiveMax <= thresholds.consecutiveMaxLimit

      const hasNoFeasible =
        beamResult.perWeekHardValidCount.some((c) => c === 0)
      const forcedReason: ForcedReason = hasNoFeasible
        ? "NO_FEASIBLE_TIME"
        : "HARD_CONSTRAINTS_TOO_TIGHT"
      const evidence: ForcedPlanEvidence = {
        perWeekHardValidCount: beamResult.perWeekHardValidCount,
        perWeekMaxMemberSets: beamResult.perWeekMaxMemberSets,
        perWeekFeasibleUtcHours: beamResult.perWeekFeasibleUtcHours,
        bestAchievableMetrics: {
          ...metrics,
          maxBurdenMemberIds: metrics.maxBurdenMemberIds,
        },
      }
      const maxMemberName =
        team.find((m) => m.id === metrics.maxBurdenMemberIds[0])?.name ?? "one member"
      const forcedSummary =
        hasNoFeasible
          ? "No feasible time: no UTC hour fits all members' work windows and hard-no ranges."
          : `Rotation could not be shared without violating limits; the only feasible slots repeatedly place ${maxMemberName} at the edge due to ${forcedReason}.`

      const explainWeeks: WeekExplain[] = weeks.map((w, i) => ({
        week: w.week,
        hardValidCandidatesCount: beamResult.perWeekHardValidCount[i] ?? 0,
        totalCandidatesCount: getCandidateUtcHours().length,
        rejectedBy: { burdenDiff: 0, consecutiveMax: 0 },
        failureReason: null,
        weekHasMultipleBestCandidates: false,
      }))

      if (DEBUG_VERIFY) {
        console.log("[ROTATION_DEBUG] currentPlan (FAIRNESS_GUARANTEE fallback) week slot UTC times:", weeks.map((w) => w.utcHour))
      }

      return {
        weeks,
        modeUsed: "FAIRNESS_GUARANTEE",
        explain: {
          weeks: explainWeeks,
          modeUsed: "FAIRNESS_GUARANTEE",
          shareablePlanExists,
          currentPlanMetrics: {
            ...metrics,
            maxBurdenMemberIds: metrics.maxBurdenMemberIds,
          },
          bestPlanMetrics: {
            ...metrics,
            maxBurdenMemberIds: metrics.maxBurdenMemberIds,
          },
          forcedReason,
          evidence,
          forcedSummary,
        },
      }
    } else {
      beamExhaustedNoFallback = true
    }
  }

  const modes: ConstraintMode[] = ["STRICT", "RELAXED", "FALLBACK"]
  let strictFailureAtWeek: number | undefined
  let strictFailureReason: string | undefined

  for (const mode of modes) {
    const { weeks, modeUsed, explain } = generateRotationWithMode(team, config, mode)
    if (mode === "STRICT" && weeks.length < config.rotationWeeks && explain.weeks.length > 0) {
      const last = explain.weeks[explain.weeks.length - 1]
      if (last?.failureReason) {
        strictFailureAtWeek = last.week
        strictFailureReason =
          last.primaryCause === "MIXED_REJECTIONS"
            ? "STRICT_NO_ACCEPTABLE_CANDIDATE"
            : (last.failureReason ?? "ALL_REJECTED")
      }
    }
    if (weeks.length === config.rotationWeeks) {
      if (DEBUG) {
        console.log("[ROTATION_DEBUG] succeeded with mode", mode)

        // Final burden distribution summary
        const finalBurden: Record<string, number> = {}
        for (const m of team) finalBurden[m.id] = 0
        for (const week of weeks) {
          for (const mt of week.memberTimes) {
            finalBurden[mt.memberId] += mt.score ?? 0
          }
        }
        const burdenValues = Object.values(finalBurden)
        const maxBurden = Math.max(...burdenValues, 0)
        const minBurden = Math.min(...burdenValues, 0)
        const spread = maxBurden - minBurden

        console.group("[ROTATION_DEBUG] Final burden distribution")
        console.table(
          team.map((m) => ({
            name: m.name,
            totalBurden: finalBurden[m.id],
          }))
        )
        console.log(
          `Max burden: ${maxBurden}, Min burden: ${minBurden}, Spread: ${spread}`
        )
        if (spread <= 2) {
          console.log("✓ Fairness check PASSED: spread <= 2")
        } else if (spread <= 3) {
          console.log("⚠ Fairness check WARNING: spread is 3 (acceptable for tight constraints)")
        } else {
          console.log("✗ Fairness check FAILED: spread > 3 (burden too concentrated)")
        }
        console.groupEnd()
      }
      if (mode !== "STRICT") {
        console.warn("[ROTATION_DEBUG] modeUsed:", mode)
      }

      if (DEBUG_VERIFY) {
        console.log("[ROTATION_DEBUG] currentPlan (greedy) week slot UTC times:", weeks.map((w) => w.utcHour))
      }

      const currentPlanMetrics: PlanMetrics = (() => {
        const b: Record<string, number> = {}
        for (const m of team) b[m.id] = 0
        const maxIdsPerWeek: string[] = []
        let sumPenalty = 0
        for (const week of weeks) {
          for (const mt of week.memberTimes) {
            b[mt.memberId] = (b[mt.memberId] ?? 0) + (mt.score ?? 0)
            sumPenalty += mt.score ?? 0
          }
          const mid = getMaxMemberId(week.memberTimes)
          maxIdsPerWeek.push(mid ?? "")
        }
        debugLogPlanMetrics(team, b, "currentPlanMetrics (greedy)")
        const vals = Object.values(b)
        const maxB = Math.max(...vals, 0)
        const minB = Math.min(...vals, 0)
        const maxIds = team
          .filter((m) => (b[m.id] ?? 0) === maxB)
          .map((m) => m.id)
        return {
          maxBurden: maxB,
          minBurden: minB,
          spread: maxB - minB,
          maxBurdenMemberIds: maxIds,
          consecutiveMax: computeConsecutiveMax(maxIdsPerWeek),
          sumPenalty,
        }
      })()

      let betterPlanExists = false
      let bestPlanMetrics: PlanMetrics | undefined

      if (DEBUG_VERIFY) {
        const beamResult = beamSearchBetterPlan(team, config, weeks, mode)
        if (beamResult) {
          bestPlanMetrics = beamResult.metrics
          const curr = currentPlanMetrics
          const best = beamResult.metrics
          const strictlyBetter =
            best.spread < curr.spread ||
            (best.spread === curr.spread && best.maxBurden < curr.maxBurden)
          if (strictlyBetter) {
            betterPlanExists = true
            console.log(
              "[ROTATION_DEBUG] BETTER PLAN EXISTS — beam search found strictly better plan"
            )
            console.log("[ROTATION_DEBUG] Current plan:", {
              currentPlanMetrics,
              maxBurdenMembers: curr.maxBurdenMemberIds.map(
                (id) => team.find((m) => m.id === id)?.name ?? id
              ),
            })
            console.log("[ROTATION_DEBUG] Best plan:", {
              bestPlanMetrics,
              maxBurdenMembers: best.maxBurdenMemberIds.map(
                (id) => team.find((m) => m.id === id)?.name ?? id
              ),
            })
          }
        }
      }

      const thresholds = getThresholds(config)
      const strictSucceededWithNoFailure =
        mode === "STRICT" &&
        explain.weeks.every((w) => !w.failureReason) &&
        explain.weeks.every((w) => (w.hardValidCandidatesCount ?? 0) > 0)
      const shareablePlanExists =
        strictSucceededWithNoFailure ||
        (currentPlanMetrics.spread <= thresholds.spreadLimit &&
          (currentPlanMetrics.consecutiveMax ?? 0) <= thresholds.consecutiveMaxLimit)

      let forcedReason: ForcedReason | undefined
      let evidence: ForcedPlanEvidence | undefined
      let forcedSummary: string | undefined

      if (!shareablePlanExists) {
        const beamActuallyExhausted =
          beamExhaustedNoFallback && mode !== "STRICT"
        if (beamActuallyExhausted) {
          forcedReason = "BEAM_EXHAUSTED"
        } else if (currentPlanMetrics.spread > thresholds.spreadLimit) {
          forcedReason = "SPREAD_IMPOSSIBLE"
        } else if (
          (currentPlanMetrics.consecutiveMax ?? 0) > thresholds.consecutiveMaxLimit
        ) {
          forcedReason = "CONSECUTIVE_MAX_IMPOSSIBLE"
        } else {
          forcedReason = "HARD_CONSTRAINTS_TOO_TIGHT"
        }
        const perWeekHardValidCount: number[] = []
        const perWeekMaxMemberSets: string[][] = []
        const perWeekFeasibleUtcHours: number[][] = []
        const utcStart = getWeek1DateUtc(config)
        for (let i = 0; i < config.rotationWeeks; i++) {
          const utcDate = utcStart.plus({ weeks: i })
          const hardValid = findValidCandidates(utcDate, team, config)
          perWeekHardValidCount.push(hardValid.length)
          perWeekFeasibleUtcHours.push([...hardValid])
          const sets = new Set<string>()
          for (const h of hardValid.slice(0, FAIRNESS_BEAM_K)) {
            const mt = computeMemberTimes(utcDate, h, team)
            sets.add(getMaxMemberIds(mt).sort().join(","))
          }
          perWeekMaxMemberSets.push([...sets])
        }
        evidence = {
          perWeekHardValidCount,
          perWeekMaxMemberSets,
          perWeekFeasibleUtcHours,
          bestAchievableMetrics: currentPlanMetrics,
        }
        const hasNoFeasible = perWeekHardValidCount.some((c) => c === 0)
        if (hasNoFeasible && !beamActuallyExhausted) {
          forcedReason = "NO_FEASIBLE_TIME"
          forcedSummary =
            "No feasible time: no UTC hour fits all members' work windows and hard-no ranges."
        } else if (beamActuallyExhausted) {
          forcedSummary =
            "Beam search disabled or exhausted; plan produced by fallback mode."
        } else {
          const maxMemberName =
            team.find((m) => m.id === currentPlanMetrics.maxBurdenMemberIds[0])
              ?.name ?? "one member"
          forcedSummary = `Rotation could not be shared without violating limits; the only feasible slots repeatedly place ${maxMemberName} at the edge due to ${forcedReason}.`
        }
      }

      const explainWeeks = [...explain.weeks]
      if (
        strictFailureAtWeek != null &&
        strictFailureReason &&
        strictFailureAtWeek >= 1 &&
        strictFailureAtWeek <= explainWeeks.length
      ) {
        const idx = strictFailureAtWeek - 1
        explainWeeks[idx] = {
          ...explainWeeks[idx],
          failureReason: strictFailureReason as WeekExplain["failureReason"],
        }
      }

      const fullExplain: RotationExplain = {
        ...explain,
        weeks: explainWeeks,
        modeUsed,
        shareablePlanExists,
        ...(betterPlanExists && { betterPlanExists: true }),
        ...(bestPlanMetrics && { bestPlanMetrics }),
        currentPlanMetrics,
        ...(forcedReason && { forcedReason }),
        ...(evidence && { evidence }),
        ...(forcedSummary && { forcedSummary }),
      }

      return { weeks, modeUsed, explain: fullExplain }
    }
  }

  if (DEBUG) console.log("[ROTATION_DEBUG] all modes failed, returning []")
  return []
}

/** Error shape when input contract validation fails. */
export type InputContractViolationResult = {
  ok: false
  error: ValidateTeamInputError["error"]
}

export type GenerateRotationGuardedResult =
  | RotationResult
  | NoViableTimeResult
  | InputContractViolationResult

/** Type guard: result is input contract violation. */
export function isInputContractViolation(
  r: GenerateRotationGuardedResult
): r is InputContractViolationResult {
  return (
    typeof r === "object" &&
    r !== null &&
    "ok" in r &&
    (r as InputContractViolationResult).ok === false &&
    "error" in r &&
    (r as InputContractViolationResult).error?.code === "INPUT_CONTRACT_VIOLATION"
  )
}

/**
 * Phase 1: Safe wrapper that validates team input before generateRotation.
 * On validation failure: returns INPUT_CONTRACT_VIOLATION (no silent default).
 * On success: calls generateRotation unchanged.
 */
export function generateRotationGuarded(
  team: TeamMember[],
  config: MeetingConfig
): GenerateRotationGuardedResult {
  const validation = validateTeamInput(team)
  if (!validation.ok) return { ok: false, error: validation.error }
  return generateRotation(validation.team, config) as GenerateRotationGuardedResult
}

/** Type guard: result is NoViableTimeResult */
export function isNoViableTimeResult(
  r: RotationResult | NoViableTimeResult | RotationWeekData[]
): r is NoViableTimeResult {
  return typeof r === "object" && r !== null && "status" in r && r.status === "NO_VIABLE_TIME"
}

/** Type guard: result is RotationResult */
export function isRotationResult(
  r: RotationResult | NoViableTimeResult | RotationWeekData[]
): r is RotationResult {
  return (
    typeof r === "object" &&
    r !== null &&
    "weeks" in r &&
    "modeUsed" in r &&
    "explain" in r &&
    Array.isArray((r as RotationResult).weeks)
  )
}

function buildExplanation(
  stretchers: { firstName: string; burden: number }[],
  protectedNames: string[]
): string {
  if (stretchers.length === 1) {
    const s = stretchers[0]
    if (protectedNames.length > 0) {
      return `${s.firstName} stretches this week — lowest accumulated burden. ${protectedNames[0]} is protected this cycle.`
    }
    return `${s.firstName} stretches this week. Lowest accumulated burden over the rotation.`
  }
  const names = stretchers.map((s) => s.firstName)
  const last = names.pop()!
  return `${names.join(", ")} and ${last} share the stretch. Burden balances over the cycle.`
}

// --- Summary helpers ---

/**
 * Burden counts: score-based totals.
 * count = total burden points (sum of weekly scores)
 * sacrificeCount = weeks where member had score >= 3 (extreme discomfort)
 * sacrificePoints = sum of scores from those extreme weeks (for overlay %)
 */
export function getBurdenCounts(
  weeks: RotationWeekData[],
  team: TeamMember[]
): {
  memberId: string
  name: string
  count: number
  sacrificeCount: number
  sacrificePoints?: number
}[] {
  const data: Record<string, { count: number; sacrificeCount: number; sacrificePoints: number }> = {}
  for (const m of team) data[m.id] = { count: 0, sacrificeCount: 0, sacrificePoints: 0 }

  for (const week of weeks) {
    for (const mt of week.memberTimes) {
      const score = mt.score ?? 0
      data[mt.memberId].count += score
      if (score >= 3) {
        data[mt.memberId].sacrificeCount++
        data[mt.memberId].sacrificePoints += score
      }
    }
  }

  return team.map((m) => ({
    memberId: m.id,
    name: m.name,
    count: data[m.id].count,
    sacrificeCount: data[m.id].sacrificeCount,
    sacrificePoints: data[m.id].sacrificePoints,
  }))
}

export function hasConsecutiveStretch(
  weeks: RotationWeekData[],
  team: TeamMember[]
): boolean {
  for (const member of team) {
    let prev = false
    for (const week of weeks) {
      const mt = week.memberTimes.find((m) => m.memberId === member.id)
      const current = mt ? mt.discomfort !== "comfortable" : false
      if (current && prev) return true
      prev = current
    }
  }
  return false
}

// --- Share data ---

export type ShareData = {
  t: {
    n: string
    o?: number
    tz?: string
    s: number
    e: number
    hr?: [number, number][]
    ns?: number
    ne?: number
  }[]
  m: {
    d: number
    ah: number
    ao: number
    dur: number
    w: number
    h?: number
    dt?: string
  }
}

export function encodeShareData(
  team: TeamMember[],
  config: MeetingConfig,
  displayTimezone?: string
): string {
  const data: ShareData = {
    t: team.map((m) => ({
      n: m.name,
      tz: m.timezone,
      s: m.workStartHour,
      e: m.workEndHour,
      ...(m.hardNoRanges.length > 0
        ? { hr: m.hardNoRanges.map((r) => [r.start, r.end] as [number, number]) }
        : {}),
    })),
    m: {
      d: config.dayOfWeek,
      ah: config.anchorHour,
      ao: config.anchorOffset,
      dur: config.durationMinutes,
      w: config.rotationWeeks,
      ...(displayTimezone ? { dt: displayTimezone } : {}),
    },
  }
  return btoa(JSON.stringify(data))
}

export function decodeShareData(
  encoded: string
): { team: TeamMember[]; config: MeetingConfig } | null {
  try {
    const data: ShareData = JSON.parse(atob(encoded))
    const team: TeamMember[] = data.t.map((m, i) => {
      const parts = m.n.trim().split(/\s+/)
      const initials =
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (parts[0]?.[0] ?? "?").toUpperCase()

      let hardNoRanges: { start: number; end: number }[] = []
      if (m.hr) {
        hardNoRanges = m.hr.map(([s, e]) => ({ start: s, end: e }))
      } else if (m.ns !== undefined && m.ne !== undefined) {
        hardNoRanges = [{ start: m.ns, end: m.ne }]
      }

      // No silent default. Pass through tz as-is; validateTeamInput blocks if missing/invalid.
      const timezone =
        typeof m.tz === "string" && m.tz.trim().includes("/")
          ? m.tz.trim()
          : ""
      return {
        id: `m-${i}`,
        name: m.n,
        timezone,
        workStartHour: m.s,
        workEndHour: m.e,
        hardNoRanges,
        initials,
      }
    })
    const config: MeetingConfig = {
      dayOfWeek: data.m.d,
      anchorHour: data.m.ah ?? data.m.h ?? 12,
      anchorOffset: data.m.ao ?? 0,
      durationMinutes: data.m.dur,
      rotationWeeks: data.m.w,
      displayTimezone: data.m.dt ?? undefined,
    }
    return { team, config }
  } catch {
    return null
  }
}
