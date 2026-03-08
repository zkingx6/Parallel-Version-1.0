/**
 * @deprecated Use lib/avatar-resolver.ts directly.
 * This file re-exports for backwards compatibility during migration.
 *
 * Avatar resolution priority (global rule):
 * 1. member_submissions.avatar_url
 * 2. profiles.avatar_url
 * 3. auth.user.user_metadata.avatar_url
 * 4. fallback to initials
 */

import {
  resolveMemberAvatar,
  type AvatarResolutionContext,
} from "./avatar-resolver"

export type MemberWithAvatar = {
  avatar_url?: string | null
  updated_at?: string
  is_owner_participant?: boolean
}

/**
 * Resolves avatar URL for a member.
 * @param ownerProfileAvatar - Pre-resolved owner avatar (from resolveOwnerAvatar)
 */
export function getMemberAvatarUrl(
  member: MemberWithAvatar,
  ownerProfileAvatar?: string
): string {
  return resolveMemberAvatar(member, {
    resolvedAvatar: ownerProfileAvatar,
  })
}

export { resolveAvatarUrl, resolveMemberAvatar, resolveOwnerAvatar } from "./avatar-resolver"
export type { AvatarResolutionContext } from "./avatar-resolver"
