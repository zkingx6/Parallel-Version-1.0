/**
 * Schedule reorder utilities. UI-only: updates week labels and dates based on
 * new position. Does NOT recompute fairness, burden, or memberTimes.
 */
import type { RotationWeekData } from "./types"
import {
  getWeekStartForSchedule,
  formatScheduleDate,
} from "./timezone"

/**
 * Apply week number and date labels to reordered blocks based on position.
 * Each block keeps its utcHour and memberTimes. Only week, date, utcDateIso are updated.
 */
export function applyWeekLabelsToReordered(
  blocks: RotationWeekData[],
  dayOfWeek: number,
  startDateIso?: string | null
): RotationWeekData[] {
  const utcStart = getWeekStartForSchedule(dayOfWeek, startDateIso)
  return blocks.map((block, i) => {
    const utcDate = utcStart.plus({ weeks: i })
    return {
      ...block,
      week: i + 1,
      date: formatScheduleDate(utcDate),
      utcDateIso: utcDate.toISODate() ?? undefined,
    }
  })
}
