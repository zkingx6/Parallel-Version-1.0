import { createServerSupabase } from "@/lib/supabase-server"
import { PageBackLink } from "@/components/ui/page-back-link"
import { getEffectivePlanFromDb } from "@/lib/plan-resolver"
import { UpgradePageContent } from "./content"

export default async function UpgradePage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const plan = user ? await getEffectivePlanFromDb(user.id) : "starter"

  return (
    <main className="mx-auto max-w-4xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <PageBackLink href="/settings">Back</PageBackLink>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
        Upgrade to Pro
      </h2>
      <p className="text-sm text-muted-foreground mb-10">
        Get more capacity for your teams and longer rotation schedules.
      </p>
      <UpgradePageContent currentPlan={plan} />
    </main>
  )
}
