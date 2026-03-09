import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createServerSupabase } from "@/lib/supabase-server"
import { ensureProfileForUser } from "@/lib/profile-resolver"

export default async function MemberDashboardLayout({
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
          <p className="text-[0.88rem] text-[#9ca3af]">Loading…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
