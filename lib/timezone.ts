/**
 * Timezone utilities for DST-aware display.
 * Uses IANA timezone strings; standardized list of 30 common global timezones.
 */
import { DateTime } from "luxon"
import { formatHourLabel } from "./types"

/** 30 most common global timezones (IANA). Used for all timezone selectors. */
export const STANDARD_TIMEZONES: readonly string[] = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Halifax",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Athens",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Manila",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const

/** Extract city name from IANA (e.g. "America/New_York" → "New York"). */
function getCityName(iana: string): string {
  const part = iana.split("/").pop() ?? iana
  return part.replace(/_/g, " ")
}

/** Format offset as UTC±HH:MM (DST-aware, uses minus sign − for negative). */
function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "−"
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const hh = h.toString().padStart(2, "0")
  const mm = m.toString().padStart(2, "0")
  return `UTC${sign}${hh}:${mm}`
}

/**
 * Get timezone options for dropdowns. DST-aware, sorted by offset ascending.
 * Returns { value: IANA, label: "City (UTC±HH:MM)" }.
 */
export function getTimezoneOptions(): Array<{ value: string; label: string }> {
  const now = DateTime.now()
  const withOffset = STANDARD_TIMEZONES.map((iana) => {
    const dt = now.setZone(iana)
    const offsetMinutes = dt.offset
    const city = getCityName(iana)
    const offsetLabel = formatOffsetLabel(offsetMinutes)
    return { value: iana, label: `${city} (${offsetLabel})`, offsetMinutes }
  })
  return withOffset
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
    .map(({ value, label }) => ({ value, label }))
}

/** Resolve to a valid standard timezone. Falls back to America/New_York if unknown. */
export function resolveToStandardTimezone(
  iana: string | null | undefined
): string {
  if (iana && STANDARD_TIMEZONES.includes(iana)) return iana
  return "America/New_York"
}

/**
 * Ensure display timezone is IANA only. Rejects fixed-offset zones and label strings.
 * Use this when reading display_timezone from DB or user input.
 * - "UTC-05:00", "Etc/GMT+5", "New York (UTC-05:00)" → normalized to IANA (America/New_York)
 * - "America/New_York" → passes through
 */
export function ensureDisplayTimezoneIana(
  value: string | null | undefined
): string {
  if (!value || typeof value !== "string") return "America/New_York"
  const trimmed = value.trim()
  if (!trimmed) return "America/New_York"
  if (STANDARD_TIMEZONES.includes(trimmed)) return trimmed
  if (
    trimmed.startsWith("UTC") ||
    trimmed.startsWith("Etc/") ||
    trimmed.includes("GMT") ||
    trimmed.includes("(UTC")
  ) {
    return "America/New_York"
  }
  return resolveToStandardTimezone(trimmed)
}

/** Canonicalize IANA if in STANDARD_TIMEZONES. Returns null if not (no fallback). */
export function tryResolveToStandardTimezone(
  iana: string | null | undefined
): string | null {
  if (iana && STANDARD_TIMEZONES.includes(iana)) return iana
  return null
}

/** Resolve display timezone. IANA only. Default America/New_York when null. */
export function getDisplayTimezone(
  displayTimezoneIana: string | null | undefined
): string {
  return resolveToStandardTimezone(displayTimezoneIana)
}

/** Resolve IANA zone for a member. */
export function getMemberTimezone(timezoneIana: string | null | undefined): string {
  if (timezoneIana) return timezoneIana
  return "UTC"
}

/**
 * Get offset in hours for a given date in an IANA zone. DST-aware.
 * Used for anchor mode: fixed local time across DST boundaries.
 */
export function getOffsetHoursForDate(
  utcDateIso: string,
  displayTimezone: string
): number {
  const dt = DateTime.fromISO(utcDateIso, { zone: "utc" }).setZone(displayTimezone)
  return dt.offset / 60
}

/**
 * Convert UTC (date + hour) to local hour in an IANA zone.
 * DST-aware: uses the actual date for correct offset.
 * Single helper for all UTC→local conversion.
 */
export function convertUtcToLocal(
  utcDateIso: string,
  utcHour: number,
  timezone: string
): number {
  const utcDate = DateTime.fromISO(utcDateIso, { zone: "utc" })
  const utcMeeting = utcDate.set({
    hour: Math.floor(utcHour),
    minute: Math.round((utcHour % 1) * 60),
    second: 0,
    millisecond: 0,
  })
  const local = utcMeeting.setZone(timezone)
  return local.hour + local.minute / 60
}

/**
 * Convert UTC (date + hour) to local time in an IANA zone.
 * DST-aware: uses the actual date for correct offset.
 */
export function utcToLocalInZone(
  utcDateIso: string,
  utcHour: number,
  zone: string
): { localHour: number; localTime: string; shortLabel: string } {
  const utcDate = DateTime.fromISO(utcDateIso, { zone: "utc" })
  const utcMeeting = utcDate.set({
    hour: Math.floor(utcHour),
    minute: Math.round((utcHour % 1) * 60),
    second: 0,
    millisecond: 0,
  })
  const local = utcMeeting.setZone(zone)
  const localHour = local.hour + local.minute / 60
  return {
    localHour,
    localTime: formatHourLabel(localHour),
    shortLabel: zone === "UTC" ? "UTC" : local.offsetNameShort ?? zone,
  }
}

/** Human-readable label for IANA zone (e.g. "America/New_York" → "New York"). */
export function getIanaShortLabel(zone: string): string {
  if (zone === "UTC") return "UTC"
  return getCityName(zone)
}

/**
 * Full display label: "City (UTC±HH:MM)".
 * Offset computed from DateTime.now(). Use for top "displayed in ..." label only.
 */
export function getTimezoneDisplayLabelNow(iana: string): string {
  const dt = DateTime.now().setZone(iana)
  const city = getCityName(iana)
  const offsetLabel = formatOffsetLabel(dt.offset)
  return `${city} (${offsetLabel})`
}

/**
 * Full display label: "City (UTC±HH:MM)" with offset computed at a specific
 * local time-of-day. Avoids DST boundary bugs (e.g. Mar 8 midnight = EST,
 * Mar 8 9:00 AM = EDT). Use noon by default to avoid midnight boundary.
 *
 * @param dateISO - YYYY-MM-DD or full ISO string
 * @param hourForOffset - local hour (0-23) for offset computation
 * @param minute - local minute (0-59)
 */
export function getOffsetLabelForLocalDateTime(
  iana: string,
  dateISO: string,
  hourForOffset = 12,
  minute = 0
): string {
  const dt = DateTime.fromISO(dateISO, { zone: iana }).set({
    hour: hourForOffset,
    minute,
    second: 0,
    millisecond: 0,
  })
  const city = getCityName(iana)
  const offsetLabel = formatOffsetLabel(dt.offset)
  return `${city} (${offsetLabel})`
}

/**
 * Full display label for a specific date. Offset at noon local (avoids midnight DST boundary).
 * @deprecated Prefer getOffsetLabelForLocalDateTime with meeting time for schedule headers.
 */
export function getTimezoneDisplayLabelForDate(
  iana: string,
  dateISO: string
): string {
  return getOffsetLabelForLocalDateTime(iana, dateISO, 12, 0)
}

/** @deprecated Use getTimezoneDisplayLabelNow for "displayed in" or getTimezoneDisplayLabelForDate for schedule. */
export function getTimezoneDisplayLabel(iana: string): string {
  return getTimezoneDisplayLabelNow(iana)
}

/**
 * Week 1 start date for schedule display. Used when reordering weeks.
 * Matches rotation engine logic: startDateIso if set, else next occurrence of dayOfWeek.
 */
function getNextMeetingDayUtc(dayOfWeek: number): DateTime {
  const now = DateTime.utc()
  const current = now.weekday
  let daysUntil = dayOfWeek - current
  if (daysUntil <= 0) daysUntil += 7
  return now.plus({ days: daysUntil }).startOf("day")
}

export function getWeekStartForSchedule(
  dayOfWeek: number,
  startDateIso?: string | null
): DateTime {
  if (
    startDateIso &&
    typeof startDateIso === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDateIso.trim())
  ) {
    const dt = DateTime.utc(
      parseInt(startDateIso.slice(0, 4), 10),
      parseInt(startDateIso.slice(5, 7), 10),
      parseInt(startDateIso.slice(8, 10), 10)
    )
    if (dt.isValid) return dt.startOf("day")
  }
  return getNextMeetingDayUtc(dayOfWeek)
}

/** Format date for schedule week label (e.g. "Thu, Mar 6"). */
export function formatScheduleDate(dt: DateTime): string {
  return dt.toLocaleString({
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

