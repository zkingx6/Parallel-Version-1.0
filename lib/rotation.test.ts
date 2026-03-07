import { describe, it, expect } from "vitest"
import {
  generateRotation,
  isRotationResult,
  getBurdenCounts,
  getBaseTimeStatus,
  alternatingPatternJitter,
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

  it("cross-timezone team with hard_no=[] generates plan (feasible window = 24h minus hardNo only)", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, []),
      makeMember("b", "Bob", "Europe/London", 9, 18, []),
      makeMember("c", "Carol", "Asia/Tokyo", 9, 18, []),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      baseTimeMinutes: undefined,
      rotationWeeks: 4,
    }
    const result = generateRotation(team, config)
    expect(isRotationResult(result)).toBe(true)
    if (!isRotationResult(result)) return
    expect(result.weeks.length).toBe(4)
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

  it("Anchor mode: fixed base time 6 AM outside working hours is used when no hard boundary hit", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, [{ start: 10, end: 11 }]),
      makeMember("b", "Bob", "America/New_York", 9, 18, [{ start: 12, end: 13 }]),
      makeMember("c", "Carol", "America/New_York", 9, 18, [{ start: 15, end: 16 }]),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      baseTimeMinutes: 360,
      rotationWeeks: 4,
      displayTimezone: "America/New_York",
      startDateIso: "2025-02-12", // Wed, EST: 6 AM EST = 6 AM local
    }
    const result = generateRotation(team, config)
    expect(isRotationResult(result)).toBe(true)
    if (!isRotationResult(result)) return
    const { weeks } = result
    expect(weeks.length).toBe(4)
    const week1 = weeks[0]
    expect(week1).toBeDefined()
    const aliceTime = week1!.memberTimes.find((m) => m.memberId === "a")
    expect(aliceTime).toBeDefined()
    expect(aliceTime!.localTime).toMatch(/6:00 AM|6:00/)
    const burdenData = getBurdenCounts(weeks, team)
    const totalBurden = burdenData.reduce((s, d) => s + d.count, 0)
    expect(totalBurden).toBeGreaterThan(0)
  })

  it("Anchor mode: fixed 10:30 AM used for all weeks when within all work hours, no rotation", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, []),
      makeMember("b", "Bob", "America/New_York", 9, 18, []),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      baseTimeMinutes: 10 * 60 + 30,
      anchorOffset: -5,
      displayTimezone: "America/New_York",
      startDateIso: "2025-02-05", // Wed, all 4 weeks in EST so 10:30 stays 10:30
      rotationWeeks: 4,
    }
    const result = generateRotation(team, config)
    expect(isRotationResult(result)).toBe(true)
    if (!isRotationResult(result)) return
    const { weeks, modeUsed } = result
    expect(modeUsed).toBe("FIXED_ANCHOR")
    expect(weeks.length).toBe(4)
    const localHours = weeks.flatMap((w) =>
      w.memberTimes.map((mt) => mt.localHour)
    )
    expect(localHours.every((h) => Math.abs(h - 10.5) < 0.01)).toBe(true)
    const localTimes = weeks.flatMap((w) =>
      w.memberTimes.map((mt) => mt.localTime)
    )
    expect(localTimes.every((t) => t.includes("10:30"))).toBe(true)
  })

  it("Anchor mode: 7pm allowed when hardNoRanges=[], workWindow 9-18 (outside work is soft)", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, []),
      makeMember("b", "Bob", "America/New_York", 9, 18, []),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      baseTimeMinutes: 19 * 60,
      anchorOffset: -5,
      displayTimezone: "America/New_York",
      startDateIso: "2025-03-05",
    }
    const status = getBaseTimeStatus(team, config)
    expect(status).not.toBeNull()
    expect(status!.blockedByHardNo).toBe(false)
    expect(status!.outsideWorkHoursCount).toBeGreaterThan(0)
  })

  it("Anchor mode: 7pm blocked when hardNoRanges includes [18,24]", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, [{ start: 18, end: 24 }]),
      makeMember("b", "Bob", "America/New_York", 9, 18, [{ start: 18, end: 24 }]),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      baseTimeMinutes: 19 * 60,
      anchorOffset: -5,
      displayTimezone: "America/New_York",
      startDateIso: "2025-03-05",
    }
    const status = getBaseTimeStatus(team, config)
    expect(status).not.toBeNull()
    expect(status!.blockedByHardNo).toBe(true)
  })

  it("alternatingPatternJitter: clean alternating pattern has lower jitter than jittered", () => {
    const clean = [
      { utcHour: 20.5 },
      { utcHour: 8.5 },
      { utcHour: 20.5 },
      { utcHour: 8.5 },
    ]
    const jittered = [
      { utcHour: 20.0 },
      { utcHour: 8.5 },
      { utcHour: 20.5 },
      { utcHour: 8.5 },
    ]
    expect(alternatingPatternJitter(clean)).toBe(0)
    expect(alternatingPatternJitter(jittered)).toBeGreaterThan(0)
    expect(alternatingPatternJitter(clean)).toBeLessThan(alternatingPatternJitter(jittered))
  })

  it("alternatingPatternJitter: beam produces deterministic plan with valid jitter metric", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", "America/New_York", 9, 18, [{ start: 0, end: 6 }]),
      makeMember("b", "Bob", "Europe/London", 9, 18, [{ start: 0, end: 6 }]),
    ]
    const config: MeetingConfig = {
      ...defaultConfig,
      baseTimeMinutes: undefined,
      rotationWeeks: 4,
      dayOfWeek: 2,
    }
    const r1 = generateRotation(team, config)
    const r2 = generateRotation(team, config)
    expect(isRotationResult(r1)).toBe(true)
    expect(isRotationResult(r2)).toBe(true)
    if (!isRotationResult(r1) || !isRotationResult(r2)) return
    expect(r1.weeks.map((w) => w.utcHour)).toEqual(r2.weeks.map((w) => w.utcHour))
    const jitter = alternatingPatternJitter(r1.weeks.map((w) => ({ utcHour: w.utcHour })))
    expect(typeof jitter).toBe("number")
    expect(jitter).toBeGreaterThanOrEqual(0)
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
