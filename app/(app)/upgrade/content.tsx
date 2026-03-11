"use client"

import { useState } from "react"
import type { ResolvedPlan } from "@/components/pricing/pricing-cards"
import { PricingCards } from "@/components/pricing/pricing-cards"

export function UpgradePageContent({ resolvedPlan }: { resolvedPlan: ResolvedPlan }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async (billingInterval: "monthly" | "yearly") => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingInterval }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout")
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <PricingCards
      mode="upgrade"
      resolvedPlan={resolvedPlan}
      onUpgradeClick={loading ? undefined : handleUpgrade}
      showBillingToggle={true}
      showHeader={false}
      showOwnerNote={true}
    />
  )
}
