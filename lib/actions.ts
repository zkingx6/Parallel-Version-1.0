"use server"

import { createServerSupabase, createServiceSupabase } from "./supabase-server"
import { revalidatePath } from "next/cache"
import type { HardNoRange } from "./types"
import type { WeeklyHours, WeeklyHardNo } from "./availability"
import { isComplementOfOverlapPattern } from "./hard-no-ranges"

export async function createMeeting(title: string) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase
    .from("meetings")
    .insert({ manager_id: user.id, title })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
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
  const persistInput = { ...input, hard_no_ranges: userDefined }

  if (existingId) {
    const { data, error } = await supabase
      .from("member_submissions")
      .update({
        ...persistInput,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId)
      .eq("meeting_id", meeting.id)
      .select()
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: "Submission not found. It may have been removed." }
    return { data }
  }

  const { data, error } = await supabase
    .from("member_submissions")
    .insert({
      meeting_id: meeting.id,
      ...persistInput,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function saveAvailabilityTemplate(payload: {
  timezone: string
  weekly_hours: WeeklyHours
  weekly_hard_no: WeeklyHardNo
}) {
  const supabase = await createServerSupabase()
  const { saveDefaultTemplate } = await import("./availability")
  const result = await saveDefaultTemplate(supabase, payload)
  if (result.error) return { error: result.error }
  revalidatePath("/availability")
  revalidatePath("/availability/default")
  return { success: true }
}
