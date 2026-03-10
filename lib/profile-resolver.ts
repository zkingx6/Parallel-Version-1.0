/**
 * Canonical profile resolution. User display name and avatar come from
 * auth user / profiles, NOT from member_submissions.
 *
 * member_submissions is a meeting snapshot (timezone, hours, boundaries).
 * Profile data (name, avatar) must be resolved via user_id → profiles/auth.
 */

import { createServiceSupabase } from "./supabase-server"
import { resolveOwnerAvatar } from "./avatar-resolver"
import { syncProfileFromAuth } from "./profile-sync"

export type ResolvedProfile = {
  fullName: string
  avatarUrl: string
  email?: string | null
  updatedAt?: string
}

/** Build ResolvedProfile from auth user (e.g. current user in layout/settings). */
export function authUserToProfile(user: {
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string } | null
  email?: string | null
  updated_at?: string
}): ResolvedProfile {
  const meta = user?.user_metadata
  return {
    fullName: (meta?.full_name || meta?.name || user?.email?.split("@")[0] || "").trim(),
    avatarUrl: meta?.avatar_url || meta?.picture || "",
    updatedAt: user?.updated_at,
  }
}

/**
 * Single resolver for identity display. Used by all owner/member/account/top-nav UI.
 * Precedence: profile (app-level) > auth metadata > email prefix / initials.
 */
export function resolveIdentity(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
  profile: ResolvedProfile | undefined
): {
  resolvedDisplayName: string
  resolvedEmail: string
  resolvedAvatarUrl: string
  initials: string
} {
  const authName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    ""
  const authAvatar = resolveOwnerAvatar(user)
  const resolvedDisplayName =
    (profile?.fullName?.trim() || authName).trim() || authName
  const resolvedEmail = user.email?.trim() || profile?.email?.trim() || ""
  const resolvedAvatarUrl = profile?.avatarUrl?.trim()
    ? `${profile.avatarUrl}?v=${profile.updatedAt ?? ""}`
    : authAvatar
  const initials =
    resolvedDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || ""
  return {
    resolvedDisplayName,
    resolvedEmail,
    resolvedAvatarUrl,
    initials,
  }
}

/**
 * Resolve display name and avatar for current user (layout, settings).
 * Delegates to resolveIdentity for consistent precedence.
 */
export function resolveCurrentUserDisplay(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
  profile: ResolvedProfile | undefined
): { userName: string; userAvatar: string } {
  const { resolvedDisplayName, resolvedAvatarUrl } = resolveIdentity(user, profile)
  return { userName: resolvedDisplayName, userAvatar: resolvedAvatarUrl }
}

/**
 * Get owner profile for display. Uses profiles table first (canonical source).
 * Fallback to auth metadata only when manager_id is missing or profile lookup fails.
 * Ensures avatar cache-bust uses profiles.updated_at, not auth.user.updated_at.
 */
export async function getOwnerProfileForMeeting(
  managerId: string | null | undefined,
  authFallback?: { user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string } | null; email?: string | null; updated_at?: string }
): Promise<ResolvedProfile | null> {
  if (!managerId) return authFallback ? authUserToProfile(authFallback) : null
  try {
    const map = await fetchProfilesForUserIds([managerId])
    const profile = map.get(managerId)
    if (profile) return profile
  } catch {
    /* fallback below */
  }
  return authFallback ? authUserToProfile(authFallback) : null
}

/**
 * Fetch profiles for user IDs. Tries profiles table first (by user_id); falls back to auth for missing.
 */
export async function fetchProfilesForUserIds(
  userIds: string[]
): Promise<Map<string, ResolvedProfile>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const supabase = createServiceSupabase()
  const map = new Map<string, ResolvedProfile>()

  try {
    const { data: rows } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, email, updated_at")
      .in("user_id", unique)

    for (const r of rows ?? []) {
      map.set(r.user_id, {
        fullName: r.full_name ?? "",
        avatarUrl: r.avatar_url ?? "",
        email: r.email ?? null,
        updatedAt: r.updated_at,
      })
    }
  } catch {
    /* profiles table may not exist yet */
  }

  const missing = unique.filter((id) => !map.has(id))
  if (missing.length > 0) {
    const authMap = await fetchAuthProfilesForUserIds(missing)
    for (const [id, p] of authMap) {
      map.set(id, p)
    }
  }
  return map
}

/**
 * Ensure profile exists and is synced from auth. Calls syncProfileFromAuth.
 * Safe to call on every authenticated layout load (owner and member).
 */
export async function ensureProfileForUser(
  supabase: Awaited<ReturnType<typeof import("./supabase-server").createServerSupabase>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }
): Promise<void> {
  await syncProfileFromAuth(supabase, user)
}

/**
 * Fetch auth user metadata for user IDs (when profiles table is empty or missing).
 * Used as fallback when profiles don't exist yet.
 */
export async function fetchAuthProfilesForUserIds(
  userIds: string[]
): Promise<Map<string, ResolvedProfile>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const supabase = createServiceSupabase()
  const map = new Map<string, ResolvedProfile>()

  for (const uid of unique) {
    const { data } = await supabase.auth.admin.getUserById(uid)
    if (data?.user) {
      const u = data.user
      const meta = u.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string } | undefined
      const fullName = meta?.full_name ?? meta?.name ?? u.email?.split("@")[0] ?? ""
      const avatarUrl = meta?.avatar_url ?? meta?.picture ?? ""
      map.set(uid, {
        fullName,
        avatarUrl,
        email: u.email ?? null,
        updatedAt: u.updated_at,
      })
    }
  }
  return map
}

/** Shared identity display contract. All UI surfaces must use this shape. */
export type ResolvedIdentityDisplay = {
  name: string
  avatarUrl: string
  initials: string
}

function computeInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  )
}

/**
 * Resolve profile for display. Single source for all member/owner identity rendering.
 * Precedence: profile (synced from auth) > member_submissions.
 * Profile.avatarUrl takes precedence; member.avatar_url === null only applies when profile has no avatar.
 */
export function resolveDisplayProfile(
  profile: ResolvedProfile | null,
  memberFallback: { name?: string | null; avatar_url?: string | null; updated_at?: string }
): ResolvedIdentityDisplay {
  const name = (profile?.fullName || memberFallback.name || "").trim() || "?"
  const rawUrl =
    (profile?.avatarUrl && String(profile.avatarUrl).trim()) ||
    (memberFallback.avatar_url && String(memberFallback.avatar_url).trim()) ||
    ""
  const updatedAt =
    (profile?.avatarUrl ? profile.updatedAt : null) ??
    (memberFallback.avatar_url != null ? memberFallback.updated_at : null) ??
    memberFallback.updated_at
  const avatarUrl = rawUrl ? `${rawUrl}?v=${updatedAt ?? ""}` : ""
  return {
    name,
    avatarUrl,
    initials: computeInitials(name),
  }
}

export type MemberWithUserId = {
  id: string
  name: string
  avatar_url?: string | null
  updated_at?: string
  user_id?: string | null
  is_owner_participant?: boolean
  [key: string]: unknown
}

/**
 * Resolve display data for a list of members. Fetches profiles for user_ids,
 * merges with member fallback. Returns map of memberId -> ResolvedIdentityDisplay.
 * All team/member/schedule UI must use this; no direct raw field rendering.
 */
export async function resolveMembersDisplay(
  members: MemberWithUserId[],
  ownerAuthProfile?: ResolvedProfile | null
): Promise<Map<string, ResolvedIdentityDisplay>> {
  const userIds = members
    .map((m) => m.user_id)
    .filter((id): id is string => !!id)
  const profiles = await fetchProfilesForUserIds(userIds)
  const userIdToProfile = profiles

  const result = new Map<string, ResolvedIdentityDisplay>()
  for (const m of members) {
    const profile =
      m.is_owner_participant && ownerAuthProfile
        ? ownerAuthProfile
        : m.user_id
          ? userIdToProfile.get(m.user_id) ?? null
          : null
    const resolved = resolveDisplayProfile(profile, m)
    result.set(m.id, resolved)

    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[resolveMembersDisplay]", {
        id: m.id,
        user_id: m.user_id ?? null,
        is_owner_participant: m.is_owner_participant ?? false,
        resolved: { name: resolved.name, avatarUrl: resolved.avatarUrl ? `${resolved.avatarUrl.slice(0, 60)}...` : "(empty)" },
      })
    }
  }
  return result
}
