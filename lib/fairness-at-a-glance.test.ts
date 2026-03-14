import { describe, it, expect } from "vitest"
import {
  analyzePlan,
  buildFairnessAtGlance,
  getFairnessAtAGlanceBullets,
} from "./fairness-at-a-glance"
import type { RotationWeekData } from "./types"

/** Mock burden entry for testing. */
function makeBurden(memberId: string, name: string, count: number) {
  return { memberId, name, count }
}

/** Mock week with memberTimes (scores used for max-burden member detection). */
function makeWeek(
  week: number,
  utcHour: number,
  memberScores: { memberId: string; score: number }[]
): RotationWeekData {
  return {
    week,
    date: `Week ${week}`,
    utcDateIso: "2026-03-17",
    utcHour,
    memberTimes: memberScores.map((m) => ({
      memberId: m.memberId,
      localHour: 12,
      localTime: "12:00 PM",
      discomfort: m.score > 0 ? "stretch" : "comfortable",
      score: m.score,
    })),
    explanation: "",
  }
}

describe("Fairness at a glance — rotation phrase safeguard", () => {
  it("must NOT output 'Inconvenience rotates across the team' when burden is heavily skewed (0/6/7)", () => {
    const team = [
      { id: "parker", name: "Parker LA", timezone: "America/Los_Angeles" },
      { id: "skyler", name: "Skyler Sydney", timezone: "Australia/Sydney" },
      { id: "hayden", name: "Hayden NY", timezone: "America/New_York" },
    ]
    const burdenData = [
      makeBurden("parker", "Parker LA", 0),
      makeBurden("skyler", "Skyler Sydney", 6),
      makeBurden("hayden", "Hayden NY", 7),
    ]
    const weeks: RotationWeekData[] = [
      makeWeek(1, 21.5, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(2, 23, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(3, 21, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(4, 23, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(5, 22, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(6, 22.5, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(7, 22, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
      makeWeek(8, 22.5, [
        { memberId: "parker", score: 0 },
        { memberId: "skyler", score: 1 },
        { memberId: "hayden", score: 2 },
      ]),
    ]
    const analysis = analyzePlan({
      weeks,
      team,
      burdenData,
      explain: {
        weeks: Array(8).fill({ hardValidCandidatesCount: 6 }),
        evidence: { perWeekHardValidCount: [8, 8, 8, 6, 6, 6, 6, 6] },
      },
      modeUsed: "FALLBACK",
      shareablePlanExists: false,
      forcedReason: "BEAM_EXHAUSTED",
    })
    const bullets = buildFairnessAtGlance(analysis)
    const hasRotationPhrase = bullets.some(
      (b) => b === "Inconvenience rotates across the team"
    )
    expect(hasRotationPhrase).toBe(false)
    expect(bullets.some((b) => b.includes("limited") || b.includes("narrow"))).toBe(true)
  })

  it("getFairnessAtAGlanceBullets with forcedReason passes through to analysis", () => {
    const bullets = getFairnessAtAGlanceBullets({
      weeks: [],
      team: [],
      burdenData: [
        makeBurden("a", "A", 0),
        makeBurden("b", "B", 6),
        makeBurden("c", "C", 7),
      ],
      spread: 7,
      modeUsed: "FALLBACK",
      shareablePlanExists: false,
      forcedReason: "BEAM_EXHAUSTED",
    })
    expect(bullets.some((b) => b === "Inconvenience rotates across the team")).toBe(false)
  })
})
