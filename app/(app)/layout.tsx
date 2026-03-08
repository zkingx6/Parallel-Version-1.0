import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server"
import { SetupProvider } from "@/lib/setup-context"
import { TopNav } from "@/components/parallel/top-nav"
import { resolveOwnerAvatar } from "@/lib/avatar-resolver"
import { resolvePostLoginRedirect } from "@/lib/actions"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const pathname = (await headers()).get("x-pathname") ?? ""
  const scheduleMatch = pathname.match(/^\/schedule\/([^/]+)(?:\/|$)/)
  const scheduleId = scheduleMatch?.[1]

  if (scheduleId) {
    const serviceSupabase = createServiceSupabase()
    const { data: schedule } = await serviceSupabase
      .from("schedules")
      .select("team_id")
      .eq("id", scheduleId)
      .single()
    if (schedule) {
      const { data: meeting } = await serviceSupabase
        .from("meetings")
        .select("manager_id")
        .eq("id", schedule.team_id)
        .single()
      const isOwner = meeting?.manager_id === user.id
      const { data: memberRow } = await serviceSupabase
        .from("member_submissions")
        .select("id")
        .eq("meeting_id", schedule.team_id)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
      const isMember = !!memberRow
      if (isOwner || isMember) {
        return (
          <SetupProvider>
            <div className="min-h-screen">
              <TopNav
                userEmail={user.email || ""}
                userName={
                  (user.user_metadata?.full_name as string) ||
                  (user.user_metadata?.name as string) ||
                  user.email?.split("@")[0] ||
                  ""
                }
                userAvatar={resolveOwnerAvatar(user)}
              />
              {children}
            </div>
          </SetupProvider>
        )
      }
    }
    redirect("/schedule")
  }

  const target = await resolvePostLoginRedirect()
  if (target.startsWith("/member-dashboard")) redirect(target)

  const userEmail = user.email || ""
  const userName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    ""
  const userAvatar = resolveOwnerAvatar(user)

  return (
    <SetupProvider>
      <div className="min-h-screen">
        <TopNav
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
        />
        {children}
      </div>
    </SetupProvider>
  )
}
