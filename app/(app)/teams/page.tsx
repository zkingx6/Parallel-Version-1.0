import { createServerSupabase } from "@/lib/supabase-server"
import { DashboardContent } from "../dashboard/content"

export default async function TeamsPage() {
  const supabase = await createServerSupabase()
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false })

  const memberCounts: Record<string, number> = {}
  if (meetings?.length) {
    const { data: counts } = await supabase
      .from("member_submissions")
      .select("meeting_id")
      .in("meeting_id", meetings.map((m) => m.id))
    const byMeeting = (counts ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.meeting_id] = (acc[row.meeting_id] ?? 0) + 1
      return acc
    }, {})
    Object.assign(memberCounts, byMeeting)
  }

  return (
    <DashboardContent
      meetings={meetings || []}
      memberCounts={memberCounts}
    />
  )
}
