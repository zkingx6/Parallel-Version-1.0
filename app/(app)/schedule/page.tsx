import Link from "next/link"
import { createServerSupabase } from "@/lib/supabase-server"
import { ScheduleListContent } from "@/components/parallel/schedule-list-content"

export default async function ScheduleListPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

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

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1 font-semibold">
            Schedule
          </h1>
          <p className="text-[#9ca3af] text-[0.88rem]">
            Published schedules and rotation history.
          </p>
        </div>

        <ScheduleListContent schedules={items} teamTitles={teamTitles} />
      </div>
    </main>
  )
}
