import { createServerSupabase } from "@/lib/supabase-server"
import { PageBackLink } from "@/components/ui/page-back-link"
import { getPlanAndTrialFromDb } from "@/lib/plan-resolver"
import { UpgradePageContent } from "./content"
import type { ResolvedPlan } from "@/components/pricing/pricing-cards"

function resolvePlanForPricing(
  plan: string,
  trialActive: boolean
): ResolvedPlan {
  if (plan === "pro") return "pro"
  if (plan === "enterprise") return "enterprise"
  if (plan === "starter" && trialActive) return "trial"
  return "starter"
}

export default async function UpgradePage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const planInfo = user ? await getPlanAndTrialFromDb(user.id) : { plan: "starter" as const, trialActive: false, trialDaysLeft: 0 }
  const resolvedPlan = resolvePlanForPricing(planInfo.plan, planInfo.trialActive)

  return (
    <main className="mx-auto max-w-4xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <PageBackLink href="/settings">Back</PageBackLink>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
        Upgrade to Pro
      </h2>
      <p className="text-sm text-muted-foreground mb-10">
        Get more capacity for your teams and longer rotation schedules.
      </p>
      <UpgradePageContent
        resolvedPlan={resolvedPlan}
        userEmail={user?.email ?? undefined}
        userId={user?.id ?? undefined}
      />
    </main>
  )
}
