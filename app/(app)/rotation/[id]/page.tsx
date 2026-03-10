import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { RotationSection } from "@/components/parallel/rotation-section"
import {
  resolveMembersDisplay,
  getOwnerProfileForMeeting,
} from "@/lib/profile-resolver"

export default async function RotationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single()

  if (!meeting) redirect("/teams")

  const { data: members } = await supabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const ownerAuthProfile = await getOwnerProfileForMeeting(
    meeting.manager_id,
    user ?? undefined
  )
  const membersDisplay = await resolveMembersDisplay(
    members ?? [],
    ownerAuthProfile ?? undefined
  )

  return (
    <RotationSection
      meeting={meeting}
      members={members || []}
      membersDisplay={membersDisplay}
    />
  )
}
