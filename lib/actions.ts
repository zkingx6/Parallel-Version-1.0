"use server"

import { redirect } from "next/navigation"
import { createServerSupabase, createServiceSupabase } from "./supabase-server"
import { revalidatePath } from "next/cache"

/**
 * Sign in with email/password. Redirects to /teams (or resolvePostLoginRedirect) on success.
 */
export async function signInAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  const redirectTo = formData.get("redirectTo") as string | null
  const isSignUp = formData.get("isSignUp") === "1"

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createServerSupabase()

  if (isSignUp) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return { error: null, signUpSuccess: true }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const safeRedirect =
    redirectTo &&
    typeof redirectTo === "string" &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//")
  const target = safeRedirect ? redirectTo : await resolvePostLoginRedirect()
  redirect(target)
}

/**
 * Resolve post-login redirect based on user role.
 * Routing depends ONLY on relationship to teams (owner vs member).
 * Plan type (starter/pro) must NOT determine routing.
 *
 * - Owner: meetings.manager_id === user.id → /teams
 * - Member: member_submissions.user_id === user.id, NOT a manager → /member-dashboard
 * - Neither → /teams (default for new users)
 */
export async function resolvePostLoginRedirect(): Promise<string> {
  const serverSupabase = await createServerSupabase()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  if (!user) return "/"

  const serviceSupabase = createServiceSupabase()

  const { data: ownedMeetings } = await serviceSupabase
    .from("meetings")
    .select("id")
    .eq("manager_id", user.id)
    .limit(1)
  if (ownedMeetings && ownedMeetings.length > 0) return "/teams"

  const { data: memberRows } = await serviceSupabase
    .from("member_submissions")
    .select("id, meeting_id")
    .eq("user_id", user.id)
    .limit(1)
  if (memberRows && memberRows.length > 0) {
    const m = memberRows[0]
    const { data: meeting } = await serviceSupabase
      .from("meetings")
      .select("invite_token")
      .eq("id", m.meeting_id)
      .single()
    const params = new URLSearchParams()
    if (meeting?.invite_token) {
      params.set("token", meeting.invite_token)
      params.set("memberId", m.id)
    }
    return `/member-dashboard${params.toString() ? `?${params.toString()}` : ""}`
  }

  return "/teams"
}
import type { HardNoRange } from "./types"
import { isComplementOfOverlapPattern } from "./hard-no-ranges"

export async function createMeeting(title: string) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({ manager_id: user.id, title })
    .select()
    .single()

  if (error) return { error: error.message }
  if (!meeting) return { error: "Failed to create meeting" }

  const ownerName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Owner"

  const { error: memberError } = await supabase.from("member_submissions").insert({
    meeting_id: meeting.id,
    name: ownerName,
    timezone: "America/New_York",
    work_start_hour: 9,
    work_end_hour: 18,
    hard_no_ranges: [],
    is_owner_participant: true,
    user_id: user.id,
  })

  if (memberError) {
    console.error("[createMeeting] Failed to insert owner as member:", memberError)
  }

  return { data: meeting }
}

export async function updateMeetingConfig(
  meetingId: string,
  config: {
    title?: string
    day_of_week?: number
    duration_minutes?: number
    rotation_weeks?: number
    anchor_offset?: number
    display_timezone?: string | null
    base_time_minutes?: number | null
    start_date?: string | null
  }
) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("meetings")
    .update(config)
    .eq("id", meetingId)
    .eq("manager_id", user.id)

  if (error) return { error: error.message }
  revalidatePath(`/meeting/${meetingId}`)
  revalidatePath(`/team/${meetingId}`)
  revalidatePath(`/rotation/${meetingId}`)
  revalidatePath(`/schedule`)
  return { success: true }
}

function generateShareToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(12)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  }
  return Math.random().toString(36).slice(2, 26)
}

export async function createScheduleRecord(
  teamId: string,
  name: string,
  rotationResult: { weeks: unknown[]; modeUsed: string; explain: unknown }
) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const weeks = rotationResult.weeks?.length ?? 0
  const shareToken = generateShareToken()
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      team_id: teamId,
      name,
      rotation_result: rotationResult,
      weeks,
      share_token: shareToken,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/rotation/${teamId}`)
  revalidatePath(`/schedule`)
  return { data: data as { id: string } }
}

export async function getSchedulesForCurrentUser() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: { schedules: [], teamTitles: {} } }
  }

  const { data: schedules } = await supabase
    .from("schedules")
    .select("*")
    .order("created_at", { ascending: false })

  const items = schedules ?? []
  const teamIds = [...new Set(items.map((s) => s.team_id))]
  const teamTitles: Record<string, string> = {}
  if (teamIds.length > 0) {
    const { data: meetings } = await supabase
      .from("meetings")
      .select("id, title")
      .in("id", teamIds)
    for (const m of meetings ?? []) {
      teamTitles[m.id] = m.title
    }
  }

  return { data: { schedules: items, teamTitles } }
}

export async function deleteSchedule(scheduleId: string) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", scheduleId)

  if (error) return { error: error.message }
  revalidatePath(`/schedule`)
  return { success: true }
}

export async function deleteMeeting(meetingId: string) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId)
    .eq("manager_id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  revalidatePath("/teams")
  return { success: true }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const displayName = (formData.get("displayName") as string)?.trim() ?? ""
  if (!displayName) return { error: "Display name is required." }

  const removeAvatar = formData.get("removeAvatar") === "1" || formData.get("removeAvatar") === "true"
  const avatarFile = formData.get("avatar") as File | null
  let avatarUrl: string | null =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    null

  if (removeAvatar) {
    avatarUrl = null
  } else if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg"
    const validExts = ["jpg", "jpeg", "png", "gif", "webp"]
    if (!validExts.includes(ext)) {
      return { error: "Avatar must be JPG, PNG, GIF, or WebP." }
    }
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true })

    if (uploadError) {
      const msg =
        uploadError.message === "Bucket not found"
          ? "Avatar storage not set up yet. Create the avatars bucket in Supabase (see AVATAR_SETUP.md)."
          : uploadError.message || "Avatar upload failed."
      return { error: msg }
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path)
    avatarUrl = publicUrl
  }

  const existing = (user.user_metadata || {}) as Record<string, unknown>
  const { error } = await supabase.auth.updateUser({
    data: {
      ...existing,
      full_name: displayName,
      avatar_url: removeAvatar ? null : (avatarUrl ?? existing.avatar_url ?? existing.picture ?? undefined),
    },
  })

  if (error) return { error: error.message }

  // Upsert profiles table (canonical source for display)
  try {
    await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        email: user.email ?? null,
        full_name: displayName,
        avatar_url: removeAvatar ? null : (avatarUrl ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
  } catch {
    /* profiles table may not exist yet; auth still has the data */
  }

  revalidatePath("/settings")
  revalidatePath("/settings/profile")
  revalidatePath("/")
  revalidatePath("/teams", "layout")
  revalidatePath("/schedule", "layout")
  revalidatePath("/team", "layout")
  revalidatePath("/rotation", "layout")
  revalidatePath("/dashboard", "layout")
  return { success: true }
}

export async function upsertOwnerParticipant(
  meetingId: string,
  payload: {
    name: string
    timezone: string
    work_start_hour: number
    work_end_hour: number
    hard_no_ranges: HardNoRange[]
    role?: string
  }
) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const userDefined = Array.isArray(payload.hard_no_ranges)
    ? payload.hard_no_ranges
    : []
  if (isComplementOfOverlapPattern(userDefined)) {
    return {
      error:
        "Invalid hard boundaries: pattern looks like corrupted data. Please set your availability again.",
    }
  }
  const persistPayload = {
    ...payload,
    hard_no_ranges: userDefined,
  }

  const { data: existing } = await supabase
    .from("member_submissions")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("is_owner_participant", true)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from("member_submissions")
      .update({
        ...persistPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: "Owner participant not found." }
    revalidatePath(`/team/${meetingId}`)
    return { data }
  }

  const { data, error } = await supabase
    .from("member_submissions")
    .insert({
      meeting_id: meetingId,
      is_owner_participant: true,
      ...persistPayload,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/team/${meetingId}`)
  return { data }
}

export async function deleteMember(memberId: string, meetingId: string) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("member_submissions")
    .delete()
    .eq("id", memberId)

  if (error) return { error: error.message }
  revalidatePath(`/team/${meetingId}`)
  return { success: true }
}

export async function getJoinData(token: string) {
  const supabase = createServiceSupabase()

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id, title, day_of_week, duration_minutes, anchor_offset")
    .eq("invite_token", token)
    .single()

  if (error || !meeting) return { error: "Invalid or expired invite link." }
  return { data: meeting }
}

export async function getMemberTeamSummary(token: string, memberId: string) {
  const supabase = createServiceSupabase()

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, title, day_of_week, duration_minutes")
    .eq("invite_token", token)
    .single()

  if (meetingError || !meeting) return { error: "Invalid or expired invite link." }

  const { data: member, error: memberError } = await supabase
    .from("member_submissions")
    .select("id")
    .eq("meeting_id", meeting.id)
    .eq("id", memberId)
    .maybeSingle()

  if (memberError) return { error: memberError.message }
  if (!member) return { error: "Member not found." }

  const { count } = await supabase
    .from("member_submissions")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meeting.id)

  const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const dayName = dayNames[meeting.day_of_week] ?? ""

  return {
    data: {
      token,
      memberId,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        day_of_week: meeting.day_of_week,
        duration_minutes: meeting.duration_minutes,
      },
      memberCount: count ?? 0,
      cadence: dayName
        ? `Weekly ${dayName} • ${meeting.duration_minutes} min`
        : `${meeting.duration_minutes} min, weekly`,
    },
  }
}

export async function getMemberDashboardData(token: string, memberId: string) {
  const supabase = createServiceSupabase()

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, title, day_of_week, duration_minutes, manager_id")
    .eq("invite_token", token)
    .single()

  if (meetingError || !meeting) return { error: "Invalid or expired invite link." }

  const { data: member, error: memberError } = await supabase
    .from("member_submissions")
    .select("id, name, timezone, work_start_hour, work_end_hour, hard_no_ranges, role, avatar_url, updated_at, user_id, is_owner_participant")
    .eq("meeting_id", meeting.id)
    .eq("id", memberId)
    .maybeSingle()

  if (memberError) return { error: memberError.message }
  if (!member) return { error: "Member not found." }

  const { resolveMembersDisplay, fetchProfilesForUserIds } = await import("@/lib/profile-resolver")
  const ownerProfiles = meeting.manager_id
    ? await fetchProfilesForUserIds([meeting.manager_id])
    : new Map()
  const ownerAuthProfile = meeting.manager_id
    ? ownerProfiles.get(meeting.manager_id) ?? null
    : null
  const membersDisplay = await resolveMembersDisplay([member], ownerAuthProfile ?? undefined)
  const memberDisplay = membersDisplay.get(member.id) ?? {
    name: member.name ?? "?",
    avatarUrl: member.avatar_url ?? "",
  }

  let memberEmail: string | null = null
  const memberWithUserId = member as { user_id?: string | null }
  if (memberWithUserId.user_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(memberWithUserId.user_id)
    memberEmail = authUser?.user?.email ?? null
  }

  const { count } = await supabase
    .from("member_submissions")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meeting.id)

  const { data: members } = await supabase
    .from("member_submissions")
    .select("id, name, role, is_owner_participant, user_id")
    .eq("meeting_id", meeting.id)
    .order("is_owner_participant", { ascending: false })
    .order("name")

  const membersDisplayAll = await resolveMembersDisplay(members ?? [], ownerAuthProfile ?? undefined)

  return {
    data: {
      meeting,
      member,
      memberDisplay,
      memberEmail,
      memberCount: count ?? 0,
      members: members ?? [],
      membersDisplay: Object.fromEntries(membersDisplayAll),
    },
  }
}

export async function getExistingMemberForJoin(token: string, memberId: string) {
  const supabase = createServiceSupabase()

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, manager_id")
    .eq("invite_token", token)
    .single()

  if (!meeting) return { error: "Invalid invite link." }

  const { data: member, error } = await supabase
    .from("member_submissions")
    .select("id, name, timezone, work_start_hour, work_end_hour, hard_no_ranges, role, avatar_url, updated_at, user_id, is_owner_participant")
    .eq("meeting_id", meeting.id)
    .eq("id", memberId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!member) return { error: "Member not found." }

  const { resolveMembersDisplay, fetchProfilesForUserIds } = await import("@/lib/profile-resolver")
  const ownerProfiles = meeting.manager_id
    ? await fetchProfilesForUserIds([meeting.manager_id])
    : new Map()
  const ownerAuthProfile = meeting.manager_id
    ? ownerProfiles.get(meeting.manager_id) ?? null
    : null
  const membersDisplay = await resolveMembersDisplay([member], ownerAuthProfile ?? undefined)
  const memberDisplay = membersDisplay.get(member.id) ?? {
    name: member.name ?? "?",
    avatarUrl: member.avatar_url ?? "",
  }

  return {
    data: {
      ...member,
      memberDisplay,
    },
  }
}

export async function submitMember(
  token: string,
  input: {
    name: string
    timezone: string
    work_start_hour: number
    work_end_hour: number
    hard_no_ranges: HardNoRange[]
    role?: string
  },
  existingId?: string
) {
  const supabase = createServiceSupabase()
  const serverSupabase = await createServerSupabase()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  const userId = user?.id ?? null

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("invite_token", token)
    .single()

  if (!meeting) return { error: "Invalid invite link." }

  const userDefined = Array.isArray(input.hard_no_ranges)
    ? input.hard_no_ranges
    : []
  if (isComplementOfOverlapPattern(userDefined)) {
    return {
      error:
        "Invalid hard boundaries: pattern looks like corrupted data. Please set your availability again.",
    }
  }
  const persistInput = {
    ...input,
    hard_no_ranges: userDefined,
    role: (input.role?.trim() || null) as string | null,
  }

  if (existingId) {
    const { data, error } = await supabase
      .from("member_submissions")
      .update({
        ...persistInput,
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId)
      .eq("meeting_id", meeting.id)
      .select()
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: "Submission not found. It may have been removed." }
    revalidatePath(`/team/${meeting.id}`)
    return { data }
  }

  const { data, error } = await supabase
    .from("member_submissions")
    .insert({
      meeting_id: meeting.id,
      user_id: userId,
      ...persistInput,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/team/${meeting.id}`)
  return { data }
}

export async function updateMemberProfile(
  token: string,
  memberId: string,
  formData: FormData
) {
  const supabase = createServiceSupabase()

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("invite_token", token)
    .single()

  if (!meeting) return { error: "Invalid invite link." }

  const { data: member } = await supabase
    .from("member_submissions")
    .select("avatar_url, user_id")
    .eq("id", memberId)
    .eq("meeting_id", meeting.id)
    .maybeSingle()

  if (!member) return { error: "Member not found." }

  const name = (formData.get("displayName") as string)?.trim() ?? ""
  if (!name) return { error: "Display name is required." }

  const removeAvatar = formData.get("removeAvatar") === "1" || formData.get("removeAvatar") === "true"
  const memberWithUserId = member as { avatar_url?: string; user_id?: string | null }
  let avatarUrl: string | null = memberWithUserId.avatar_url ?? null

  if (removeAvatar) {
    avatarUrl = null
  } else {
  const avatarFile = formData.get("avatar") as File | null
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg"
    const validExts = ["jpg", "jpeg", "png", "gif", "webp"]
    if (!validExts.includes(ext)) {
      return { error: "Avatar must be JPG, PNG, GIF, or WebP." }
    }
    const path = `member/${memberId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true })

    if (uploadError) {
      const msg =
        uploadError.message === "Bucket not found"
          ? "Avatar storage not set up yet. Create the avatars bucket in Supabase (see AVATAR_SETUP.md)."
          : uploadError.message || "Avatar upload failed."
      return { error: msg }
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path)
    avatarUrl = publicUrl
  }
  }

  const userId = memberWithUserId.user_id

  if (userId) {
    const serverSupabase = await createServerSupabase()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (user?.id === userId) {
      const existing = (user.user_metadata || {}) as Record<string, unknown>
      await serverSupabase.auth.updateUser({
        data: {
          ...existing,
          full_name: name,
          avatar_url: removeAvatar ? null : (avatarUrl ?? existing.avatar_url ?? existing.picture ?? undefined),
        },
      })
    } else {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: name,
          avatar_url: removeAvatar ? null : (avatarUrl ?? undefined),
        },
      })
    }
    try {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          full_name: name,
          avatar_url: removeAvatar ? null : (avatarUrl ?? null),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      if (profileError) {
        console.error("[updateMemberProfile] profiles upsert failed:", profileError.message)
      }
    } catch (e) {
      console.error("[updateMemberProfile] profiles upsert error:", e)
    }
  }

  const updatePayload: { name?: string; avatar_url?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
    avatar_url: avatarUrl,
  }
  if (!userId) {
    updatePayload.name = name
  }

  const { data, error } = await supabase
    .from("member_submissions")
    .update(updatePayload)
    .eq("id", memberId)
    .eq("meeting_id", meeting.id)
    .select()
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: "Member not found." }
  revalidatePath(`/team/${meeting.id}`)
  revalidatePath("/schedule", "layout")
  revalidatePath("/member-dashboard", "layout")
  revalidatePath("/teams", "layout")
  revalidatePath("/team", "layout")
  revalidatePath("/rotation", "layout")
  return { data }
}
