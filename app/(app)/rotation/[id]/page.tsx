import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { RotationSection } from "@/components/parallel/rotation-section"

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

  if (!meeting) redirect("/meetings")

  const { data: members } = await supabase
    .from("member_submissions")
    .select("*")
    .eq("meeting_id", id)
    .order("is_owner_participant", { ascending: false })
    .order("created_at")

  return (
    <RotationSection
      meeting={meeting}
      members={members || []}
    />
  )
}
