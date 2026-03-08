import { createServerSupabase } from "@/lib/supabase-server"
import { DashboardContent } from "../dashboard/content"

export default async function TeamsPage() {
  const supabase = await createServerSupabase()
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false })

  return <DashboardContent meetings={meetings || []} />
}
