/**
 * GLOBAL AVATAR RESOLUTION — Single source of truth for the entire product.
 *
 * Priority order (required):
 * 1. member_submissions.avatar_url
 * 2. profiles.avatar_url (optional, for future)
 * 3. auth.user.user_metadata.avatar_url (or picture)
 * 4. fallback to initials (empty string → component shows initials)
 *
 * No component should read avatar fields directly.
 * All avatar URLs must be resolved through this module.
 */

export type AvatarResolutionContext =
  | {
      type: "member"
      /** From member_submissions */
      memberAvatarUrl?: string | null
      memberUpdatedAt?: string
      /** From profiles table (optional) */
      profilesAvatarUrl?: string | null
      /** For owner participant when member_submissions has no avatar */
      ownerUserMetadataAvatar?: string | null
      ownerUserMetadataPicture?: string | null
      ownerUserUpdatedAt?: string
      /** Pre-resolved owner avatar (when page already resolved it) */
      ownerResolvedAvatar?: string
      isOwnerParticipant?: boolean
    }
  | {
      type: "owner"
      /** From auth user_metadata */
      userMetadataAvatar?: string | null
      userMetadataPicture?: string | null
      userUpdatedAt?: string
      /** From profiles table (optional) */
      profilesAvatarUrl?: string | null
      /** From member_submissions (synced when owner updates profile) */
      memberAvatarUrl?: string | null
      memberUpdatedAt?: string
    }

/**
 * Resolves avatar URL using the global priority rule.
 * Returns empty string when no avatar available (caller shows initials).
 */
export function resolveAvatarUrl(context: AvatarResolutionContext): string {
  const addCacheBust = (url: string, updatedAt?: string) =>
    `${url}?v=${updatedAt ?? ""}`

  if (context.type === "member") {
    // 1. member_submissions.avatar_url
    if (context.memberAvatarUrl) {
      return addCacheBust(context.memberAvatarUrl, context.memberUpdatedAt)
    }
    // 2. profiles.avatar_url
    if (context.profilesAvatarUrl) {
      return addCacheBust(context.profilesAvatarUrl)
    }
    // 3. For owner participant: pre-resolved or user_metadata fallback
    if (context.isOwnerParticipant) {
      if (context.ownerResolvedAvatar) return context.ownerResolvedAvatar
      const url =
        context.ownerUserMetadataAvatar ?? context.ownerUserMetadataPicture
      if (url) {
        return addCacheBust(url, context.ownerUserUpdatedAt)
      }
    }
    return ""
  }

  // type === "owner"
  // 1. member_submissions.avatar_url (synced from profile)
  if (context.memberAvatarUrl) {
    return addCacheBust(context.memberAvatarUrl, context.memberUpdatedAt)
  }
  // 2. profiles.avatar_url
  if (context.profilesAvatarUrl) {
    return addCacheBust(context.profilesAvatarUrl)
  }
  // 3. user_metadata.avatar_url or picture
  const metaAvatar =
    context.userMetadataAvatar || context.userMetadataPicture || ""
  if (metaAvatar) {
    return addCacheBust(metaAvatar, context.userUpdatedAt)
  }
  return ""
}

/**
 * Helper: resolve for a member in a team/schedule context.
 * Caller provides member_submissions data + optional owner metadata for owner fallback.
 */
export function resolveMemberAvatar(
  member: {
    avatar_url?: string | null
    updated_at?: string
    is_owner_participant?: boolean
  },
  ownerContext?: {
    userMetadataAvatar?: string | null
    userMetadataPicture?: string | null
    userUpdatedAt?: string
    /** Pre-resolved owner avatar URL */
    resolvedAvatar?: string
  }
): string {
  return resolveAvatarUrl({
    type: "member",
    memberAvatarUrl: member.avatar_url,
    memberUpdatedAt: member.updated_at,
    isOwnerParticipant: member.is_owner_participant,
    ownerResolvedAvatar: ownerContext?.resolvedAvatar,
    ownerUserMetadataAvatar: ownerContext?.userMetadataAvatar,
    ownerUserMetadataPicture: ownerContext?.userMetadataPicture,
    ownerUserUpdatedAt: ownerContext?.userUpdatedAt,
  })
}

/**
 * Helper: resolve for the current auth user (owner nav, settings).
 */
export function resolveOwnerAvatar(
  user: {
    user_metadata?: { avatar_url?: string; picture?: string } | null
    updated_at?: string
  },
  memberSubmission?: { avatar_url?: string | null; updated_at?: string } | null
): string {
  return resolveAvatarUrl({
    type: "owner",
    userMetadataAvatar: user?.user_metadata?.avatar_url as string | undefined,
    userMetadataPicture: user?.user_metadata?.picture as string | undefined,
    userUpdatedAt: user?.updated_at,
    memberAvatarUrl: memberSubmission?.avatar_url,
    memberUpdatedAt: memberSubmission?.updated_at,
  })
}
