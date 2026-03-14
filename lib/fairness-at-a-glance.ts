/**
 * Rule-based dynamic explanations for "Fairness at a glance".
 * All content derived from actual plan analysis — no static/hardcoded copy.
 * Truthful for constrained cases (e.g. SEED 9, asymmetric teams).
 */
import { DateTime } from "luxon"
import type { RotationWeekData } from "./types"
import { computeConsecutiveMax } from "./rotation"

type BurdenEntry = { memberId: string; name: string; count: number }
type TeamEntry = { id: string; name: string; timezone: string }

export type PlanAnalysis = {
  weeks: RotationWeekData[]
  team: TeamEntry[]
  burdenData: BurdenEntry[]
  spread: number
  maxBurden: number
  minBurden: number
  uniqueSlotCount: number
  distinctMaxBurdenMembers: number
  membersWithBurden: number
  /** Count of members with zero burden (e.g. 0/6/7 = 1). */
  zeroBurdenMembersCount: number
  /** Max consecutive weeks same member is max-burden. */
  consecutiveMax: number
  earlyLeader: { name: string; count: number } | null
  lateLeader: { name: string; count: number } | null
  maxBurdenMemberNames: string[]
  tzSpreadHours: number
  minTzMemberName: string | null
  maxTzMemberName: string | null
  avgHardValid: number
  modeUsed?: string
  shareablePlanExists?: boolean
  forcedReason?: string
}

/** Compute plan analysis from raw schedule data. */
export function analyzePlan(input: {
  weeks: RotationWeekData[]
  team: TeamEntry[]
  burdenData: BurdenEntry[]
  explain?: {
    weeks?: Array<{ hardValidCandidatesCount?: number }>
    evidence?: { perWeekHardValidCount?: number[] }
  }
  modeUsed?: string
  shareablePlanExists?: boolean
  forcedReason?: string
}): PlanAnalysis {
  const { weeks, team, burdenData, explain, modeUsed, shareablePlanExists, forcedReason } = input
  const spread =
    burdenData.length > 0
      ? Math.max(...burdenData.map((d) => d.count)) -
        Math.min(...burdenData.map((d) => d.count))
      : 0
  const maxBurden = burdenData.length ? Math.max(...burdenData.map((d) => d.count)) : 0
  const minBurden = burdenData.length ? Math.min(...burdenData.map((d) => d.count)) : 0
  const uniqueSlotCount =
    weeks.length > 0 ? new Set(weeks.map((w) => w.utcHour)).size : 0
  const distinctMaxBurdenMembers = getDistinctMaxBurdenMembers(weeks).size
  const membersWithBurden = burdenData.filter((d) => d.count > 0).length
  const zeroBurdenMembersCount = burdenData.filter((d) => d.count === 0).length
  const maxMemberIdsPerWeek = weeks.map((w) => {
    const scores = w.memberTimes.map((mt) => mt.score ?? 0)
    const maxScore = Math.max(...scores, 0)
    if (maxScore === 0) return ""
    const first = w.memberTimes.find((mt) => (mt.score ?? 0) === maxScore)
    return first?.memberId ?? ""
  })
  const consecutiveMax = computeConsecutiveMax(maxMemberIdsPerWeek)
  const earlyLate = getEarlyLateSummary(weeks, team)
  const earlyLeader = earlyLate.early[0]
    ? { name: earlyLate.early[0].name, count: earlyLate.early[0].count }
    : null
  const lateLeader = earlyLate.late[0]
    ? { name: earlyLate.late[0].name, count: earlyLate.late[0].count }
    : null
  const maxBurdenMembers = burdenData.filter((d) => d.count === maxBurden && maxBurden > 0)
  const maxBurdenMemberNames = maxBurdenMembers.map((m) => m.name)
  const { spreadHours, minTzMemberName, maxTzMemberName } = getTimezoneSpread(
    team,
    weeks[0]?.utcDateIso
  )
  const avgHardValid = getAvgHardValidCandidates(explain)

  return {
    weeks,
    team,
    burdenData,
    spread,
    maxBurden,
    minBurden,
    uniqueSlotCount,
    distinctMaxBurdenMembers,
    membersWithBurden,
    zeroBurdenMembersCount,
    consecutiveMax,
    earlyLeader,
    lateLeader,
    maxBurdenMemberNames,
    tzSpreadHours: spreadHours,
    minTzMemberName,
    maxTzMemberName,
    avgHardValid,
    modeUsed,
    shareablePlanExists,
    forcedReason,
  }
}

const HIGHLY_CONSTRAINED_REASONS = [
  "SPREAD_IMPOSSIBLE",
  "BEAM_EXHAUSTED",
  "HARD_CONSTRAINTS_TOO_TIGHT",
  "NO_FEASIBLE_TIME",
  "INSUFFICIENT_CANDIDATES",
] as const

/**
 * Returns the rotation/distribution bullet. "Inconvenience rotates across the team"
 * ONLY when rotation conditions are actually satisfied. Otherwise returns a
 * truthful distribution-based alternative.
 */
function getRotationBullet(analysis: PlanAnalysis): string | null {
  const {
    spread,
    uniqueSlotCount,
    distinctMaxBurdenMembers,
    membersWithBurden,
    zeroBurdenMembersCount,
    avgHardValid,
    modeUsed,
    shareablePlanExists,
    forcedReason,
    maxBurden,
  } = analysis

  const fr = forcedReason?.toUpperCase()
  const isConstrainedReason = fr && HIGHLY_CONSTRAINED_REASONS.some((r) => fr === r)
  const isFallback = modeUsed?.toUpperCase() === "FALLBACK"
  const hasSkewedBurden =
    zeroBurdenMembersCount >= 1 && spread >= 4 && maxBurden >= 5
  const hasNarrowWindow = avgHardValid > 0 && avgHardValid <= 6

  // ROTATION_ALLOWED: all conditions must be true
  const rotationAllowed =
    shareablePlanExists === true &&
    !isFallback &&
    !isConstrainedReason &&
    spread <= 3 &&
    zeroBurdenMembersCount === 0 &&
    distinctMaxBurdenMembers >= 2 &&
    membersWithBurden >= 2 &&
    uniqueSlotCount >= 4 &&
    (avgHardValid === 0 || avgHardValid > 6)

  if (rotationAllowed) {
    return "Inconvenience rotates across the team."
  }

  // ROTATION_NOT_ALLOWED: use dynamic alternatives
  if (isFallback && isConstrainedReason) {
    return "Valid meeting options are limited, so the schedule prioritizes the lowest-burden time each week."
  }
  if (hasNarrowWindow) {
    return "Inconvenience is distributed across members given the narrow scheduling window."
  }
  if (hasSkewedBurden || (zeroBurdenMembersCount >= 1 && spread >= 4)) {
    return "Burden is shared across the team within the limited set of valid meeting times."
  }
  if (distinctMaxBurdenMembers >= 2 && membersWithBurden >= 2) {
    return "The schedule distributes inconvenience across multiple members over time."
  }
  if (uniqueSlotCount <= 3 && avgHardValid > 0 && avgHardValid <= 8) {
    return "Burden is shared across the team over the cycle, even though valid meeting times are limited."
  }

  return null
}

/** Map plan analysis to truthful, rule-based bullets. */
export function buildFairnessAtGlance(analysis: PlanAnalysis): string[] {
  const bullets: string[] = []
  const {
    spread,
    uniqueSlotCount,
    distinctMaxBurdenMembers,
    membersWithBurden,
    earlyLeader,
    lateLeader,
    maxBurdenMemberNames,
    tzSpreadHours,
    minTzMemberName,
    maxTzMemberName,
    avgHardValid,
    modeUsed,
    shareablePlanExists,
  } = analysis

  // 1. Burden balance — truthful spread description
  if (spread <= 1) {
    bullets.push("Burden is evenly distributed across the team.")
  } else if (spread <= 3) {
    bullets.push(`Burden is well balanced (spread of ${spread}).`)
  } else {
    bullets.push(`Burden varies across members (spread of ${spread}).`)
  }

  // 2. Who takes early meetings most often
  if (earlyLeader && earlyLeader.count > 0) {
    bullets.push(
      `${earlyLeader.name} takes early meetings most often (${earlyLeader.count} week${earlyLeader.count === 1 ? "" : "s"} before 9am local).`
    )
  }

  // 3. Who takes late meetings most often
  if (lateLeader && lateLeader.count > 0) {
    bullets.push(
      `${lateLeader.name} takes late meetings most often (${lateLeader.count} week${lateLeader.count === 1 ? "" : "s"} after 6pm local).`
    )
  }

  // 4. Rotation / shared / distributed — rule-based from solver metrics
  // "Inconvenience rotates across the team" ONLY when rotation conditions are actually satisfied.
  const rotationBullet = getRotationBullet(analysis)
  if (rotationBullet) bullets.push(rotationBullet)

  // 6. Edge-of-timezone burden — when one member at spread edge carries more
  const mentionedInEarlyLate = new Set([
    earlyLeader?.name,
    lateLeader?.name,
  ].filter(Boolean))
  if (
    maxBurdenMemberNames.length > 0 &&
    tzSpreadHours >= 8 &&
    (minTzMemberName || maxTzMemberName)
  ) {
    const edgeName = maxBurdenMemberNames[0]
    if (
      edgeName &&
      (edgeName === minTzMemberName || edgeName === maxTzMemberName)
    ) {
      bullets.push(
        `${edgeName} carries slightly more burden because they are at the edge of the timezone spread.`
      )
      mentionedInEarlyLate.add(edgeName)
    }
  }
  // Fallback: who carries highest burden (when not already covered by early/late)
  const topBurdenName = maxBurdenMemberNames[0]
  if (
    topBurdenName &&
    maxBurdenMemberNames.length > 0 &&
    analysis.maxBurden > analysis.minBurden &&
    !mentionedInEarlyLate.has(topBurdenName)
  ) {
    if (maxBurdenMemberNames.length === 1) {
      bullets.push(`${topBurdenName} carries the highest burden.`)
    } else {
      bullets.push(
        `${maxBurdenMemberNames.slice(0, 2).join(" and ")} carry the highest burden.`
      )
    }
  }

  // 7. Timezone / slot availability — focus on slot availability, not burden balance
  if (tzSpreadHours >= 10) {
    bullets.push(
      "A wide timezone gap limits how many valid meeting times are available."
    )
  } else if (avgHardValid > 0 && avgHardValid <= 3) {
    bullets.push(
      "Because the team spans a wide timezone range, only a small number of valid meeting times exist."
    )
  }

  // 8. Relaxed path but shareable
  if (modeUsed?.toUpperCase() === "RELAXED" && shareablePlanExists === true) {
    bullets.push(
      "This schedule was found using a more flexible search, but it still meets the fairness limits."
    )
  }

  return bullets.slice(0, 6)
}

/** Convenience: analyze plan and build bullets in one call. */
export function getFairnessAtAGlanceBullets(input: {
  weeks: RotationWeekData[]
  team: { id: string; name: string; timezone?: string }[]
  burdenData: BurdenEntry[]
  spread: number
  explain?: {
    weeks?: Array<{ hardValidCandidatesCount?: number }>
    evidence?: { perWeekHardValidCount?: number[] }
  }
  modeUsed?: string
  shareablePlanExists?: boolean
  forcedReason?: string
}): string[] {
  const teamWithTz = input.team.map((t) => ({
    id: t.id,
    name: t.name,
    timezone: t.timezone ?? "UTC",
  }))
  const analysis = analyzePlan({
    weeks: input.weeks,
    team: teamWithTz,
    burdenData: input.burdenData,
    explain: input.explain,
    modeUsed: input.modeUsed,
    shareablePlanExists: input.shareablePlanExists,
    forcedReason: input.forcedReason,
  })
  return buildFairnessAtGlance(analysis)
}

function getDistinctMaxBurdenMembers(weeks: RotationWeekData[]): Set<string> {
  const ids = new Set<string>()
  for (const week of weeks) {
    const scores = week.memberTimes.map((mt) => mt.score ?? 0)
    const maxScore = Math.max(...scores, 0)
    if (maxScore === 0) continue
    for (const mt of week.memberTimes) {
      if ((mt.score ?? 0) === maxScore) ids.add(mt.memberId)
    }
  }
  return ids
}

function getEarlyLateSummary(
  weeks: RotationWeekData[],
  team: TeamEntry[]
): {
  early: { memberId: string; name: string; count: number }[]
  late: { memberId: string; name: string; count: number }[]
} {
  const earlyCount: Record<string, number> = {}
  const lateCount: Record<string, number> = {}
  for (const m of team) {
    earlyCount[m.id] = 0
    lateCount[m.id] = 0
  }
  for (const w of weeks) {
    for (const mt of w.memberTimes) {
      const score = mt.score ?? 0
      if (score <= 0) continue
      const h = ((mt.localHour % 24) + 24) % 24
      if (h < 9) earlyCount[mt.memberId] = (earlyCount[mt.memberId] ?? 0) + 1
      if (h >= 18) lateCount[mt.memberId] = (lateCount[mt.memberId] ?? 0) + 1
    }
  }
  const byName = new Map(team.map((m) => [m.id, m.name]))
  return {
    early: Object.entries(earlyCount)
      .filter(([, c]) => c > 0)
      .map(([id, count]) => ({ memberId: id, name: byName.get(id) ?? "—", count }))
      .sort((a, b) => b.count - a.count),
    late: Object.entries(lateCount)
      .filter(([, c]) => c > 0)
      .map(([id, count]) => ({ memberId: id, name: byName.get(id) ?? "—", count }))
      .sort((a, b) => b.count - a.count),
  }
}

function getMemberOffsetMinutes(iana: string, dateIso?: string): number {
  const ref = dateIso
    ? DateTime.fromISO(dateIso, { zone: iana })
    : DateTime.now().setZone(iana)
  return ref.offset
}

function getTimezoneSpread(
  team: TeamEntry[],
  dateIso?: string
): {
  spreadHours: number
  minTzMemberName: string | null
  maxTzMemberName: string | null
} {
  if (team.length < 2) {
    return {
      spreadHours: 0,
      minTzMemberName: team[0]?.name ?? null,
      maxTzMemberName: team[0]?.name ?? null,
    }
  }
  let minOffset = Infinity
  let maxOffset = -Infinity
  let minMember: TeamEntry | null = null
  let maxMember: TeamEntry | null = null
  for (const m of team) {
    const offset = getMemberOffsetMinutes(m.timezone, dateIso)
    if (offset < minOffset) {
      minOffset = offset
      minMember = m
    }
    if (offset > maxOffset) {
      maxOffset = offset
      maxMember = m
    }
  }
  const spreadHours = (maxOffset - minOffset) / 60
  return {
    spreadHours,
    minTzMemberName: minMember?.name ?? null,
    maxTzMemberName: maxMember?.name ?? null,
  }
}

function getAvgHardValidCandidates(explain?: {
  weeks?: Array<{ hardValidCandidatesCount?: number }>
  evidence?: { perWeekHardValidCount?: number[] }
}): number {
  const fromWeeks =
    explain?.weeks?.map((w) => w.hardValidCandidatesCount ?? 0).filter((n) => n >= 0) ?? []
  const fromEvidence = explain?.evidence?.perWeekHardValidCount ?? []
  const counts = fromWeeks.length > 0 ? fromWeeks : fromEvidence
  if (counts.length === 0) return 0
  return counts.reduce((a, b) => a + b, 0) / counts.length
}

/** Dynamic description for "Rotation generated" card — truthful for constrained plans. */
export function getRotationCardDescription(analysis: PlanAnalysis): string {
  const { uniqueSlotCount, weeks, distinctMaxBurdenMembers, avgHardValid } = analysis
  if (uniqueSlotCount <= 1 && weeks.length > 1) {
    return "Meeting time repeats because few valid slots fit everyone's constraints."
  }
  if (avgHardValid > 0 && avgHardValid <= 3) {
    return "The schedule works within tight timezone and availability constraints."
  }
  if (distinctMaxBurdenMembers >= 2) {
    return "The schedule distributes meeting inconvenience across the cycle."
  }
  return "The schedule balances burden within the available options."
}
