/**
 * Single source of truth for profile sync from Supabase Auth.
 * Syncs auth user metadata into profiles table with explicit precedence rules.
 * Safe to call repeatedly (on login, session recovery, first app load).
 *
 * Precedence (never overwrite custom app values with auth):
 * - Email: auth.user.email > existing profile.email
 * - Name: existing profile.full_name (if non-empty) > auth metadata > email prefix
 * - Avatar: existing profile.avatar_url (if non-empty) > auth metadata
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthUserForSync = {
  id: string
  email?: string | null
  user_metadata?: {
    full_name?: string
    name?: string
    avatar_url?: string
    picture?: string
  } | null
}

function getAuthName(user: AuthUserForSync): string {
  const meta = user.user_metadata
  return (
    (meta?.full_name || meta?.name || user.email?.split("@")[0] || "").trim()
  )
}

function getAuthAvatar(user: AuthUserForSync): string {
  const meta = user.user_metadata
  return (meta?.avatar_url || meta?.picture || "").trim()
}

/**
 * Sync auth user into profiles table.
 * - Creates profile if missing
 * - Updates only empty profile fields from auth (never overwrites custom values)
 * - Uses user's supabase client so RLS allows insert/update
 */
export async function syncProfileFromAuth(
  supabase: SupabaseClient,
  user: AuthUserForSync
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, avatar_url, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle()

    const authEmail = user.email?.trim() || null
    const authName = getAuthName(user)
    const authAvatar = getAuthAvatar(user)

    if (!existing) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)
      await supabase.from("profiles").insert({
        user_id: user.id,
        email: authEmail,
        full_name: authName || null,
        avatar_url: authAvatar || null,
        plan: "starter",
        trial_ends_at: trialEndsAt.toISOString(),
      })
      return
    }

    const email = authEmail ?? existing.email
    const fullName =
      (existing.full_name && String(existing.full_name).trim()) || authName || null
    const avatarUrl =
      (existing.avatar_url && String(existing.avatar_url).trim()) ||
      authAvatar ||
      null

    const updatePayload: Record<string, unknown> = {
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }
    if (existing.trial_ends_at == null) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)
      updatePayload.trial_ends_at = trialEndsAt.toISOString()
    }

    await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)
  } catch {
    /* profiles table may not exist yet */
  }
}
