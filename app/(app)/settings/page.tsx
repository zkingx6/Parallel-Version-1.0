import { createServerSupabase } from "@/lib/supabase-server"
import { SettingsContent } from "./content"
import { ensureProfileForUser, fetchProfilesForUserIds, resolveCurrentUserDisplay } from "@/lib/profile-resolver"

export default async function SettingsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <SettingsContent userEmail="" userName="" userAvatar="" />
    )
  }

  await ensureProfileForUser(supabase, user)
  const profileMap = await fetchProfilesForUserIds([user.id])
  const profile = profileMap.get(user.id)
  const { userName, userAvatar } = resolveCurrentUserDisplay(user, profile)

  return (
    <SettingsContent
      userEmail={user.email || ""}
      userName={userName}
      userAvatar={userAvatar}
    />
  )
}
