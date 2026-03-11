/**
 * Plan and trial helpers for Parallel.
 * Plan: starter | pro | enterprise. Trial applies only to Starter.
 */

export type Plan = "starter" | "pro" | "enterprise"

export type TrialStatus = {
  plan: Plan
  trialActive: boolean
  trialDaysLeft: number
}

/**
 * Get trial status for display. Trial only applies to Starter.
 * Normalizes legacy plan="trial" to plan="starter".
 */
export function getTrialStatus(
  plan: string | null,
  trialEndsAt: string | null
): TrialStatus {
  const normalizedPlan =
    plan === "pro" || plan === "enterprise"
      ? plan
      : "starter"

  if (normalizedPlan === "pro" || normalizedPlan === "enterprise") {
    return {
      plan: normalizedPlan,
      trialActive: false,
      trialDaysLeft: 0,
    }
  }

  if (normalizedPlan === "starter" && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    const now = new Date()
    const diff = trialEnd.getTime() - now.getTime()

    if (diff > 0) {
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      return {
        plan: "starter",
        trialActive: true,
        trialDaysLeft: days,
      }
    }
  }

  return {
    plan: "starter",
    trialActive: false,
    trialDaysLeft: 0,
  }
}

/**
 * Resolve effective plan for feature limits.
 * Starter with active trial gets Pro limits.
 */
export function getEffectivePlan(
  plan: string | null,
  trialEndsAt: string | null
): Plan {
  const status = getTrialStatus(plan, trialEndsAt)
  if (status.plan === "pro" || status.plan === "enterprise") return status.plan
  if (status.plan === "starter" && status.trialActive) return "pro"
  return "starter"
}

/**
 * Days remaining in trial. 0 if no trial or expired.
 */
export function getTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
