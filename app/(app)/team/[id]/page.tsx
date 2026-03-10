import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { TeamSection } from "@/components/parallel/team-section"
import {
  resolveMembersDisplay,
  getOwnerProfileForMeeting,
} from "@/lib/profile-resolver"

export default async function TeamPage({
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

  const hasOwnerParticipant = (members || []).some(
    (m) => m.is_owner_participant === true
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userEmail = user?.email || ""
  const ownerAuthProfile = await getOwnerProfileForMeeting(
    meeting.manager_id,
    user ?? undefined
  )
  const membersDisplay = await resolveMembersDisplay(
    members ?? [],
    ownerAuthProfile ?? undefined
  )

  return (
    <TeamSection
      meeting={meeting}
      members={members || []}
      hasOwnerParticipant={hasOwnerParticipant}
      userEmail={userEmail}
      membersDisplay={membersDisplay}
    />
  )
}
