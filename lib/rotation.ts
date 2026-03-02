import { DateTime, FixedOffsetZone } from "luxon"
import {
  TeamMember,
  MeetingConfig,
  RotationWeekData,
  MemberTime,
  Discomfort,
  formatHourLabel,
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

// --- IANA timezone mapping (backward compat: offset → IANA for DST-safe zones) ---
// When DB stores only offset, we map to common IANA zones. DST handled by Luxon.
const OFFSET_TO_IANA: Record<number, string> = {
  [-10]: "Pacific/Honolulu",
  [-9]: "America/Anchorage",
  [-8]: "America/Los_Angeles",
  [-7]: "America/Denver",
  [-6]: "America/Chicago",
  [-5]: "America/New_York",
  [-4]: "America/Halifax",
  [-3]: "America/Sao_Paulo",
  [-2]: "America/Noronha",
  [-1]: "Atlantic/Azores",
  0: "Europe/London",
  1: "Europe/Berlin",
  2: "Africa/Cairo",
  3: "Europe/Moscow",
  4: "Asia/Dubai",
  5: "Asia/Karachi",
  5.5: "Asia/Kolkata",
  6: "Asia/Dhaka",
  7: "Asia/Bangkok",
  8: "Asia/Singapore",
  9: "Asia/Tokyo",
  9.5: "Australia/Adelaide",
  10: "Australia/Sydney",
  11: "Pacific/Noumea",
  12: "Pacific/Auckland",
}

/** Resolve IANA zone for member. Uses timezone if present, else maps from offset. */
function getMemberZone(member: TeamMember): string | FixedOffsetZone {
  if ("timezone" in member && typeof (member as { timezone?: string }).timezone === "string") {
    return (member as { timezone: string }).timezone
  }
  const tz = OFFSET_TO_IANA[member.utcOffset]
  if (tz) return tz
  // Fallback: fixed offset (no DST) for unlisted offsets
  return FixedOffsetZone.instance(Math.round(member.utcOffset * 60))
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
 * Check if candidate UTC time is valid for all members.
 * Rejects if any member has hard boundary violation in their local time.
 */
function isCandidateValid(
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

function findValidCandidates(
  utcDate: DateTime,
  team: TeamMember[]
): number[] {
  return getCandidateUtcHours().filter((h) =>
    isCandidateValid(utcDate, h, team)
  )
}

/** Circular distance in minutes (0–1439). Used for base-time preference. */
function distanceMinutes(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 1440 - d)
}

/** Convert UTC hour to display-timezone minutes (0–1439). */
function utcHourToDisplayMinutes(utcHour: number, anchorOffset: number): number {
  const displayHour = utcHour + anchorOffset
  const m = Math.round(displayHour * 60)
  return ((m % 1440) + 1440) % 1440
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

function generateRotationWithMode(
  team: TeamMember[],
  config: MeetingConfig,
  mode: ConstraintMode
): { weeks: RotationWeekData[]; modeUsed: ConstraintMode } {
  const weeks: RotationWeekData[] = []
  const burden: Record<string, number> = {}
  let lastWeekMaxMemberId: string | null = null
  let prevSlotIndex: number = -1

  const enforceBurdenDiff = mode === "STRICT" || mode === "RELAXED"
  const enforceConsecutiveMax = mode === "STRICT"

  for (const m of team) burden[m.id] = 0

  const utcStart = getNextMeetingDayUtc(config.dayOfWeek)

  // Debug: Log team configuration at start
  if (DEBUG) {
    console.group("[rotation] Team configuration")
    console.table(
      team.map((m) => ({
        id: m.id.slice(0, 8),
        name: m.name,
        utcOffset: m.utcOffset,
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
    let hardValidCandidates = findValidCandidates(utcDate, team)
    const baseTimeMinutes = config.baseTimeMinutes
    if (baseTimeMinutes != null) {
      hardValidCandidates = sortByBaseTimePreference(
        hardValidCandidates,
        baseTimeMinutes,
        config.anchorOffset
      )
    }

    const rejectedBy = { burdenDiff: 0, consecutiveMax: 0 }

    if (hardValidCandidates.length === 0) {
      if (DEBUG) console.log("[rotation] week", i + 1, "no hard-valid candidates, aborting")
      return { weeks: [], modeUsed: mode }
    }

    // Fairness weights (configurable)
    const FAIRNESS_WEIGHT = 1000 // Primary: minimax burden
    const EQUITY_WEIGHT = 100   // Secondary: penalize low-burden members staying at 0
    const GAP_WEIGHT = 10       // Tertiary: minimize spread
    const PAIN_WEIGHT = 1       // Quaternary: minimize total discomfort

    let bestHour: number | null = null
    let bestMemberTimes: MemberTime[] | null = null
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
      const baseTimeDist =
        baseTimeMinutes != null
          ? distanceMinutes(
              utcHourToDisplayMinutes(utcHour, config.anchorOffset),
              baseTimeMinutes
            )
          : 0

      // Composite score: lower is better
      // Primary: minimax (maxProjected)
      // Secondary: equity penalty (penalize keeping low-burden members comfortable)
      // Tertiary: gap (spread)
      // Quaternary: sum discomfort
      const compositeScore =
        maxProjected * FAIRNESS_WEIGHT +
        equityPenalty * EQUITY_WEIGHT +
        gap * GAP_WEIGHT +
        sumDiscomfort * PAIN_WEIGHT

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

    // Debug: log top 5 candidates for week 1
    if (DEBUG && i === 0 && candidateEvaluations.length > 0) {
      candidateEvaluations.sort((a, b) => a.score - b.score)
      console.group("[rotation] Week 1 - Top 5 candidates")
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

    if (bestHour === null || !bestMemberTimes) {
      if (DEBUG) {
        console.log("[rotation] week", i + 1, "mode", mode, "no acceptable candidate", {
          totalCandidates,
          hardValidCandidates: hardValidCandidates.length,
          rejectedBy,
        })
      }
      return { weeks: [], modeUsed: mode }
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

      console.group(`[rotation] Week ${i + 1} — mode: ${mode}`)
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

    lastWeekMaxMemberId = (() => {
      const maxScore = computeMaxIndividualScore(bestMemberTimes)
      if (maxScore === 0) return null
      const maxMembers = bestMemberTimes.filter((m) => (m.score ?? 0) === maxScore)
      return maxMembers[0]?.memberId ?? null
    })()

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

    weeks.push({
      week: i + 1,
      date: formatDate(utcDate),
      utcHour: bestHour,
      memberTimes: bestMemberTimes,
      explanation,
    })
  }

  return { weeks, modeUsed: mode }
}

// --- Core rotation engine ---

export function canGenerateRotation(
  team: TeamMember[],
  config: MeetingConfig
): { valid: boolean; reason?: string } {
  if (team.length < 2) {
    return { valid: false, reason: "Add at least 2 team members." }
  }

  const utcDate = getNextMeetingDayUtc(config.dayOfWeek)
  const valid = findValidCandidates(utcDate, team)
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
 * Generate rotation with 3-level constraint degradation:
 * Mode A (STRICT): hard boundaries + burden diff <= 2 + no consecutive max
 * Mode B (RELAXED): hard boundaries + burden diff <= 2 (ignore consecutive)
 * Mode C (FALLBACK): hard boundaries only (fairness-first with equity weighting)
 */
export function generateRotation(
  team: TeamMember[],
  config: MeetingConfig
): RotationWeekData[] {
  if (team.length < 2) return []

  const modes: ConstraintMode[] = ["STRICT", "RELAXED", "FALLBACK"]

  for (const mode of modes) {
    const { weeks } = generateRotationWithMode(team, config, mode)
    if (weeks.length === config.rotationWeeks) {
      if (DEBUG) {
        console.log("[rotation] succeeded with mode", mode)

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

        console.group("[rotation] Final burden distribution")
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
        console.warn("[rotation] modeUsed:", mode)
      }
      return weeks
    }
  }

  if (DEBUG) console.log("[rotation] all modes failed, returning []")
  return []
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
    o: number
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
  }
}

export function encodeShareData(
  team: TeamMember[],
  config: MeetingConfig
): string {
  const data: ShareData = {
    t: team.map((m) => ({
      n: m.name,
      o: m.utcOffset,
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

      return {
        id: `m-${i}`,
        name: m.n,
        utcOffset: m.o,
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
    }
    return { team, config }
  } catch {
    return null
  }
}
