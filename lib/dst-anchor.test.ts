/**
 * DST regression: fixed base time must use consistent anchor-offset rule.
 * When selected before DST (anchor_offset = -5), Week 1 on Mar 10 (EDT) must
 * shift all times by +1 hour in New York: 9 AM → 10 AM, 12 PM → 1 PM, 6 PM → 7 PM.
 */
import { describe, it, expect } from "vitest"
import { generateRotation, isRotationResult } from "./rotation"
import { utcToLocalInZone } from "./timezone"
import type { TeamMember, MeetingConfig } from "./types"
import { DEFAULT_FAIRNESS_THRESHOLDS } from "./types"

function makeMember(
  id: string,
  name: string,
  timezone: string,
  workStart = 8,
  workEnd = 22,
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

const displayTimezone = "America/New_York"
/** Anchor offset at selection time (EST, before DST). Mar 10 is EDT (-4). */
const anchorOffsetEst = -5

describe("DST anchor: fixed base time uses anchor offset consistently", () => {
  const team: TeamMember[] = [
    makeMember("a", "Alice", "America/New_York"),
    makeMember("b", "Bob", "America/New_York"),
  ]

  const baseConfig: MeetingConfig = {
    dayOfWeek: 2, // Tuesday
    anchorHour: 12,
    anchorOffset: anchorOffsetEst,
    durationMinutes: 60,
    rotationWeeks: 1,
    displayTimezone,
    startDateIso: "2025-03-10", // Tue Mar 10, already EDT
    fairnessThresholds: DEFAULT_FAIRNESS_THRESHOLDS,
  }

  const cases: { baseTimeMinutes: number; expectedLocalHour: number; label: string }[] = [
    { baseTimeMinutes: 9 * 60, expectedLocalHour: 10, label: "9:00 AM → 10:00 AM" },
    { baseTimeMinutes: 12 * 60, expectedLocalHour: 13, label: "12:00 PM → 1:00 PM" },
    { baseTimeMinutes: 18 * 60, expectedLocalHour: 19, label: "6:00 PM → 7:00 PM" },
  ]

  for (const { baseTimeMinutes, expectedLocalHour, label } of cases) {
    it(`${label} on Mar 10 (EDT) when anchor selected in EST`, () => {
      const config: MeetingConfig = {
        ...baseConfig,
        baseTimeMinutes,
      }
      const result = generateRotation(team, config)
      expect(isRotationResult(result)).toBe(true)
      if (!isRotationResult(result)) return

      const week1 = result.weeks[0]
      expect(week1).toBeDefined()
      expect(week1!.utcDateIso).toBe("2025-03-10")
      expect(week1!.utcHour).toBeDefined()

      const display = utcToLocalInZone(
        week1!.utcDateIso!,
        week1!.utcHour,
        displayTimezone
      )
      const actualHour = Math.floor(display.localHour)
      const actualMin = Math.round((display.localHour % 1) * 60)
      expect(actualHour).toBe(expectedLocalHour)
      expect(actualMin).toBe(0)
    })
  }
})
