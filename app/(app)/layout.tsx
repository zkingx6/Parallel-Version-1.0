import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
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

  if (!user) redirect("/auth")

  return (
    <div className="min-h-screen">
      <TopNav />
      {children}
    </div>
  )
}
