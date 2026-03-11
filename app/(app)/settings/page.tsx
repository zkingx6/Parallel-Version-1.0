import { createServerSupabase } from "@/lib/supabase-server"
import { getEffectivePlanFromDb, getPlanAndTrialFromDb } from "@/lib/plan-resolver"
import { getBillingForUser, syncBillingFromStripe } from "@/lib/billing"
import { SettingsContent } from "./content"
import { ensureProfileForUser, fetchProfilesForUserIds, resolveCurrentUserDisplay } from "@/lib/profile-resolver"

export default async function SettingsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <SettingsContent
        userEmail=""
        userName=""
        userAvatar=""
        plan="starter"
        trialActive={false}
        trialDaysLeft={0}
        billing={null}
      />
    )
  }

  await ensureProfileForUser(supabase, user)
  const profileMap = await fetchProfilesForUserIds([user.id])
  const profile = profileMap.get(user.id)
  const { userName, userAvatar } = resolveCurrentUserDisplay(user, profile)
  const [planInfo, effectivePlan] = await Promise.all([
    getPlanAndTrialFromDb(user.id),
    getEffectivePlanFromDb(user.id),
  ])
  let billing = effectivePlan === "pro" ? await getBillingForUser(user.id) : null
  if (effectivePlan === "pro" && !billing?.stripeCustomerId) {
    await syncBillingFromStripe(user.id, user.email ?? null)
    billing = await getBillingForUser(user.id)
  }

  return (
    <SettingsContent
      userEmail={user.email || ""}
      userName={userName}
      userAvatar={userAvatar}
      plan={planInfo.plan}
      trialActive={planInfo.trialActive}
      trialDaysLeft={planInfo.trialDaysLeft}
      billing={billing}
    />
  )
}
