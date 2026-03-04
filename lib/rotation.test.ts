import { describe, it, expect } from "vitest"
import {
  generateRotation,
  isRotationResult,
  getBurdenCounts,
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

const defaultConfig: MeetingConfig = {
  dayOfWeek: 3,
  anchorHour: 12,
  anchorOffset: -5,
  durationMinutes: 60,
  rotationWeeks: 8,
  baseTimeMinutes: 540,
  fairnessThresholds: DEFAULT_FAIRNESS_THRESHOLDS,
}

describe("Fairness Guarantee", () => {
  it("when a shareable plan exists, chosen plan spread <= spreadLimit and consecutiveMax <= consecutiveMaxLimit", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, []),
      makeMember("b", "Bob", "Europe/London", 9, 18, []),
      makeMember("c", "Carol", "Africa/Cairo", 9, 18, []),
    ]
    const result = generateRotation(team, defaultConfig)
    expect(isRotationResult(result)).toBe(true)
    if (!isRotationResult(result)) return
    const { weeks, explain } = result
    expect(weeks.length).toBe(8)
    if (explain.shareablePlanExists) {
      const m = explain.currentPlanMetrics!
      expect(m.spread).toBeLessThanOrEqual(DEFAULT_FAIRNESS_THRESHOLDS.spreadLimit)
      expect(m.consecutiveMax ?? 0).toBeLessThanOrEqual(
        DEFAULT_FAIRNESS_THRESHOLDS.consecutiveMaxLimit
      )
    }
  })

  it("beam search finds shareable alternative when greedy would repeat same max member", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, [{ start: 0, end: 8 }]),
      makeMember("b", "Bob", "Europe/London", 9, 18, []),
      makeMember("c", "Carol", "Africa/Cairo", 9, 18, [{ start: 18, end: 24 }]),
    ]
    const result = generateRotation(team, defaultConfig)
    expect(isRotationResult(result)).toBe(true)
    if (!isRotationResult(result)) return
    const { weeks, explain } = result
    expect(weeks.length).toBe(8)
    const burdenData = getBurdenCounts(weeks, team)
    const maxBurden = Math.max(...burdenData.map((d) => d.count))
    const minBurden = Math.min(...burdenData.map((d) => d.count))
    const spread = maxBurden - minBurden
    expect(spread).toBeLessThanOrEqual(DEFAULT_FAIRNESS_THRESHOLDS.spreadLimit)
  })

  it("when NO shareable plan exists: returns forced plan with shareablePlanExists=false, forcedReason and evidence", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 12, [{ start: 12, end: 24 }]),
      makeMember("b", "Bob", "Europe/London", 9, 12, [{ start: 12, end: 24 }]),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      rotationWeeks: 4,
      fairnessThresholds: {
        spreadLimit: 0,
        consecutiveMaxLimit: 0,
        rotationThreshold: 0.6,
      },
    }
    const result = generateRotation(team, config)
    if (isRotationResult(result)) {
      expect(result.explain.shareablePlanExists).toBe(false)
      expect(result.explain.forcedReason).toBeDefined()
      expect(result.explain.evidence).toBeDefined()
      expect(result.explain.evidence!.perWeekHardValidCount).toBeDefined()
      expect(result.explain.evidence!.bestAchievableMetrics).toBeDefined()
      expect(result.explain.forcedSummary).toBeDefined()
    }
  })
})
