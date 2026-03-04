import { getTimezoneDisplayLabel } from "./timezone"

export type Discomfort = "comfortable" | "stretch" | "sacrifice"

export type HardNoRange = {
  start: number
  end: number
}

export type TeamMember = {
  id: string
  name: string
  /** IANA timezone (e.g. America/New_York). Required for all fairness calculations. */
  timezone: string
  workStartHour: number
  workEndHour: number
  hardNoRanges: HardNoRange[]
  initials: string
}

export type MeetingConfig = {
  dayOfWeek: number
  anchorHour: number
  anchorOffset: number
  durationMinutes: number
  rotationWeeks: number
  /** Base time preference in minutes from midnight (0–1439). null = auto fair mode. */
  baseTimeMinutes?: number | null
  /** Fairness thresholds (optional; uses defaults if not set). */
  fairnessThresholds?: Partial<FairnessThresholds>
  /** IANA display timezone (e.g. America/New_York). Used for share links. */
  displayTimezone?: string
}

/** Default fairness thresholds for shareable plans. */
export const DEFAULT_FAIRNESS_THRESHOLDS: FairnessThresholds = {
  spreadLimit: 3,
  consecutiveMaxLimit: 2,
  rotationThreshold: 0.6,
}

export type MemberTime = {
  memberId: string
  localHour: number
  localTime: string
  discomfort: Discomfort
  /** Weighted burden score 0–4 (used for fairness; derived from minutes outside working hours) */
  score?: number
  /** When member's local date differs from base: e.g. "Thu, Mar 6" or "+1 day" / "-1 day" */
  localDateLabel?: string
  /** -1, 0, or +1 when local date differs from base UTC date */
  dateOffset?: number
}

export type RotationWeekData = {
  week: number
  date: string
  /** ISO date (YYYY-MM-DD) for DST-aware timezone conversion. */
  utcDateIso?: string
  utcHour: number
  memberTimes: MemberTime[]
  explanation: string
}

/** Per-week diagnostics for rotation explainability. */
export type WeekExplain = {
  week: number
  hardValidCandidatesCount: number
  totalCandidatesCount: number
  rejectedBy: { burdenDiff: number; consecutiveMax: number }
  failureReason: "NO_HARD_VALID" | "ALL_REJECTED" | null
  primaryCause?: "BURDEN_DIFF" | "CONSECUTIVE_MAX" | "MIXED_REJECTIONS"
  unavoidableMaxMemberId?: string
  /** True when rotation was feasible but no alternative avoided 60% max; we fell back. */
  rotationForced?: boolean
  /** True if more than 1 candidate shares the best composite score (within epsilon). */
  weekHasMultipleBestCandidates?: boolean
}

export type PlanMetrics = {
  maxBurden: number
  minBurden: number
  spread: number
  maxBurdenMemberIds: string[]
  /** Max consecutive weeks same member is max-burden. */
  consecutiveMax?: number
  /** Sum of all weekly penalty scores. */
  sumPenalty?: number
}

/** Fairness thresholds for shareable plans. */
export type FairnessThresholds = {
  spreadLimit: number
  consecutiveMaxLimit: number
  rotationThreshold: number
}

export type ForcedReason =
  | "INSUFFICIENT_CANDIDATES"
  | "NO_FEASIBLE_TIME"
  | "SPREAD_IMPOSSIBLE"
  | "CONSECUTIVE_MAX_IMPOSSIBLE"
  | "HARD_CONSTRAINTS_TOO_TIGHT"

export type ForcedPlanEvidence = {
  perWeekHardValidCount: number[]
  perWeekMaxMemberSets: string[][]
  /** Debug: actual feasible UTC hours per week (e.g. week1 = index 0). */
  perWeekFeasibleUtcHours?: number[][]
  bestAchievableMetrics: PlanMetrics
}

export type RotationExplain = {
  weeks: WeekExplain[]
  /** Mode used for the whole plan. */
  modeUsed: "FAIRNESS_GUARANTEE" | "STRICT" | "RELAXED" | "FALLBACK"
  /** True if the plan satisfies shareable fairness thresholds. */
  shareablePlanExists: boolean
  /** True if current plan is not lexicographically best. */
  betterPlanExists?: boolean
  bestPlanMetrics?: PlanMetrics
  currentPlanMetrics?: PlanMetrics
  /** Only when shareablePlanExists=false. */
  forcedReason?: ForcedReason
  evidence?: ForcedPlanEvidence
  /** Human-readable summary when forced. */
  forcedSummary?: string
}

/** Successful rotation result with explainability. */
export type RotationResult = {
  weeks: RotationWeekData[]
  modeUsed: "FAIRNESS_GUARANTEE" | "STRICT" | "RELAXED" | "FALLBACK"
  explain: RotationExplain
}

/** Result when no viable meeting time exists. Used for conflict diagnosis and suggestions. */
export type NoViableTimeResult = {
  status: "NO_VIABLE_TIME"
  reason: "HARD_BOUNDARIES_BLOCK_ALL_SLOTS"
  diagnosis: {
    blockers: Array<{
      memberId: string
      name: string
      timezone: string
      blockingType: "HARD_BOUNDARY" | "WORKING_HOURS"
      localBlockedSummary: string
      overlapImpact: number
    }>
    notes: string[]
  }
  suggestions: Array<{
    id: "RELAX_HARD_BOUNDARY_1H" | "ALLOW_OUTSIDE_WORKING_HOURS"
    title: string
    description: string
    impactSummary: string
    params?: { memberId?: string; memberName?: string; relaxRange?: { start: number; end: number } }
  }>
}

export const TIMEZONES = [
  { label: "UTC-10 (Hawaii)", value: -10 },
  { label: "UTC-9 (Alaska)", value: -9 },
  { label: "UTC-8 (Pacific)", value: -8 },
  { label: "UTC-7 (Mountain)", value: -7 },
  { label: "UTC-6 (Central)", value: -6 },
  { label: "UTC-5 (Eastern)", value: -5 },
  { label: "UTC-4 (Atlantic)", value: -4 },
  { label: "UTC-3 (Buenos Aires)", value: -3 },
  { label: "UTC-2", value: -2 },
  { label: "UTC-1 (Azores)", value: -1 },
  { label: "UTC+0 (London)", value: 0 },
  { label: "UTC+1 (Berlin)", value: 1 },
  { label: "UTC+2 (Cairo)", value: 2 },
  { label: "UTC+3 (Moscow)", value: 3 },
  { label: "UTC+4 (Dubai)", value: 4 },
  { label: "UTC+5 (Karachi)", value: 5 },
  { label: "UTC+5:30 (Mumbai)", value: 5.5 },
  { label: "UTC+6 (Dhaka)", value: 6 },
  { label: "UTC+7 (Bangkok)", value: 7 },
  { label: "UTC+8 (Singapore)", value: 8 },
  { label: "UTC+9 (Tokyo)", value: 9 },
  { label: "UTC+9:30 (Adelaide)", value: 9.5 },
  { label: "UTC+10 (Sydney)", value: 10 },
  { label: "UTC+11 (Noumea)", value: 11 },
  { label: "UTC+12 (Auckland)", value: 12 },
] as const

export const WORK_HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5
  return { label: formatHourLabel(h), value: h }
})

export const FULL_DAY_HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: formatHourLabel(i),
  value: i,
}))

/** Base time options: 6:00 AM–9:30 PM, every 30 min. Value = minutes from midnight (0–1439). */
export const BASE_TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = 6 + i * 0.5
  return { label: formatHourLabel(hour), value: Math.round(hour * 60) }
})

export const MAX_HARD_NO_HOURS = 6

export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const intH = Math.floor(h)
  const minutes = Math.round((h - intH) * 60)
  const minStr = minutes.toString().padStart(2, "0")
  if (intH === 0) return `12:${minStr} AM`
  if (intH === 12) return `12:${minStr} PM`
  return intH < 12 ? `${intH}:${minStr} AM` : `${intH - 12}:${minStr} PM`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === "") return "?"
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getHardNoEndOptions(
  start: number
): { label: string; value: number }[] {
  return Array.from({ length: MAX_HARD_NO_HOURS }, (_, i) => {
    const h = (start + i + 1) % 24
    return { label: formatHourLabel(h), value: h }
  })
}

/** Format IANA timezone for display. Use getTimezoneDisplayLabel(iana) directly. */
export function getAnchorLabel(iana: string): string {
  return getTimezoneDisplayLabel(iana)
}
