import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { TeamSection } from "@/components/parallel/team-section"

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

  if (!meeting) redirect("/meetings")

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
  const profileDisplayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    ""
  const userName = profileDisplayName || user?.email?.split("@")[0] || ""
  const baseAvatar =
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    ""
  const userAvatar = baseAvatar ? `${baseAvatar}?v=${user?.updated_at ?? ""}` : ""

  return (
    <TeamSection
      meeting={meeting}
      members={members || []}
      hasOwnerParticipant={hasOwnerParticipant}
      userEmail={userEmail}
      ownerProfileName={profileDisplayName || userName}
      ownerProfileAvatar={userAvatar}
    />
  )
}
