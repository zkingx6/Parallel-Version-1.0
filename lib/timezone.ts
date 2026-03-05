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

/** Full display label: "City (UTC±HH:MM)". */
export function getTimezoneDisplayLabel(iana: string): string {
  const dt = DateTime.now().setZone(iana)
  const city = getCityName(iana)
  const offsetLabel = formatOffsetLabel(dt.offset)
  return `${city} (${offsetLabel})`
}

