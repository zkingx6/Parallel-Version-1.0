/**
 * Phase 1 Input Contract — validation + normalization only.
 * Does NOT modify rotation scoring, beam search, or invariants.
 */
import type { TeamMember, HardNoRange } from "../types"

/** Check if string is a valid IANA timezone using Intl. */
export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string" || !tz.trim()) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

export type ValidateTeamInputOk = {
  ok: true
  team: TeamMember[]
}

export type ValidateTeamInputError = {
  ok: false
  status: 422
  error: {
    code: "INPUT_CONTRACT_VIOLATION"
    message: string
    details: Array<{
      memberId: string
      name?: string
      field: string
      reason: string
      value?: unknown
    }>
  }
}

export type ValidateTeamInputResult = ValidateTeamInputOk | ValidateTeamInputError

/** Normalize hardNoRanges: [] | null | undefined | non-array => []. */
function normalizeHardNoRanges(v: unknown): HardNoRange[] {
  if (Array.isArray(v)) return v
  return []
}

function isNumberInRange(n: unknown): n is number {
  return typeof n === "number" && !Number.isNaN(n) && n >= 0 && n <= 24
}

/**
 * Validate and normalize team input before generateRotation.
 * - timezone: REQUIRED, must be valid IANA (no silent default)
 * - hardNoRanges: normalize null/undefined/non-array to []
 * - workStartHour, workEndHour: must be numbers 0-24
 * - workStartHour < workEndHour (cross-midnight NOT supported in Phase 1)
 */
export function validateTeamInput(team: TeamMember[]): ValidateTeamInputResult {
  const details: ValidateTeamInputError["error"]["details"] = []

  const normalizedTeam: TeamMember[] = team.map((m) => {
    const hardNoRanges = normalizeHardNoRanges(m.hardNoRanges)
    return { ...m, hardNoRanges }
  })

  for (const m of normalizedTeam) {
    // A) timezone required and valid IANA
    const tz = m.timezone
    if (tz == null || (typeof tz === "string" && !tz.trim())) {
      details.push({
        memberId: m.id,
        name: m.name,
        field: "timezone",
        reason: "Missing or empty timezone (IANA required)",
        value: tz,
      })
    } else if (!isValidIanaTimezone(tz)) {
      details.push({
        memberId: m.id,
        name: m.name,
        field: "timezone",
        reason: "Invalid IANA timezone",
        value: tz,
      })
    }

    // workStartHour and workEndHour must be numbers 0-24
    if (!isNumberInRange(m.workStartHour)) {
      details.push({
        memberId: m.id,
        name: m.name,
        field: "workStartHour",
        reason: "workStartHour must be a number between 0 and 24",
        value: m.workStartHour,
      })
    }
    if (!isNumberInRange(m.workEndHour)) {
      details.push({
        memberId: m.id,
        name: m.name,
        field: "workEndHour",
        reason: "workEndHour must be a number between 0 and 24",
        value: m.workEndHour,
      })
    }

    // workStartHour < workEndHour (cross-midnight NOT supported)
    if (
      isNumberInRange(m.workStartHour) &&
      isNumberInRange(m.workEndHour) &&
      m.workStartHour >= m.workEndHour
    ) {
      details.push({
        memberId: m.id,
        name: m.name,
        field: "workHours",
        reason:
          "workStartHour must be less than workEndHour (cross-midnight not supported)",
        value: { workStartHour: m.workStartHour, workEndHour: m.workEndHour },
      })
    }
  }

  if (details.length > 0) {
    return {
      ok: false,
      status: 422,
      error: {
        code: "INPUT_CONTRACT_VIOLATION",
        message: "Input contract violation: invalid or missing member data",
        details,
      },
    }
  }

  return { ok: true, team: normalizedTeam }
}
