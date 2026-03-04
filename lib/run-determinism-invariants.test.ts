import { describe, it, expect } from "vitest"
import {
  validateResultInvariants,
  validateMaxBurdenConsistency,
} from "./run-determinism-invariants"
import { encodeShareData, decodeShareData } from "./rotation"
import type { TeamMember, RotationWeekData, MeetingConfig } from "./types"

function makeMember(
  id: string,
  name: string,
  workStart = 9,
  workEnd = 18,
  hardNoRanges: { start: number; end: number }[] = []
): TeamMember {
  return {
    id,
    name,
    timezone: "America/New_York",
    workStartHour: workStart,
    workEndHour: workEnd,
    hardNoRanges,
    initials: name[0],
  }
}

const config: MeetingConfig = {
  dayOfWeek: 3,
  anchorHour: 12,
  anchorOffset: -5,
  durationMinutes: 60,
  rotationWeeks: 4,
}

describe("run-determinism-invariants", () => {
  it("passes when meeting fits work window and avoids hardNo", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", 9, 18, [{ start: 12, end: 13 }]),
      makeMember("b", "Bob", 9, 18, []),
    ]
    const weeks: RotationWeekData[] = [
      {
        week: 1,
        date: "Wed, Mar 5",
        utcDateIso: "2025-03-05",
        utcHour: 14,
        memberTimes: [
          { memberId: "a", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 0 },
          { memberId: "b", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 0 },
        ],
        explanation: "",
      },
    ]
    const violations = validateResultInvariants(weeks, team, config, 0)
    expect(violations).toHaveLength(0)
  })

  it("fails when meeting overlaps hardNo", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", 9, 18, [{ start: 9, end: 10 }]),
    ]
    const weeks: RotationWeekData[] = [
      {
        week: 1,
        date: "Wed",
        utcHour: 14,
        memberTimes: [
          { memberId: "a", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 0 },
        ],
        explanation: "",
      },
    ]
    const violations = validateResultInvariants(weeks, team, config, 0)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some((v) => v.reason.includes("hardNo"))).toBe(true)
  })

  it("fails when meeting end is outside work window", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice", 9, 10, []),
    ]
    const weeks: RotationWeekData[] = [
      {
        week: 1,
        date: "Wed",
        utcHour: 14,
        memberTimes: [
          { memberId: "a", localHour: 9.5, localTime: "9:30 AM", discomfort: "comfortable", score: 0 },
        ],
        explanation: "",
      },
    ]
    const violations = validateResultInvariants(weeks, team, config, 0)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some((v) => v.reason.includes("outside work window"))).toBe(true)
  })

  it("validateMaxBurdenConsistency passes when metrics match", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice"),
      makeMember("b", "Bob"),
    ]
    const weeks: RotationWeekData[] = [
      {
        week: 1,
        date: "Wed",
        utcHour: 14,
        memberTimes: [
          { memberId: "a", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 1 },
          { memberId: "b", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 0 },
        ],
        explanation: "",
      },
    ]
    const violations = validateMaxBurdenConsistency(
      weeks,
      team,
      { maxBurden: 1, maxBurdenMemberIds: ["a"] },
      0
    )
    expect(violations).toHaveLength(0)
  })

  it("validateMaxBurdenConsistency fails when maxBurden mismatches", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice"),
      makeMember("b", "Bob"),
    ]
    const weeks: RotationWeekData[] = [
      {
        week: 1,
        date: "Wed",
        utcHour: 14,
        memberTimes: [
          { memberId: "a", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 2 },
          { memberId: "b", localHour: 9, localTime: "9:00 AM", discomfort: "comfortable", score: 0 },
        ],
        explanation: "",
      },
    ]
    const violations = validateMaxBurdenConsistency(
      weeks,
      team,
      { maxBurden: 1, maxBurdenMemberIds: ["a"] },
      0
    )
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some((v) => v.reason.includes("MaxBurden mismatch"))).toBe(true)
  })

  it("share encode/decode preserves displayTimezone (IANA only)", () => {
    const team: TeamMember[] = [
      makeMember("a", "Alice"),
      makeMember("b", "Bob"),
    ]
    const shareConfig: MeetingConfig = {
      dayOfWeek: 3,
      anchorHour: 12,
      anchorOffset: -5,
      durationMinutes: 60,
      rotationWeeks: 4,
      displayTimezone: "Europe/London",
    }
    const encoded = encodeShareData(team, shareConfig, "Europe/London")
    const decoded = decodeShareData(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.config.displayTimezone).toBe("Europe/London")
    expect(decoded!.team.every((m) => typeof m.timezone === "string" && m.timezone.includes("/"))).toBe(true)
  })
})
