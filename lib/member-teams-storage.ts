const STORAGE_KEY = "parallel_member_teams"

export function getStoredMemberTeams(): { token: string; memberId: string }[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(
          (t: unknown) =>
            t &&
            typeof t === "object" &&
            typeof (t as { token?: unknown }).token === "string" &&
            typeof (t as { memberId?: unknown }).memberId === "string"
        )
      : []
  } catch {
    return []
  }
}

export function addStoredMemberTeam(token: string, memberId: string) {
  const teams = getStoredMemberTeams()
  if (teams.some((t) => t.token === token && t.memberId === memberId)) return
  teams.push({ token, memberId })
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
  }
}
