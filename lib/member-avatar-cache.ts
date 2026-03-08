/**
 * Client-side cache for member avatar/name to avoid "?" flash during route transitions.
 * When navigating between member-dashboard pages, we preserve the last known member
 * so the navbar avatar stays stable until fresh data loads.
 */

type CachedMember = {
  name: string
  avatar_url?: string | null
  updated_at?: string
}

let cache: { token: string; memberId: string; member: CachedMember } | null = null

export function getCachedMember(
  token: string,
  memberId: string
): CachedMember | null {
  if (!token || !memberId) return null
  if (cache && cache.token === token && cache.memberId === memberId) {
    return cache.member
  }
  return null
}

export function setCachedMember(
  token: string,
  memberId: string,
  member: CachedMember
): void {
  if (!token || !memberId) return
  cache = { token, memberId, member }
}
