export type Discomfort = "comfortable" | "stretch" | "sacrifice"

export type HardNoRange = {
  start: number
  end: number
}

export type TeamMember = {
  id: string
  name: string
  utcOffset: number
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
  utcHour: number
  memberTimes: MemberTime[]
  explanation: string
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

export function getAnchorLabel(offset: number): string {
  const tz = TIMEZONES.find((t) => t.value === offset)
  if (!tz) return "UTC"
  const match = tz.label.match(/\((.+)\)/)
  return match ? match[1] : tz.label
}
