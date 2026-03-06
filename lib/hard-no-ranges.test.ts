import { describe, it, expect } from "vitest"
import { isComplementOfOverlapPattern } from "./hard-no-ranges"

describe("isComplementOfOverlapPattern", () => {
  it("detects corrupt pattern [0,9.25],[10,24]", () => {
    expect(
      isComplementOfOverlapPattern([
        { start: 0, end: 9.25 },
        { start: 10, end: 24 },
      ])
    ).toBe(true)
  })

  it("rejects legitimate [0,6],[22,24]", () => {
    expect(
      isComplementOfOverlapPattern([
        { start: 0, end: 6 },
        { start: 22, end: 24 },
      ])
    ).toBe(false)
  })

  it("rejects single range", () => {
    expect(isComplementOfOverlapPattern([{ start: 0, end: 9 }])).toBe(false)
  })

  it("rejects empty", () => {
    expect(isComplementOfOverlapPattern([])).toBe(false)
  })
})
