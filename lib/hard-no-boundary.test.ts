/**
 * Regression tests for hardNo boundary semantics.
 * hardNoRanges use half-open intervals [start, end): start inclusive, end exclusive.
 */
import { describe, it, expect } from "vitest"
import {
  generateRotation,
  isRotationResult,
  getBaseTimeStatus,
  canGenerateRotation,
} from "./rotation"
import type { TeamMember, MeetingConfig } from "./types"
import { DEFAULT_FAIRNESS_THRESHOLDS } from "./types"

function makeMember(
  id: string,
  name: string,
  timezone: string,
  workStart = 9,
  workEnd = 18,
  hardNoRanges: { start: number; end: number }[] = []
): TeamMember {
  return {
    id,
    name,
    timezone,
    workStartHour: workStart,
    workEndHour: workEnd,
    hardNoRanges,
    initials: name.split(" ").map((n) => n[0]).join("").toUpperCase(),
  }
}

/** Use Feb 12 (EST) so anchor offset -5 matches local: 12 PM EST = 12 PM local. */
const baseConfig: MeetingConfig = {
  dayOfWeek: 3,
  anchorHour: 12,
  anchorOffset: -5,
  durationMinutes: 60,
  rotationWeeks: 4,
  baseTimeMinutes: 540,
  displayTimezone: "America/New_York",
  startDateIso: "2025-02-12",
  fairnessThresholds: DEFAULT_FAIRNESS_THRESHOLDS,
}

describe("hardNo boundary semantics [start, end)", () => {
  it("hardNo [12,13): candidateHour 12 is blocked, 13 is allowed", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, [
        { start: 12, end: 13 },
      ]),
    ]
    const at12 = getBaseTimeStatus(team, {
      ...baseConfig,
      baseTimeMinutes: 12 * 60,
    })
    const at13 = getBaseTimeStatus(team, {
      ...baseConfig,
      baseTimeMinutes: 13 * 60,
    })
    expect(at12).not.toBeNull()
    expect(at12!.blockedByHardNo).toBe(true)
    expect(at13).not.toBeNull()
    expect(at13!.blockedByHardNo).toBe(false)
  })

  it("hardNo [12,13): 12:30 blocked, 13:00 allowed", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, [
        { start: 12, end: 13 },
      ]),
    ]
    const at1230 = getBaseTimeStatus(team, {
      ...baseConfig,
      baseTimeMinutes: 12 * 60 + 30,
    })
    const at1300 = getBaseTimeStatus(team, {
      ...baseConfig,
      baseTimeMinutes: 13 * 60,
    })
    expect(at1230!.blockedByHardNo).toBe(true)
    expect(at1300!.blockedByHardNo).toBe(false)
  })

  it("integration: work 12-14, hardNo [12,13), duration 60 — 12:00 blocked, 13:00 allowed", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 12, 14, [
        { start: 12, end: 13 },
      ]),
      makeMember("b", "Bob", "America/New_York", 12, 14, [
        { start: 12, end: 13 },
      ]),
    ]
    const config: MeetingConfig = {
      ...baseConfig,
      durationMinutes: 60,
      rotationWeeks: 4,
      baseTimeMinutes: 12 * 60,
      displayTimezone: "America/New_York",
      startDateIso: "2025-02-12",
    }

    const status12 = getBaseTimeStatus(team, { ...config, baseTimeMinutes: 12 * 60 })
    const status13 = getBaseTimeStatus(team, { ...config, baseTimeMinutes: 13 * 60 })

    expect(status12).not.toBeNull()
    expect(status12!.blockedByHardNo).toBe(true)
    expect(status13).not.toBeNull()
    expect(status13!.blockedByHardNo).toBe(false)

    const result = generateRotation(team, {
      ...config,
      baseTimeMinutes: 13 * 60,
    })
    expect(isRotationResult(result)).toBe(true)
    if (!isRotationResult(result)) return
    const localTimes = result.weeks.flatMap((w) =>
      w.memberTimes.map((mt) => mt.localTime)
    )
    expect(localTimes.every((t) => t.includes("1:00 PM") || t.includes("13:00"))).toBe(true)

    const noBaseConfig = { ...config, baseTimeMinutes: undefined }
    const canGen = canGenerateRotation(team, noBaseConfig)
    expect(canGen.valid).toBe(true)
    const autoResult = generateRotation(team, noBaseConfig)
    expect(isRotationResult(autoResult)).toBe(true)
    if (!isRotationResult(autoResult)) return
    const week1Local = autoResult.weeks[0]?.memberTimes[0]?.localHour
    expect(week1Local).toBeDefined()
    expect(week1Local!).toBeGreaterThanOrEqual(13)
    expect(week1Local!).toBeLessThan(14)
  })
})
