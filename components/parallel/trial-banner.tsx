"use client"

import { useState } from "react"
import Link from "next/link"
import type { Plan } from "@/lib/plans"

type TrialBannerProps = {
  plan: Plan
  trialActive: boolean
  trialDaysLeft: number
}

export function TrialBanner({ plan, trialActive, trialDaysLeft }: TrialBannerProps) {
  const [loading, setLoading] = useState(false)

  if (plan === "pro" || plan === "enterprise") return null

  const trialExpired = !trialActive

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout")
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-3">
      <div className="rounded-xl border border-[#0d9488]/30 bg-[#0d9488]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#1a1a2e]">
          {trialExpired ? (
            <div>
              <p>Your Starter trial has ended.</p>
              <p className="mt-1 text-muted-foreground">
                Upgrade to Pro to unlock larger teams and longer rotations.
              </p>
            </div>
          ) : (
            <>Starter trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining</>
          )}
        </div>
        {trialExpired ? (
          <Link
            href="/upgrade"
            className="inline-flex items-center justify-center rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d9488]/90 cursor-pointer transition-colors"
          >
            Upgrade to Pro
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d9488]/90 cursor-pointer transition-colors disabled:opacity-60"
          >
            {loading ? "Redirecting…" : "Upgrade to Pro"}
          </button>
        )}
      </div>
    </div>
  )
}
