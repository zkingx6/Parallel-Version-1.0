import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server"
import { SetupProvider } from "@/lib/setup-context"
import { TopNav } from "@/components/parallel/top-nav"
import { resolvePostLoginRedirect } from "@/lib/actions"
import { ensureProfileForUser, fetchProfilesForUserIds, resolveCurrentUserDisplay } from "@/lib/profile-resolver"

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

  await ensureProfileForUser(supabase, user)
  const profileMap = await fetchProfilesForUserIds([user.id])
  const profile = profileMap.get(user.id)
  const { userName, userAvatar } = resolveCurrentUserDisplay(user, profile)

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
                userName={userName}
                userAvatar={userAvatar}
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

  return (
    <SetupProvider>
      <div className="min-h-screen">
        <TopNav
          userEmail={user.email || ""}
          userName={userName}
          userAvatar={userAvatar}
        />
        {children}
      </div>
    </SetupProvider>
  )
}
