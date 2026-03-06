/**
 * hard_no_ranges validation.
 *
 * Contract:
 * - hard_no_ranges = user-defined ONLY (HARD constraint, absolute blocking)
 * - work_start_hour/work_end_hour = SOFT constraint (burden/penalty only, never blocking)
 *
 * Never derive hard_no_ranges from work window, overlap, or determinism seed.
 */
import type { HardNoRange } from "./types"

/** Detect "complement of overlap" corruption: [0,x],[y,24] with tiny gap (e.g. 9.25–10). */
export function isComplementOfOverlapPattern(ranges: HardNoRange[]): boolean {
  if (!Array.isArray(ranges) || ranges.length !== 2) return false
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const [first, second] = sorted
  if (
    first.start !== 0 ||
    second.end !== 24 ||
    first.end >= second.start
  )
    return false
  const gapHours = second.start - first.end
  return gapHours < 1.5
}
