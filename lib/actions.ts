"use server"

import { createServerSupabase, createServiceSupabase } from "./supabase-server"
import { revalidatePath } from "next/cache"

/**
 * Resolve post-login redirect based on user role.
 * - Owner (has meetings where manager_id = auth.uid()) → /meetings
 * - Member only (has member_submissions with user_id, no owned meetings) → /member-dashboard
 * - Neither → /meetings (default)
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
  if (ownedMeetings && ownedMeetings.length > 0) return "/meetings"

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
    if (meeting?.invite_token) {
      return `/member-dashboard?token=${encodeURIComponent(meeting.invite_token)}&memberId=${encodeURIComponent(m.id)}`
    }
  }

  return "/meetings"
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
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      team_id: teamId,
      name,
      rotation_result: rotationResult,
      weeks,
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
  revalidatePath("/meetings")
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

  const avatarFile = formData.get("avatar") as File | null
  let avatarUrl: string | null =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    null

  if (avatarFile && avatarFile.size > 0) {
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
      avatar_url: avatarUrl ?? existing.avatar_url ?? existing.picture ?? undefined,
    },
  })

  if (error) return { error: error.message }
  revalidatePath("/settings")
  revalidatePath("/settings/profile")
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
  const persistPayload = { ...payload, hard_no_ranges: userDefined }

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
    .select("id, title, day_of_week, duration_minutes")
    .eq("invite_token", token)
    .single()

  if (meetingError || !meeting) return { error: "Invalid or expired invite link." }

  const { data: member, error: memberError } = await supabase
    .from("member_submissions")
    .select("id, name, timezone, work_start_hour, work_end_hour, hard_no_ranges, role, avatar_url, updated_at")
    .eq("meeting_id", meeting.id)
    .eq("id", memberId)
    .maybeSingle()

  if (memberError) return { error: memberError.message }
  if (!member) return { error: "Member not found." }

  const { count } = await supabase
    .from("member_submissions")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meeting.id)

  const { data: members } = await supabase
    .from("member_submissions")
    .select("id, name, role, is_owner_participant")
    .eq("meeting_id", meeting.id)
    .order("is_owner_participant", { ascending: false })
    .order("name")

  return {
    data: {
      meeting,
      member,
      memberCount: count ?? 0,
      members: members ?? [],
    },
  }
}

export async function getExistingMemberForJoin(token: string, memberId: string) {
  const supabase = createServiceSupabase()

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("invite_token", token)
    .single()

  if (!meeting) return { error: "Invalid invite link." }

  const { data: member, error } = await supabase
    .from("member_submissions")
    .select("name, timezone, work_start_hour, work_end_hour, hard_no_ranges, role, avatar_url, updated_at")
    .eq("meeting_id", meeting.id)
    .eq("id", memberId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!member) return { error: "Member not found." }
  return { data: member }
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
    .select("avatar_url")
    .eq("id", memberId)
    .eq("meeting_id", meeting.id)
    .maybeSingle()

  if (!member) return { error: "Member not found." }

  const name = (formData.get("displayName") as string)?.trim() ?? ""
  if (!name) return { error: "Display name is required." }

  let avatarUrl: string | null = (member as { avatar_url?: string }).avatar_url ?? null

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

  const { data, error } = await supabase
    .from("member_submissions")
    .update({
      name,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("meeting_id", meeting.id)
    .select()
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: "Member not found." }
  revalidatePath(`/team/${meeting.id}`)
  return { data }
}
