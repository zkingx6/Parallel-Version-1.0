import { createServerSupabase } from "@/lib/supabase-server"
import { SettingsContent } from "./content"

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
      userAvatar={(() => {
        const url =
          (user?.user_metadata?.avatar_url as string) ||
          (user?.user_metadata?.picture as string) ||
          ""
        return url ? `${url}?v=${user?.updated_at ?? ""}` : ""
      })()}
    />
  )
}
