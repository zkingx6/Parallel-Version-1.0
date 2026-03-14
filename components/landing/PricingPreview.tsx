"use client"

import { useState, useEffect } from "react"
import { PricingCards } from "@/components/pricing/pricing-cards"
import { FeedbackModal } from "@/components/feedback/feedback-modal"
import { createClient } from "@/lib/supabase"

export function PricingPreview() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackDefaultType, setFeedbackDefaultType] = useState<
    "general" | "enterprise_inquiry"
  >("general")
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email) setUserEmail(session.user.email)
      })
      .catch(() => {})
  }, [])

  const handleContactSales = () => {
    setFeedbackDefaultType("enterprise_inquiry")
    setFeedbackOpen(true)
  }

  return (
    <section
      id="pricing"
      className="scroll-mt-24 py-24 px-6 bg-white relative"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e0e0e0] to-transparent" />

      <PricingCards
        mode="marketing"
        onContactSalesClick={handleContactSales}
      />
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="pricing"
        defaultType={feedbackDefaultType}
        defaultEmail={userEmail}
      />
    </section>
  )
}
