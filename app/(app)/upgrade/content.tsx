"use client"

import type { Plan } from "@/lib/plans"
import { PricingCards } from "@/components/pricing/pricing-cards"

export function UpgradePageContent({ currentPlan }: { currentPlan: Plan }) {
  const handleUpgrade = () => {
    // TODO: Stripe checkout integration
  }

  return (
    <PricingCards
      mode="upgrade"
      currentPlan={currentPlan}
      onUpgradeClick={handleUpgrade}
      showBillingToggle={true}
      showHeader={false}
      showOwnerNote={true}
    />
  )
}
