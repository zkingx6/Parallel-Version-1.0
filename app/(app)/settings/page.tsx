import { createServerSupabase } from "@/lib/supabase-server"
import { SettingsContent } from "./content"
import { resolveOwnerAvatar } from "@/lib/avatar-resolver"

export default async function SettingsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <SettingsContent
      userEmail={user?.email || ""}
      userName={
        (user?.user_metadata?.full_name as string) ||
        (user?.user_metadata?.name as string) ||
        user?.email?.split("@")[0] ||
        ""
      }
      userAvatar={user ? resolveOwnerAvatar(user) : ""}
    />
  )
}
