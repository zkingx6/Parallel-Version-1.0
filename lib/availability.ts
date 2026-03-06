/**
 * Availability templates DB helper.
 * Manages default weekly availability for users. Does NOT touch member_submissions or rotation.
 */

export type TimeRange = { start: string; end: string }

export type WeeklyHours = {
  sun: TimeRange[]
  mon: TimeRange[]
  tue: TimeRange[]
  wed: TimeRange[]
  thu: TimeRange[]
  fri: TimeRange[]
  sat: TimeRange[]
}

export type WeeklyHardNo = WeeklyHours

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

export const DEFAULT_WEEKLY_HARD_NO: WeeklyHardNo = {
  sun: [],
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
}

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  sun: [],
  mon: [{ start: "09:00", end: "18:00" }],
  tue: [{ start: "09:00", end: "18:00" }],
  wed: [{ start: "09:00", end: "18:00" }],
  thu: [{ start: "09:00", end: "18:00" }],
  fri: [{ start: "09:00", end: "18:00" }],
  sat: [],
}

export type AvailabilityTemplate = {
  id: string
  user_id: string
  name: string
  is_default: boolean
  timezone: string
  weekly_hours: WeeklyHours
  weekly_hard_no: WeeklyHardNo
  created_at: string
  updated_at: string
}

function parseTimeRanges(raw: unknown, fallback: WeeklyHours | WeeklyHardNo): WeeklyHours | WeeklyHardNo {
  if (!raw || typeof raw !== "object") return fallback
  const obj = raw as Record<string, unknown>
  const result = { ...fallback }
  for (const key of DAY_KEYS) {
    const arr = obj[key]
    if (Array.isArray(arr)) {
      ;(result as Record<string, TimeRange[]>)[key] = arr
        .filter(
          (r): r is TimeRange =>
            r && typeof r === "object" && typeof (r as { start?: unknown }).start === "string" && typeof (r as { end?: unknown }).end === "string"
        )
        .map((r) => ({ start: r.start, end: r.end }))
    }
  }
  return result
}

function parseWeeklyHours(raw: unknown): WeeklyHours {
  return parseTimeRanges(raw, DEFAULT_WEEKLY_HOURS) as WeeklyHours
}

function parseWeeklyHardNo(raw: unknown): WeeklyHardNo {
  return parseTimeRanges(raw, DEFAULT_WEEKLY_HARD_NO) as WeeklyHardNo
}

import type { createServerSupabase } from "./supabase-server"
type SupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>

export async function getDefaultTemplate(
  supabase: SupabaseClient
): Promise<AvailabilityTemplate | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("availability_templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle()

  if (error || !data) return null
  return {
    ...data,
    weekly_hours: parseWeeklyHours(data.weekly_hours),
    weekly_hard_no: parseWeeklyHardNo((data as { weekly_hard_no?: unknown }).weekly_hard_no),
  } as AvailabilityTemplate
}

export async function ensureDefaultTemplate(
  supabase: SupabaseClient
): Promise<AvailabilityTemplate> {
  const existing = await getDefaultTemplate(supabase)
  if (existing) return existing

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("availability_templates")
    .insert({
      user_id: user.id,
      name: "Default",
      is_default: true,
      timezone: "America/New_York",
      weekly_hours: DEFAULT_WEEKLY_HOURS,
      weekly_hard_no: DEFAULT_WEEKLY_HARD_NO,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return {
    ...data,
    weekly_hours: parseWeeklyHours(data.weekly_hours),
    weekly_hard_no: parseWeeklyHardNo((data as { weekly_hard_no?: unknown }).weekly_hard_no),
  } as AvailabilityTemplate
}

export async function saveDefaultTemplate(
  supabase: SupabaseClient,
  payload: { timezone: string; weekly_hours: WeeklyHours; weekly_hard_no: WeeklyHardNo }
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("availability_templates")
    .update({
      timezone: payload.timezone,
      weekly_hours: payload.weekly_hours,
      weekly_hard_no: payload.weekly_hard_no,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("is_default", true)

  if (error) return { error: error.message }
  return {}
}

export function getWorkingDaysSummary(weeklyHours: WeeklyHours): string {
  const enabled = DAY_KEYS.filter((k) => weeklyHours[k].length > 0)
  if (enabled.length === 0) return "No days"
  if (enabled.length === 7) return "Every day"
  const labels: Record<string, string> = {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  }
  return enabled.map((k) => labels[k]).join(", ")
}

export function getTimeRangesSummary(weeklyHours: WeeklyHours): string {
  const ranges = new Set<string>()
  for (const key of DAY_KEYS) {
    for (const r of weeklyHours[key]) {
      ranges.add(`${r.start}–${r.end}`)
    }
  }
  const arr = Array.from(ranges)
  if (arr.length === 0) return "No hours"
  return arr.slice(0, 3).join(", ") + (arr.length > 3 ? "…" : "")
}

/** Consolidated hard-no range (hours 0–23). Matches member_submissions.hard_no_ranges shape. */
export type ConsolidatedHardNoRange = { start: number; end: number }

export type AppliesTo = "every_day" | "weekdays"

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri"] as const

function hhmmToHour(s: string): number {
  const [h] = s.split(":").map(Number)
  return isNaN(h) ? 0 : Math.max(0, Math.min(23, h))
}

function hourToHHmm(h: number): string {
  return `${Math.max(0, Math.min(23, h)).toString().padStart(2, "0")}:00`
}

function rangeKey(r: { start: string; end: string }): string {
  return `${r.start}–${r.end}`
}

/** Derive consolidated ranges + appliesTo from weekly_hard_no. Used when loading for editor. */
export function consolidatedRangesFromWeeklyHardNo(
  wh: WeeklyHardNo
): { ranges: ConsolidatedHardNoRange[]; appliesTo: AppliesTo } {
  let hasWeekdays = false
  let hasWeekends = false
  for (const key of WEEKDAY_KEYS) {
    if (wh[key].length > 0) hasWeekdays = true
  }
  for (const key of ["sun", "sat"] as const) {
    if (wh[key].length > 0) hasWeekends = true
  }
  const appliesTo: AppliesTo =
    hasWeekdays && !hasWeekends ? "weekdays" : "every_day"
  const sourceKeys =
    appliesTo === "weekdays" ? WEEKDAY_KEYS : (DAY_KEYS as readonly string[])
  const seen = new Set<string>()
  const ranges: ConsolidatedHardNoRange[] = []
  for (const key of sourceKeys) {
    for (const r of wh[key as keyof WeeklyHardNo]) {
      const k = rangeKey(r)
      if (seen.has(k)) continue
      seen.add(k)
      ranges.push({ start: hhmmToHour(r.start), end: hhmmToHour(r.end) })
    }
  }
  ranges.sort((a, b) => a.start - b.start || a.end - b.end)
  return { ranges, appliesTo }
}

/** Build weekly_hard_no from consolidated ranges + appliesTo. Used when saving. */
export function weeklyHardNoFromConsolidated(
  ranges: ConsolidatedHardNoRange[],
  appliesTo: AppliesTo
): WeeklyHardNo {
  const valid = ranges
    .filter((r) => r.start < r.end && r.start >= 0 && r.end <= 24)
    .map((r) => ({
      start: hourToHHmm(r.start),
      end: hourToHHmm(r.end),
    }))
  const targetDays =
    appliesTo === "weekdays" ? WEEKDAY_KEYS : (DAY_KEYS as readonly string[])
  const result: WeeklyHardNo = { ...DEFAULT_WEEKLY_HARD_NO }
  for (const key of targetDays) {
    result[key as keyof WeeklyHardNo] = [...valid]
  }
  return result
}

export function getHardNoSummary(weeklyHardNo: WeeklyHardNo): string {
  const { ranges, appliesTo } = consolidatedRangesFromWeeklyHardNo(
    weeklyHardNo
  )
  if (ranges.length === 0) return "None"
  const fmt = (r: ConsolidatedHardNoRange) =>
    `${hourToHHmm(r.start)}–${hourToHHmm(r.end)}`
  const rangeStr = ranges.slice(0, 3).map(fmt).join(", ")
  const suffix = ranges.length > 3 ? "…" : ""
  const applies =
    appliesTo === "weekdays" ? " (Weekdays)" : " (Every day)"
  return rangeStr + suffix + applies
}
