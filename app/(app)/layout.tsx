import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { SetupProvider } from "@/lib/setup-context"
import { TopNav } from "@/components/parallel/top-nav"

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

  const userEmail = user.email || ""
  const userName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    ""
  const baseAvatar =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    ""
  const userAvatar = baseAvatar ? `${baseAvatar}?v=${user.updated_at ?? ""}` : ""

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
