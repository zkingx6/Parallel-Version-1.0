/**
 * TEST-ONLY: Per-member rotation view.
 * Isolated from main app. Safe to delete later.
 * Route: /rotation/[id]/test
 */
import { notFound, redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { RotationTestView } from "@/components/parallel/rotation-test-view"

export default async function RotationTestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()

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

  return (
    <RotationTestView
      meeting={meeting}
      members={members || []}
    />
  )
}
