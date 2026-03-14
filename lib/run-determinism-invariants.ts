/**
 * Phase 0.2 Result Invariants for /api/dev/run-determinism.
 * FAIL-FAST assertions — does NOT modify rotation algorithm.
 */
import type {
  TeamMember,
  MeetingConfig,
  RotationWeekData,
  MemberTime,
  PlanMetrics,
  FairnessThresholds,
} from "./types"
import {
  DEFAULT_FAIRNESS_THRESHOLDS,
  type HardNoRange,
} from "./types"

function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const intH = Math.floor(h)
  const minutes = Math.round((h - intH) * 60)
  const minStr = minutes.toString().padStart(2, "0")
  if (intH === 0) return `12:${minStr} AM`
  if (intH === 12) return `12:${minStr} PM`
  return intH < 12 ? `${intH}:${minStr} AM` : `${intH - 12}:${minStr} PM`
}

function getThresholds(config: MeetingConfig): FairnessThresholds {
  return {
    ...DEFAULT_FAIRNESS_THRESHOLDS,
    ...config.fairnessThresholds,
  }
}

function isInHardNoLocal(
  localHour: number,
  ranges: HardNoRange[]
): boolean {
  const h = ((localHour % 24) + 24) % 24
  for (const range of ranges) {
    if (range.start < range.end) {
      if (h >= range.start && h < range.end) return true
    } else {
      if (h >= range.start || h < range.end) return true
    }
  }
  return false
}

/**
 * Compute plan metrics from weeks (same logic as rotation's computePlanMetrics).
 */
function computePlanMetricsFromWeeks(
  team: TeamMember[],
  weeks: RotationWeekData[]
): PlanMetrics {
  const burden: Record<string, number> = {}
  for (const m of team) burden[m.id] = 0
  for (const week of weeks) {
    for (const mt of week.memberTimes) {
      burden[mt.memberId] = (burden[mt.memberId] ?? 0) + (mt.score ?? 0)
    }
  }
  const values = Object.values(burden)
  const maxBurden = values.length ? Math.max(...values) : 0
  const minBurden = values.length ? Math.min(...values) : 0
  const spread = maxBurden - minBurden
  const maxBurdenMemberIds = team
    .filter((m) => (burden[m.id] ?? 0) === maxBurden)
    .map((m) => m.id)
  return { maxBurden, minBurden, spread, maxBurdenMemberIds }
}

export type ResultInvariantViolation = {
  runIndex: number
  weekIndex: number
  memberName: string
  selectedUtcHour: number
  localStart: number
  localEnd: number
  workWindow: string
  hardNoRanges: HardNoRange[]
  reason: string
}

/**
 * 1) HardNo: selected local time range MUST NOT overlap any hard_no_ranges.
 * Supports cross-midnight and 0.5-hour precision.
 */
function checkHardNo(
  member: TeamMember,
  localStart: number,
  localEnd: number,
  durationMinutes: number,
  runIndex: number,
  weekIndex: number,
  selectedUtcHour: number
): ResultInvariantViolation | null {
  const workWindow = `${formatHourLabel(member.workStartHour)}–${formatHourLabel(member.workEndHour)}`
  const steps = [0]
  for (let i = 30; i < durationMinutes; i += 30) steps.push(i)
  steps.push(durationMinutes)
  for (const offsetMin of steps) {
    const h = localStart + offsetMin / 60
    const localHour = h >= 24 ? h - 24 : h
    if (isInHardNoLocal(localHour, member.hardNoRanges)) {
      return {
        runIndex,
        weekIndex,
        memberName: member.name,
        selectedUtcHour,
        localStart,
        localEnd,
        workWindow,
        hardNoRanges: member.hardNoRanges,
        reason: `Meeting overlaps hardNo at local ${formatHourLabel(localHour)} (range [${formatHourLabel(localStart)}, ${formatHourLabel(localEnd)}))`,
      }
    }
  }
  return null
}

/**
 * Validate all result invariants for a single run.
 * Uses exact localHour from rotation output (memberTimes) — no recomputation.
 */
export function validateResultInvariants(
  weeks: RotationWeekData[],
  team: TeamMember[],
  config: MeetingConfig,
  runIndex: number
): ResultInvariantViolation[] {
  const violations: ResultInvariantViolation[] = []
  const durationMinutes = config.durationMinutes
  const durationHours = durationMinutes / 60

  for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
    const week = weeks[weekIdx]
    const selectedUtcHour = week.utcHour
    const memberTimeByMemberId = new Map(
      week.memberTimes.map((mt) => [mt.memberId, mt])
    )

    for (const member of team) {
      const mt = memberTimeByMemberId.get(member.id)
      if (!mt) continue

      const localStart = mt.localHour
      const localEnd = localStart + durationHours

      const workWindow = `${formatHourLabel(member.workStartHour)}–${formatHourLabel(member.workEndHour)}`

      const hardNoViolation = checkHardNo(
        member,
        localStart,
        localEnd,
        durationMinutes,
        runIndex,
        weekIdx,
        selectedUtcHour
      )
      if (hardNoViolation) violations.push(hardNoViolation)

      // Work window is SOFT (burden only). Do NOT add workViolation — outside work hours is allowed.
    }
  }

  const thresholds = getThresholds(config)
  const computed = computePlanMetricsFromWeeks(team, weeks)

  if (computed.spread > thresholds.spreadLimit) {
    violations.push({
      runIndex,
      weekIndex: -1,
      memberName: "(plan-wide)",
      selectedUtcHour: -1,
      localStart: -1,
      localEnd: -1,
      workWindow: "",
      hardNoRanges: [],
      reason: `Spread ${computed.spread} exceeds maxSpread (${thresholds.spreadLimit})`,
    })
  }

  return violations
}

/**
 * Validate MaxBurden consistency: recomputed metrics must match explain.currentPlanMetrics.
 */
export function validateMaxBurdenConsistency(
  weeks: RotationWeekData[],
  team: TeamMember[],
  reportedMetrics: { maxBurden: number; maxBurdenMemberIds: string[] } | undefined,
  runIndex: number
): ResultInvariantViolation[] {
  const violations: ResultInvariantViolation[] = []
  if (!reportedMetrics) return violations

  const computed = computePlanMetricsFromWeeks(team, weeks)
  const sortedReported = [...reportedMetrics.maxBurdenMemberIds].sort()
  const sortedComputed = [...computed.maxBurdenMemberIds].sort()

  if (computed.maxBurden !== reportedMetrics.maxBurden) {
    violations.push({
      runIndex,
      weekIndex: -1,
      memberName: "(plan-wide)",
      selectedUtcHour: -1,
      localStart: -1,
      localEnd: -1,
      workWindow: "",
      hardNoRanges: [],
      reason: `MaxBurden mismatch: computed=${computed.maxBurden}, reported=${reportedMetrics.maxBurden}`,
    })
  }
  if (JSON.stringify(sortedComputed) !== JSON.stringify(sortedReported)) {
    violations.push({
      runIndex,
      weekIndex: -1,
      memberName: "(plan-wide)",
      selectedUtcHour: -1,
      localStart: -1,
      localEnd: -1,
      workWindow: "",
      hardNoRanges: [],
      reason: `MaxBurdenMembers mismatch: computed=[${sortedComputed.join(", ")}], reported=[${sortedReported.join(", ")}]`,
    })
  }
  return violations
}
