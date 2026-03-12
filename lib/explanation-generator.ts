/**
 * Rule-based explanation generator for rotation schedules.
 * Uses existing computed data; no hardcoded per-team text.
 *
 * Product rule: Hard boundaries always come first. Parallel never forces burden
 * onto members who would cross hard boundaries just to make the schedule look
 * more evenly rotated.
 */

import { DateTime } from "luxon"
import type { TeamMember, RotationWeekData, RotationExplain } from "./types"
import { getBurdenCounts, hasConsecutiveStretch } from "./rotation"
import { getIanaShortLabel } from "./timezone"

export type ExplanationSection = {
  title: string
  content: string
}

type ExplanationInput = {
  weeks: RotationWeekData[]
  team: TeamMember[]
  explain: RotationExplain
  meetingTitle?: string
  rotationWeeks?: number
}

/** Case 1: Broad rotation possible. Case 2: Rotation only within a subset. Case 3: Highly constrained. */
type RotationCase = "broad" | "subset" | "constrained"

const HIGHLY_CONSTRAINED_REASONS = [
  "SPREAD_IMPOSSIBLE",
  "BEAM_EXHAUSTED",
  "HARD_CONSTRAINTS_TOO_TIGHT",
  "NO_FEASIBLE_TIME",
  "INSUFFICIENT_CANDIDATES",
] as const

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

function getAvgHardValidCandidates(explain: RotationExplain): number {
  const fromWeeks = explain.weeks?.map((w) => w.hardValidCandidatesCount).filter((n) => n >= 0) ?? []
  const fromEvidence = explain.evidence?.perWeekHardValidCount ?? []
  const counts = fromWeeks.length > 0 ? fromWeeks : fromEvidence
  if (counts.length === 0) return 0
  return counts.reduce((a, b) => a + b, 0) / counts.length
}

function detectRotationCase(
  input: {
    explain: RotationExplain
    team: TeamMember[]
    weeks: RotationWeekData[]
    zeroBurdenMembers: string[]
    tzSpreadHours: number
  }
): RotationCase {
  const { explain, team, weeks, zeroBurdenMembers, tzSpreadHours } = input

  const forcedReason = explain.forcedReason?.toUpperCase()
  const avgHardValid = getAvgHardValidCandidates(explain)
  const weeksWithUnavoidableMax =
    explain.weeks?.filter((w) => w.unavoidableMaxMemberId).length ?? 0
  const distinctMaxMembers = getDistinctMaxBurdenMembers(weeks)

  // Case 3: Highly constrained — forced reason or very few valid options
  if (
    forcedReason &&
    HIGHLY_CONSTRAINED_REASONS.some((r) => forcedReason === r)
  ) {
    return "constrained"
  }
  if (avgHardValid > 0 && avgHardValid <= 2.5) {
    return "constrained"
  }
  if (tzSpreadHours >= 10) {
    return "constrained"
  }

  // Case 2: Subset rotation — some members never have burden, or some weeks have unavoidable max
  if (
    zeroBurdenMembers.length > 0 &&
    zeroBurdenMembers.length < team.length
  ) {
    return "subset"
  }
  if (weeksWithUnavoidableMax > 0 && distinctMaxMembers.size < team.length) {
    return "subset"
  }

  return "broad"
}

function getMemberOffsetMinutes(iana: string, dateIso?: string): number {
  const ref = dateIso
    ? DateTime.fromISO(dateIso, { zone: iana })
    : DateTime.now().setZone(iana)
  return ref.offset
}

function getTimezoneSpread(team: TeamMember[], dateIso?: string): {
  spreadHours: number
  minTz: { member: TeamMember; offsetMinutes: number } | null
  maxTz: { member: TeamMember; offsetMinutes: number } | null
} {
  if (team.length < 2) {
    const m = team[0]
    const offset = m ? getMemberOffsetMinutes(m.timezone, dateIso) : 0
    return {
      spreadHours: 0,
      minTz: m ? { member: m, offsetMinutes: offset } : null,
      maxTz: m ? { member: m, offsetMinutes: offset } : null,
    }
  }
  let minOffset = Infinity
  let maxOffset = -Infinity
  let minMember: TeamMember = team[0]
  let maxMember: TeamMember = team[0]
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
    minTz: { member: minMember, offsetMinutes: minOffset },
    maxTz: { member: maxMember, offsetMinutes: maxOffset },
  }
}

function formatModeReason(mode: string, shareable: boolean, forcedReason?: string): string {
  const m = mode?.toUpperCase()
  if (m === "FIXED_ANCHOR") {
    return "You chose a fixed time—we use it every week."
  }
  if (m === "FAIRNESS_GUARANTEE") {
    return "This one meets all our fairness rules."
  }
  if (shareable) {
    if (m === "STRICT") return "This schedule keeps inconvenience balanced within our fairness rules."
    if (m === "RELAXED") return "We relaxed some rules to find a workable rotation—this is the best fit for your team."
    return "This schedule spreads inconvenience as evenly as possible."
  }
  if (forcedReason === "BEAM_EXHAUSTED") {
    return "Given your timezones and constraints, no schedule could meet the ideal rules—this is the best option available."
  }
  if (forcedReason === "SPREAD_IMPOSSIBLE") {
    return "Your team spans too many timezones for everyone to be equally comfortable. This schedule minimizes the gap."
  }
  if (forcedReason === "CONSECUTIVE_MAX_IMPOSSIBLE") {
    return "Avoiding back-to-back stretch weeks for everyone wasn't possible. This schedule limits it as much as we can."
  }
  if (forcedReason === "HARD_CONSTRAINTS_TOO_TIGHT") {
    return "Hard boundaries and working hours leave few viable slots. This schedule works within those limits."
  }
  return "This is the best balance we could find given your team's constraints."
}

export function generateExplanation(input: ExplanationInput): ExplanationSection[] {
  const { weeks, team, explain, meetingTitle = "this team", rotationWeeks = weeks.length } = input
  const sections: ExplanationSection[] = []

  const burdenData = getBurdenCounts(weeks, team)
  const maxCount = Math.max(...burdenData.map((d) => d.count), 0)
  const minCount = Math.min(...burdenData.map((d) => d.count), 0)
  const spread = maxCount - minCount
  const isEven = spread <= 1
  const consecutive = hasConsecutiveStretch(weeks, team)
  const metrics = explain.currentPlanMetrics
  const shareable = explain.shareablePlanExists !== false

  const dateIso = weeks[0]?.utcDateIso
  const tzSpread = getTimezoneSpread(team, dateIso)

  const maxBurdenMembers = metrics?.maxBurdenMemberIds ?? burdenData.filter((d) => d.count === maxCount).map((d) => d.memberId)
  const zeroBurdenMembers = burdenData.filter((d) => d.count === 0).map((d) => d.memberId)
  const maxBurdenNames = maxBurdenMembers
    .map((id) => team.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[]
  const zeroBurdenNames = zeroBurdenMembers
    .map((id) => team.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[]

  const timesVary = weeks.length >= 2 && new Set(weeks.map((w) => w.utcHour)).size > 1
  const rotationCase = detectRotationCase({
    explain,
    team,
    weeks,
    zeroBurdenMembers: zeroBurdenMembers,
    tzSpreadHours: tzSpread.spreadHours,
  })

  const hardBoundariesLead =
    "Parallel always respects hard boundaries first—no meeting time crosses anyone's blocked slots. "
  const modeReason = formatModeReason(explain.modeUsed, shareable, explain.forcedReason)

  const overviewByCase: Record<RotationCase, string> = {
    broad:
      hardBoundariesLead +
      "Among valid options, we found multiple times that work and distributed inconvenience across weeks so no one is consistently stuck with the hardest slot. " +
      modeReason,
    subset:
      hardBoundariesLead +
      "Not every member can absorb difficult meeting times without crossing hard boundaries, so burden rotates only across the subset of members whose schedules can flex. " +
      modeReason,
    constrained:
      hardBoundariesLead +
      "Timezone distance and hard constraints leave very limited valid meeting options. We prioritize the lowest valid burden and the fairest distribution available within those limits. " +
      modeReason,
  }

  sections.push({
    title: "Schedule overview",
    content: overviewByCase[rotationCase],
  })

  if (team.length >= 2 && tzSpread.spreadHours >= 4 && tzSpread.minTz && tzSpread.maxTz) {
    const minCity = getIanaShortLabel(tzSpread.minTz.member.timezone)
    const maxCity = getIanaShortLabel(tzSpread.maxTz.member.timezone)
    sections.push({
      title: "Timezone constraint",
      content: `The largest gap is between ${tzSpread.minTz.member.name} (${minCity}) and ${tzSpread.maxTz.member.name} (${maxCity})—about ${Math.round(tzSpread.spreadHours)} hours apart. Any shared meeting time will be early morning or late night for someone.`,
    })
  }

  if (maxBurdenNames.length > 0) {
    const names = maxBurdenNames.join(" and ")
    const reason =
      tzSpread.spreadHours >= 6
        ? "because they sit at the edge of the team's timezone range"
        : "based on their working hours and timezone"
    const fairnessNote =
      rotationCase === "constrained"
        ? " We did not choose uneven burden arbitrarily—hard constraints are respected first."
        : isEven
          ? " We spread it as evenly as possible within the valid options."
          : " Some members take more stretch weeks than others given the constraints."
    sections.push({
      title: "Fairness distribution",
      content: `${names} ${maxBurdenNames.length === 1 ? "carries" : "carry"} more inconvenience ${reason}.${fairnessNote}`,
    })
  }

  if (zeroBurdenNames.length > 0 && zeroBurdenNames.length < team.length) {
    const names = zeroBurdenNames.join(" and ")
    const subsetNote =
      rotationCase === "subset"
        ? " Their schedules don't allow difficult times without crossing hard boundaries, so burden rotates only among those who can flex."
        : " Meeting times fall in the natural overlap of your team's timezones."
    sections.push({
      title: "Who stays comfortable",
      content: `${names} ${zeroBurdenNames.length === 1 ? "stays" : "stay"} within comfortable hours.${subsetNote}`,
    })
  }

  const rotationContentByCase: Record<RotationCase, string | null> = {
    broad: timesVary
      ? "Meeting times rotate across weeks so inconvenience is shared. Different weeks use different times—no one gets stuck with the worst slot every time."
      : "The same time works best across all weeks. Rotating would increase overall inconvenience or conflict with your constraints.",
    subset: timesVary
      ? "Burden rotates among the members who can flex. Those who stay comfortable cannot absorb difficult times without crossing hard boundaries."
      : "Valid options are limited—burden rotates only among the subset of members whose schedules allow it.",
    constrained: timesVary
      ? "Valid options were limited. This schedule uses the best available time each week within hard boundaries."
      : "Valid options were limited. The same time works best across all weeks within the constraints.",
  }
  const rotationContent = rotationContentByCase[rotationCase]
  if (rotationContent && weeks.length >= 2 && !explain.modeUsed?.includes("FIXED")) {
    sections.push({
      title: "How rotation works",
      content: rotationContent,
    })
  }

  const fairnessLabelByCase: Record<RotationCase, string> = {
    broad:
      shareable
        ? "We found a balanced solution."
        : "This schedule balances inconvenience as well as we can within the valid options.",
    subset:
      "We found the fairest distribution among members who can flex. Hard boundaries prevent some from rotating.",
    constrained:
      "Perfect fairness isn't always possible when valid options are limited. This schedule minimizes burden and distributes it as fairly as possible within those limits.",
  }
  const fairnessLabel = fairnessLabelByCase[rotationCase]
  sections.push({
    title: "Fairness summary",
    content: fairnessLabel + (consecutive ? " One or more members have back-to-back stretch weeks." : ""),
  })

  return sections
}
