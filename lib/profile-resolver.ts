/**
 * Canonical profile resolution. User display name and avatar come from
 * auth user / profiles, NOT from member_submissions.
 *
 * member_submissions is a meeting snapshot (timezone, hours, boundaries).
 * Profile data (name, avatar) must be resolved via user_id → profiles/auth.
 */

import { createServerSupabase, createServiceSupabase } from "./supabase-server"
import { resolveOwnerAvatar } from "./avatar-resolver"

export type ResolvedProfile = {
  fullName: string
  avatarUrl: string
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
 * Resolve display name and avatar for current user (layout, settings).
 * Profiles table is canonical; falls back to auth metadata only when profile fields are empty.
 */
export function resolveCurrentUserDisplay(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
  profile: ResolvedProfile | undefined
): { userName: string; userAvatar: string } {
  const authName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    ""
  const authAvatar = resolveOwnerAvatar(user)
  const userName = (profile?.fullName?.trim() || authName).trim() || authName
  const userAvatar =
    profile?.avatarUrl?.trim()
      ? `${profile.avatarUrl}?v=${profile.updatedAt ?? ""}`
      : authAvatar
  return { userName, userAvatar }
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
      .select("user_id, full_name, avatar_url, updated_at")
      .in("user_id", unique)

    for (const r of rows ?? []) {
      map.set(r.user_id, {
        fullName: r.full_name ?? "",
        avatarUrl: r.avatar_url ?? "",
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
 * Bootstrap: create profile row if it does not exist (first sign-in).
 * Initializes email from auth user, full_name/avatar_url from auth metadata as fallback.
 * Uses user's supabase client so RLS allows insert.
 */
export async function ensureProfileForUser(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) return

    const meta = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string } | undefined
    const fullName = (meta?.full_name || meta?.name || user.email?.split("@")[0] || "").trim()
    const avatarUrl = meta?.avatar_url || meta?.picture || ""

    await supabase.from("profiles").insert({
      user_id: user.id,
      email: user.email ?? null,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
    })
  } catch {
    /* profiles table may not exist yet */
  }
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
        updatedAt: u.updated_at,
      })
    }
  }
  return map
}

/**
 * Resolve profile for display. Avatar priority (matches avatar-resolver):
 * 1. member_submissions.avatar_url (canonical — when null, user explicitly removed)
 * 2. profiles.avatar_url
 * 3. auth.user_metadata.avatar_url
 * 4. initials fallback (empty string)
 */
export function resolveDisplayProfile(
  profile: ResolvedProfile | null,
  memberFallback: { name?: string | null; avatar_url?: string | null; updated_at?: string }
): { name: string; avatarUrl: string } {
  const name = (profile?.fullName || memberFallback.name || "").trim() || "?"
  const rawUrl =
    (memberFallback.avatar_url && String(memberFallback.avatar_url).trim()) ||
    profile?.avatarUrl ||
    ""
  const updatedAt =
    memberFallback.avatar_url != null ? memberFallback.updated_at : profile?.updatedAt || memberFallback.updated_at
  const avatarUrl = rawUrl ? `${rawUrl}?v=${updatedAt ?? ""}` : ""
  return { name, avatarUrl }
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
 * merges with member fallback. Returns map of memberId -> { name, avatarUrl }.
 */
export async function resolveMembersDisplay(
  members: MemberWithUserId[],
  ownerAuthProfile?: ResolvedProfile | null
): Promise<Map<string, { name: string; avatarUrl: string }>> {
  const userIds = members
    .map((m) => m.user_id)
    .filter((id): id is string => !!id)
  const profiles = await fetchProfilesForUserIds(userIds)
  const userIdToProfile = profiles

  const result = new Map<string, { name: string; avatarUrl: string }>()
  for (const m of members) {
    const profile =
      m.is_owner_participant && ownerAuthProfile
        ? ownerAuthProfile
        : m.user_id
          ? userIdToProfile.get(m.user_id) ?? null
          : null
    const resolved = resolveDisplayProfile(profile, m)
    result.set(m.id, resolved)
  }
  return result
}
