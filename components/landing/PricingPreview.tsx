"use client"

import { motion } from "motion/react"
import { PricingCards } from "@/components/pricing/pricing-cards"

export function PricingPreview() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 py-24 px-6 bg-white relative"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e0e0e0] to-transparent" />

      <PricingCards mode="marketing" />
    </section>
  )
}
