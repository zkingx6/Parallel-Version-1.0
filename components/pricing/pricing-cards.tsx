"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { Check } from "lucide-react"
import type { Plan as AppPlan } from "@/lib/plans"

/** Resolved plan for pricing UI. trial = on free trial; starter = paid Starter; pro = paid Pro; enterprise = paid Enterprise. */
export type ResolvedPlan = "trial" | "starter" | "pro" | "enterprise"

export type PricingPlan = {
  name: string
  subtitle: string
  priceMonthly: string
  priceYearly: string
  badge: string | null
  highlight: boolean
  trialNote: string | null
  features: string[]
  cta: string
  ctaHref: string | null
  ctaNote: string | null
  ctaStyle: "outline" | "filled"
  ctaDisabled?: boolean
}

const basePlans: PricingPlan[] = [
  {
    name: "Starter",
    subtitle: "Perfect for small distributed teams",
    priceMonthly: "$13",
    priceYearly: "$9",
    badge: null,
    highlight: false,
    trialNote: "14-day free trial",
    features: [
      "Up to 5 team members",
      "Generate rotations up to 4 weeks",
      "Up to 2 active teams",
      "Rotation analysis",
      "Export rotations to your calendar (.ics)",
    ],
    cta: "Start free",
    ctaHref: "/signup",
    ctaNote: "No credit card required",
    ctaStyle: "outline",
  },
  {
    name: "Pro",
    subtitle: "For growing distributed teams",
    priceMonthly: "$39",
    priceYearly: "$31",
    badge: "Most popular",
    highlight: true,
    trialNote: null,
    features: [
      "Up to 20 team members",
      "Generate rotations up to 12 weeks",
      "Unlimited teams",
      "Advanced rotation analysis",
      "Priority support",
      "Everything in Starter",
    ],
    cta: "Choose Pro",
    ctaHref: "/signup",
    ctaNote: null,
    ctaStyle: "filled",
  },
  {
    name: "Enterprise",
    subtitle: "For large organizations",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    badge: null,
    highlight: false,
    trialNote: null,
    features: [
      "Unlimited team members",
      "Unlimited rotation planning",
      "API access",
      "Enterprise security",
      "Dedicated support",
    ],
    cta: "Contact sales",
    ctaHref: null,
    ctaNote: null,
    ctaStyle: "outline",
  },
]

function getPlansForMode(
  mode: "marketing" | "upgrade",
  resolvedPlan: ResolvedPlan
): PricingPlan[] {
  if (mode === "marketing") return basePlans

  return basePlans.map((p) => {
    if (p.name === "Starter") {
      const isCurrent = resolvedPlan === "trial" || resolvedPlan === "starter"
      const isProUser = resolvedPlan === "pro"
      const isEnterprise = resolvedPlan === "enterprise"
      return {
        ...p,
        badge: isCurrent ? "Your current plan" : null,
        cta: isCurrent ? "Current plan" : isProUser ? "Downgrade to Starter" : "Starter",
        ctaHref: null,
        ctaNote: null,
        ctaStyle: "outline",
        ctaDisabled: isCurrent || isProUser || isEnterprise,
      }
    }
    if (p.name === "Pro") {
      const isCurrent = resolvedPlan === "pro"
      const isEnterprise = resolvedPlan === "enterprise"
      return {
        ...p,
        badge: isCurrent ? "Your current plan" : null,
        cta: isCurrent ? "Current plan" : "Upgrade to Pro",
        ctaHref: null,
        ctaNote: null,
        ctaStyle: isCurrent ? "outline" : "filled",
        ctaDisabled: isCurrent || isEnterprise,
      }
    }
    if (p.name === "Enterprise") {
      const isCurrent = resolvedPlan === "enterprise"
      return {
        ...p,
        badge: isCurrent ? "Your current plan" : null,
        cta: isCurrent ? "Current plan" : "Contact sales",
        ctaHref: null,
        ctaNote: null,
        ctaStyle: "outline",
        ctaDisabled: isCurrent,
      }
    }
    return p
  })
}

function PricingCard({
  plan,
  index,
  isYearly,
  onUpgradeClick,
}: {
  plan: PricingPlan
  index: number
  isYearly: boolean
  onUpgradeClick?: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  const renderCta = () => {
    const baseButtonClass =
      "block w-full py-3 rounded-xl text-[0.92rem] border-0 text-center"
    const filledClass =
      "text-white cursor-pointer"
    const isStarterPrimaryCta =
      plan.name === "Starter" && plan.cta === "Start free"
    const outlineClass = isStarterPrimaryCta
      ? "bg-white text-emerald-600 border border-emerald-200 cursor-pointer transition-colors duration-200 hover:border-emerald-400 hover:bg-emerald-50"
      : "bg-white text-[#1a1a2e] border border-[#d1d5db] cursor-pointer"

    if (plan.ctaDisabled) {
      return (
        <span
          className={`${baseButtonClass} ${outlineClass} opacity-60 cursor-not-allowed pointer-events-none`}
          style={{ fontWeight: 500 }}
        >
          {plan.cta}
        </span>
      )
    }

    if (plan.ctaHref && !plan.ctaDisabled) {
      return plan.ctaStyle === "filled" ? (
        <Link href={plan.ctaHref}>
          <motion.span
            className={`${baseButtonClass} ${filledClass}`}
            style={{
              fontWeight: 500,
              backgroundColor: "#0d9488",
            }}
            whileHover={{
              backgroundColor: "#0f766e",
              boxShadow: "0 4px 16px rgba(13, 148, 136, 0.25)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {plan.cta}
          </motion.span>
        </Link>
      ) : (
        <Link href={plan.ctaHref}>
          <motion.span
            className={`${baseButtonClass} ${outlineClass}`}
            style={{ fontWeight: 500 }}
            whileHover={
              isStarterPrimaryCta
                ? {
                    borderColor: "#34d399",
                    backgroundColor: "#ecfdf5",
                  }
                : {
                    borderColor: "#0d9488",
                    color: "#0d9488",
                    boxShadow: "0 2px 12px rgba(13, 148, 136, 0.08)",
                  }
            }
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {plan.cta}
          </motion.span>
        </Link>
      )
    }

    return plan.ctaStyle === "filled" ? (
      <motion.button
        type="button"
        onClick={onUpgradeClick}
        className={`${baseButtonClass} ${filledClass}`}
        style={{
          fontWeight: 500,
          backgroundColor: "#0d9488",
        }}
        whileHover={{
          backgroundColor: "#0f766e",
          boxShadow: "0 4px 16px rgba(13, 148, 136, 0.25)",
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {plan.cta}
      </motion.button>
    ) : (
      <motion.button
        type="button"
        onClick={
          plan.cta === "Contact sales"
            ? () => window.open("mailto:sales@parallel.app", "_blank")
            : undefined
        }
        className={`${baseButtonClass} ${outlineClass}`}
        style={{ fontWeight: 500 }}
        whileHover={{
          borderColor: "#0d9488",
          color: "#0d9488",
          boxShadow: "0 2px 12px rgba(13, 148, 136, 0.08)",
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {plan.cta}
      </motion.button>
    )
  }

  return (
    <motion.div
      className="relative flex flex-col h-full"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.1 }}
    >
      {plan.badge && (
        <motion.div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <motion.span
            className="bg-[#0d9488] text-white text-xs px-4 py-1.5 rounded-full whitespace-nowrap"
            style={{ fontWeight: 500 }}
            animate={{
              boxShadow: isHovered
                ? "0 0 0 5px rgba(13,148,136,0.12)"
                : "0 0 0 0px rgba(13,148,136,0)",
            }}
            transition={{ duration: 0.35 }}
          >
            {plan.badge}
          </motion.span>
        </motion.div>
      )}

      <motion.div
        className={`bg-white rounded-2xl p-7 flex-1 flex flex-col border ${
          plan.highlight
            ? "border-[#b2dfdb] shadow-[0_2px_12px_rgba(13,148,136,0.06)]"
            : "border-[#e8e8e8] shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          borderColor: isHovered
            ? plan.highlight
              ? "#0d9488"
              : "#b2dfdb"
            : plan.highlight
            ? "#b2dfdb"
            : "#e8e8e8",
          boxShadow: isHovered
            ? "0 12px 40px rgba(13, 148, 136, 0.10)"
            : plan.highlight
            ? "0 2px 12px rgba(13, 148, 136, 0.06)"
            : "0 1px 4px rgba(0, 0, 0, 0.04)",
          y: isHovered ? -6 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-5">
          <h3
            className="text-[#1a1a2e] text-[1.15rem] mb-1"
            style={{ fontWeight: 600 }}
          >
            {plan.name}
          </h3>
          <p className="text-[#9ca3af] text-[0.85rem]">{plan.subtitle}</p>
        </div>

        <div className="mb-1 flex items-baseline gap-1 flex-wrap">
          <span
            className="text-[#1a1a2e] text-[2.25rem] tracking-[-0.03em]"
            style={{ fontWeight: 700 }}
          >
            {isYearly ? plan.priceYearly : plan.priceMonthly}
          </span>
          {plan.priceMonthly !== "Custom" && (
            <span className="text-[#9ca3af] text-[0.88rem]">
              / month
              {isYearly && (
                <span className="text-[#9ca3af]/90"> (billed yearly)</span>
              )}
            </span>
          )}
        </div>

        {plan.trialNote && (
          <motion.span
            className="text-[#0d9488] text-[0.82rem] mb-5 block"
            style={{ fontWeight: 500 }}
            animate={{
              opacity: isHovered ? 1 : 0.85,
            }}
          >
            {plan.trialNote}
          </motion.span>
        )}
        {!plan.trialNote && <div className="mb-5" />}

        <div className="h-px bg-[#f0f0f0] mb-5" />

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, i) => (
            <motion.li
              key={feature}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.25 + index * 0.08 + i * 0.04,
                duration: 0.3,
              }}
            >
              <Check
                size={16}
                className="text-[#0d9488] shrink-0 mt-[3px]"
                strokeWidth={2.5}
              />
              <span className="text-[#4b5563] text-[0.88rem] leading-snug">
                {feature}
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-auto">
          {renderCta()}
          {plan.ctaNote && (
            <p className="text-[#9ca3af] text-[0.78rem] text-center mt-2.5">
              {plan.ctaNote}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export type PricingCardsProps = {
  mode: "marketing" | "upgrade"
  /** Resolved plan for pricing UI: trial | starter | pro | enterprise. All cards use this single value. */
  resolvedPlan?: ResolvedPlan
  /** @deprecated Use resolvedPlan. Kept for backward compatibility with marketing mode. */
  currentPlan?: AppPlan
  onUpgradeClick?: () => void
  showBillingToggle?: boolean
  showHeader?: boolean
  showOwnerNote?: boolean
}

export function PricingCards({
  mode,
  resolvedPlan: resolvedPlanProp,
  currentPlan = "starter",
  onUpgradeClick,
  showBillingToggle = true,
  showHeader = true,
  showOwnerNote = true,
}: PricingCardsProps) {
  const [isYearly, setIsYearly] = useState(false)
  const resolvedPlan: ResolvedPlan =
    resolvedPlanProp ??
    (currentPlan === "pro"
      ? "pro"
      : currentPlan === "enterprise"
        ? "enterprise"
        : "starter")
  const plans = getPlansForMode(mode, resolvedPlan)

  return (
    <div className="max-w-4xl mx-auto">
      {showHeader && (
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[#0d9488] text-sm tracking-widest uppercase mb-4 block font-semibold">
            Pricing
          </span>
          <h2 className="text-[2.25rem] tracking-[-0.03em] text-[#1a1a2e] mb-5 max-w-2xl mx-auto leading-[1.15] mt-4">
            Simple pricing for distributed teams
          </h2>
          <p className="text-[#6b7280] max-w-lg mx-auto text-[1.02rem] leading-relaxed">
            Start free. Upgrade when your team grows.
          </p>
        </motion.div>
      )}

      {showBillingToggle && (
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-[#f5f5f5] border border-[#e8e8e8]">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 rounded-lg text-[0.88rem] font-medium transition-all cursor-pointer ${
                !isYearly
                  ? "bg-white text-[#1a1a2e] shadow-sm border border-[#e0e0e0]"
                  : "text-[#6b7280] hover:text-[#1a1a2e]"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 rounded-lg text-[0.88rem] font-medium transition-all cursor-pointer flex items-center gap-2 ${
                isYearly
                  ? "bg-white text-[#1a1a2e] shadow-sm border border-[#e0e0e0]"
                  : "text-[#6b7280] hover:text-[#1a1a2e]"
              }`}
            >
              Yearly
              <span className="text-[0.75rem] text-[#0d9488] font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {plans.map((plan, i) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            index={i}
            isYearly={isYearly}
            onUpgradeClick={
              plan.name === "Pro" && mode === "upgrade" ? onUpgradeClick : undefined
            }
          />
        ))}
      </div>

      {showOwnerNote && (
        <motion.p
          className="text-center text-chart-1 text-[0.88rem] font-semibold mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          One owner pays. Invite your team for free.
        </motion.p>
      )}
    </div>
  )
}
