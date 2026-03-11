/**
 * Rule-based explanation generator for rotation schedules.
 * Uses existing computed data; no hardcoded per-team text.
 */

import { DateTime } from "luxon"
import type { TeamMember, RotationWeekData, RotationExplain, PlanMetrics } from "./types"
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
    return "You chose a fixed meeting time. The schedule uses that time every week."
  }
  if (m === "FAIRNESS_GUARANTEE") {
    return "The algorithm found a schedule that meets all fairness rules."
  }
  if (shareable) {
    if (m === "STRICT") return "The schedule balances burden across the team within strict limits."
    if (m === "RELAXED") return "The schedule uses relaxed fairness rules to find a workable rotation."
    return "The schedule was selected to distribute inconvenience as evenly as possible."
  }
  if (forcedReason === "BEAM_EXHAUSTED") {
    return "No schedule could meet the ideal fairness rules. This is the best available compromise given your team's timezones and constraints."
  }
  if (forcedReason === "SPREAD_IMPOSSIBLE") {
    return "Your team's timezone spread makes equal burden impossible. This schedule minimizes the gap."
  }
  if (forcedReason === "CONSECUTIVE_MAX_IMPOSSIBLE") {
    return "Avoiding consecutive stretch weeks for everyone wasn't possible. This schedule limits it as much as it can."
  }
  if (forcedReason === "HARD_CONSTRAINTS_TOO_TIGHT") {
    return "Hard boundaries and working hours leave few viable slots. This schedule works within those limits."
  }
  return "This schedule was chosen as the best balance given your team's constraints."
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

  sections.push({
    title: "Why this schedule was selected",
    content: formatModeReason(explain.modeUsed, shareable, explain.forcedReason),
  })

  if (team.length >= 2 && tzSpread.spreadHours >= 4 && tzSpread.minTz && tzSpread.maxTz) {
    const minCity = getIanaShortLabel(tzSpread.minTz.member.timezone)
    const maxCity = getIanaShortLabel(tzSpread.maxTz.member.timezone)
    sections.push({
      title: "Main timezone conflict",
      content: `The largest gap is between ${tzSpread.minTz.member.name} (${minCity}) and ${tzSpread.maxTz.member.name} (${maxCity})—about ${Math.round(tzSpread.spreadHours)} hours apart. Any shared meeting time will fall outside comfortable hours for someone.`,
    })
  }

  if (maxBurdenNames.length > 0) {
    const names = maxBurdenNames.join(" and ")
    const reason =
      tzSpread.spreadHours >= 6
        ? "because their timezone sits at the edge of the team's spread"
        : "based on their working hours and timezone"
    sections.push({
      title: "Burden distribution",
      content: `${names} ${maxBurdenNames.length === 1 ? "carries" : "carry"} the most inconvenience ${reason}. ${isEven ? "Burden is spread as evenly as possible." : `The spread is ${spread} point${spread === 1 ? "" : "s"} between the most and least comfortable members.`}`,
    })
  }

  if (zeroBurdenNames.length > 0 && zeroBurdenNames.length < team.length) {
    const names = zeroBurdenNames.join(" and ")
    sections.push({
      title: "Why some members are not rotating",
      content: `${names} ${zeroBurdenNames.length === 1 ? "stays" : "stay"} fully comfortable because the chosen times fall within ${zeroBurdenNames.length === 1 ? "their" : "their"} overlap window. When the team spans many timezones, some members naturally sit inside the shared slot.`,
    })
  }

  if (timesVary) {
    sections.push({
      title: "Time rotation",
      content: "The meeting time rotates across weeks to spread inconvenience. Different weeks use different times to avoid stacking burden on the same people.",
    })
  } else if (weeks.length >= 2 && !explain.modeUsed?.includes("FIXED")) {
    sections.push({
      title: "Stable time",
      content: "The same time works best across all weeks. Rotating to other times would increase total burden or violate constraints.",
    })
  }

  const fairnessLabel = shareable
    ? "The algorithm found a balanced solution."
    : explain.forcedReason
      ? "This is a constrained compromise—perfect fairness wasn't possible with your team's timezones and constraints."
      : "There is an unavoidable timezone conflict; this schedule minimizes its impact."
  sections.push({
    title: "Overall fairness summary",
    content: fairnessLabel + (consecutive ? " One or more members have consecutive stretch weeks." : ""),
  })

  return sections
}
