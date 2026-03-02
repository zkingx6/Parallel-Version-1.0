import {
  TeamMember,
  MeetingConfig,
  RotationWeekData,
  MemberTime,
  Discomfort,
  formatHourLabel,
} from "./types"

// --- Time helpers ---

function toLocalHour(utcHour: number, utcOffset: number): number {
  return (((utcHour + utcOffset) % 24) + 24) % 24
}

function isWithinWorkingHours(
  localHour: number,
  workStart: number,
  workEnd: number
): boolean {
  if (workStart < workEnd) {
    return localHour >= workStart && localHour < workEnd
  }
  return localHour >= workStart || localHour < workEnd
}

function isInHardNo(utcHour: number, member: TeamMember): boolean {
  const localHour = toLocalHour(utcHour, member.utcOffset)
  for (const range of member.hardNoRanges) {
    if (range.start < range.end) {
      if (localHour >= range.start && localHour < range.end) return true
    } else {
      if (localHour >= range.start || localHour < range.end) return true
    }
  }
  return false
}

// --- Discomfort classification ---

function getDiscomfortLevel(
  localHour: number,
  workStart: number,
  workEnd: number
): Discomfort {
  if (isWithinWorkingHours(localHour, workStart, workEnd)) return "comfortable"
  if (localHour < 6 || localHour >= 23) return "sacrifice"
  return "stretch"
}

// --- Date utilities ---

function getNextDayOfWeek(dayOfWeek: number): Date {
  const now = new Date()
  const current = now.getDay()
  const daysUntil = ((dayOfWeek - current + 7) % 7) || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

// --- Candidate scoring ---

function findValidHours(team: TeamMember[]): number[] {
  const valid: number[] = []
  for (let h = 0; h < 24; h += 0.5) {
    if (!team.some((m) => isInHardNo(h, m))) valid.push(h)
  }
  return valid
}

const CONSEC_PENALTY = 6
const CAP_PENALTY = 50
const FAIRNESS_WEIGHT = 8

function scoreCandidate(
  h: number,
  team: TeamMember[],
  burden: Record<string, number>,
  rawCount: Record<string, number>,
  lastWeekUncomfortable: Set<string>,
  lastWeekHour: number | null,
  fairCap: number
): number {
  let totalCost = 0
  const prospectiveRaw: Record<string, number> = {}
  for (const m of team) prospectiveRaw[m.id] = rawCount[m.id]

  for (const member of team) {
    const localHour = toLocalHour(h, member.utcOffset)
    const discomfort = getDiscomfortLevel(
      localHour,
      member.workStartHour,
      member.workEndHour
    )

    const baseCost =
      discomfort === "sacrifice" ? 2 : discomfort === "stretch" ? 1 : 0

    if (baseCost > 0) {
      let memberCost = baseCost + burden[member.id]
      if (lastWeekUncomfortable.has(member.id)) memberCost += CONSEC_PENALTY
      if (rawCount[member.id] >= fairCap) memberCost += CAP_PENALTY
      totalCost += memberCost
      prospectiveRaw[member.id]++
    }
  }

  const values = Object.values(prospectiveRaw)
  const gap = Math.max(...values) - Math.min(...values)
  totalCost += gap * FAIRNESS_WEIGHT

  if (lastWeekHour !== null && h === lastWeekHour) totalCost += 0.5

  return totalCost
}

// --- Validation ---

export function canGenerateRotation(
  team: TeamMember[],
  _config: MeetingConfig
): { valid: boolean; reason?: string } {
  if (team.length < 2) {
    return { valid: false, reason: "Add at least 2 team members." }
  }

  const validHours = findValidHours(team)
  if (validHours.length === 0) {
    return {
      valid: false,
      reason:
        "Hard boundaries leave no viable meeting time. Adjust never ranges.",
    }
  }

  return { valid: true }
}

// --- Core rotation engine ---

export function generateRotation(
  team: TeamMember[],
  config: MeetingConfig
): RotationWeekData[] {
  if (team.length < 2) return []

  const validHours = findValidHours(team)
  if (validHours.length === 0) return []

  const startDate = getNextDayOfWeek(config.dayOfWeek)
  const weeks: RotationWeekData[] = []

  const burden: Record<string, number> = {}
  const rawCount: Record<string, number> = {}
  const lastWeekUncomfortable = new Set<string>()
  let lastWeekHour: number | null = null
  const fairCap = Math.ceil(config.rotationWeeks / team.length)

  for (const m of team) {
    burden[m.id] = 0
    rawCount[m.id] = 0
  }

  for (let i = 0; i < config.rotationWeeks; i++) {
    let bestHour = validHours[0]
    let bestScore = Infinity

    for (const h of validHours) {
      const score = scoreCandidate(
        h,
        team,
        burden,
        rawCount,
        lastWeekUncomfortable,
        lastWeekHour,
        fairCap
      )
      if (score < bestScore) {
        bestScore = score
        bestHour = h
      }
    }

    const weekDate = new Date(startDate)
    weekDate.setDate(weekDate.getDate() + i * 7)

    const memberTimes: MemberTime[] = team.map((member) => {
      const localHour = toLocalHour(bestHour, member.utcOffset)
      const discomfort = getDiscomfortLevel(
        localHour,
        member.workStartHour,
        member.workEndHour
      )
      return {
        memberId: member.id,
        localHour,
        localTime: formatHourLabel(localHour),
        discomfort,
      }
    })

    lastWeekUncomfortable.clear()
    lastWeekHour = bestHour
    for (const mt of memberTimes) {
      if (mt.discomfort === "stretch") {
        burden[mt.memberId] += 1
        rawCount[mt.memberId]++
        lastWeekUncomfortable.add(mt.memberId)
      } else if (mt.discomfort === "sacrifice") {
        burden[mt.memberId] += 2
        rawCount[mt.memberId]++
        lastWeekUncomfortable.add(mt.memberId)
      }
    }

    const stretchers = memberTimes
      .filter((m) => m.discomfort !== "comfortable")
      .map((m) => {
        const member = team.find((t) => t.id === m.memberId)!
        return {
          firstName: member.name.split(" ")[0],
          burden: burden[m.memberId],
        }
      })

    const protectedNames = memberTimes
      .filter((m) => m.discomfort === "comfortable")
      .filter((m) => burden[m.memberId] > 0)
      .map((m) => team.find((t) => t.id === m.memberId)!.name.split(" ")[0])

    let explanation: string
    if (stretchers.length === 0) {
      explanation = "Everyone meets within working hours this week."
    } else {
      explanation = buildExplanation(stretchers, protectedNames)
    }

    weeks.push({
      week: i + 1,
      date: formatDate(weekDate),
      utcHour: bestHour,
      memberTimes,
      explanation,
    })
  }

  return weeks
}

function buildExplanation(
  stretchers: { firstName: string; burden: number }[],
  protectedNames: string[]
): string {
  if (stretchers.length === 1) {
    const s = stretchers[0]
    if (protectedNames.length > 0) {
      return `${s.firstName} stretches this week — lowest accumulated burden. ${protectedNames[0]} is protected this cycle.`
    }
    return `${s.firstName} stretches this week. Lowest accumulated burden over the rotation.`
  }

  const names = stretchers.map((s) => s.firstName)
  const last = names.pop()!
  return `${names.join(", ")} and ${last} share the stretch. Burden balances over the cycle.`
}

// --- Summary helpers ---

export function getBurdenCounts(
  weeks: RotationWeekData[],
  team: TeamMember[]
): {
  memberId: string
  name: string
  count: number
  sacrificeCount: number
}[] {
  const data: Record<string, { count: number; sacrificeCount: number }> = {}
  for (const m of team) data[m.id] = { count: 0, sacrificeCount: 0 }

  for (const week of weeks) {
    for (const mt of week.memberTimes) {
      if (mt.discomfort === "stretch") {
        data[mt.memberId].count++
      } else if (mt.discomfort === "sacrifice") {
        data[mt.memberId].count++
        data[mt.memberId].sacrificeCount++
      }
    }
  }

  return team.map((m) => ({
    memberId: m.id,
    name: m.name,
    count: data[m.id].count,
    sacrificeCount: data[m.id].sacrificeCount,
  }))
}

export function hasConsecutiveStretch(
  weeks: RotationWeekData[],
  team: TeamMember[]
): boolean {
  for (const member of team) {
    let prev = false
    for (const week of weeks) {
      const mt = week.memberTimes.find((m) => m.memberId === member.id)
      const current = mt ? mt.discomfort !== "comfortable" : false
      if (current && prev) return true
      prev = current
    }
  }
  return false
}

// --- Share data ---

export type ShareData = {
  t: {
    n: string
    o: number
    s: number
    e: number
    hr?: [number, number][]
    ns?: number
    ne?: number
  }[]
  m: {
    d: number
    ah: number
    ao: number
    dur: number
    w: number
    h?: number
  }
}

export function encodeShareData(
  team: TeamMember[],
  config: MeetingConfig
): string {
  const data: ShareData = {
    t: team.map((m) => ({
      n: m.name,
      o: m.utcOffset,
      s: m.workStartHour,
      e: m.workEndHour,
      ...(m.hardNoRanges.length > 0
        ? { hr: m.hardNoRanges.map((r) => [r.start, r.end] as [number, number]) }
        : {}),
    })),
    m: {
      d: config.dayOfWeek,
      ah: config.anchorHour,
      ao: config.anchorOffset,
      dur: config.durationMinutes,
      w: config.rotationWeeks,
    },
  }
  return btoa(JSON.stringify(data))
}

export function decodeShareData(
  encoded: string
): { team: TeamMember[]; config: MeetingConfig } | null {
  try {
    const data: ShareData = JSON.parse(atob(encoded))
    const team: TeamMember[] = data.t.map((m, i) => {
      const parts = m.n.trim().split(/\s+/)
      const initials =
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (parts[0]?.[0] ?? "?").toUpperCase()

      let hardNoRanges: { start: number; end: number }[] = []
      if (m.hr) {
        hardNoRanges = m.hr.map(([s, e]) => ({ start: s, end: e }))
      } else if (m.ns !== undefined && m.ne !== undefined) {
        hardNoRanges = [{ start: m.ns, end: m.ne }]
      }

      return {
        id: `m-${i}`,
        name: m.n,
        utcOffset: m.o,
        workStartHour: m.s,
        workEndHour: m.e,
        hardNoRanges,
        initials,
      }
    })
    const config: MeetingConfig = {
      dayOfWeek: data.m.d,
      anchorHour: data.m.ah ?? data.m.h ?? 12,
      anchorOffset: data.m.ao ?? 0,
      durationMinutes: data.m.dur,
      rotationWeeks: data.m.w,
    }
    return { team, config }
  } catch {
    return null
  }
}
