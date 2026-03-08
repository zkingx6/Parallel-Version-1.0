import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase-server"
import { MemberLayoutClient } from "./member-layout-client"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")
  return <MemberLayoutClient>{children}</MemberLayoutClient>
}
