"use client"

import { useState } from "react"
import type { ResolvedPlan } from "@/components/pricing/pricing-cards"
import { PricingCards } from "@/components/pricing/pricing-cards"
import { FeedbackModal } from "@/components/feedback/feedback-modal"

export function UpgradePageContent({
  resolvedPlan,
  userEmail,
  userId,
}: {
  resolvedPlan: ResolvedPlan
  userEmail?: string
  userId?: string
}) {
  const [loading, setLoading] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackDefaultType, setFeedbackDefaultType] = useState<
    "general" | "enterprise_inquiry"
  >("general")

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

  const handleContactSales = () => {
    setFeedbackDefaultType("enterprise_inquiry")
    setFeedbackOpen(true)
  }

  return (
    <>
      <PricingCards
        mode="upgrade"
        resolvedPlan={resolvedPlan}
        onUpgradeClick={loading ? undefined : handleUpgrade}
        onContactSalesClick={handleContactSales}
        showBillingToggle={true}
        showHeader={false}
        showOwnerNote={true}
      />
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="pricing"
        defaultType={feedbackDefaultType}
        defaultEmail={userEmail ?? ""}
        userId={userId}
      />
    </>
  )
}
