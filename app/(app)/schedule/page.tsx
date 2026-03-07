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
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Schedule
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Published schedules and rotation history.
        </p>
      </div>

      <ScheduleListContent schedules={items} teamTitles={teamTitles} />
    </main>
  )
}
