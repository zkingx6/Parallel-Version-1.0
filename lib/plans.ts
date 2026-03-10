/**
 * Central plan config for Parallel MVP feature gating.
 * Phase 1: No Stripe. Plan resolved via profiles.plan or default "starter".
 */

export type Plan = "starter" | "pro"

export const PLAN_LIMITS = {
  starter: {
    maxMembers: 5,
    maxTeams: 2,
    maxRotationWeeks: 4,
  },
  pro: {
    maxMembers: 20,
    maxTeams: Number.POSITIVE_INFINITY,
    maxRotationWeeks: 12,
  },
} as const satisfies Record<Plan, { maxMembers: number; maxTeams: number; maxRotationWeeks: number }>

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan]
}

export function isStarter(plan: Plan): boolean {
  return plan === "starter"
}

export function isPro(plan: Plan): boolean {
  return plan === "pro"
}

/** Pro rotation week options. Starter only allows 4. */
export const PRO_ROTATION_WEEKS = [
  { label: "4 weeks", value: 4 },
  { label: "6 weeks", value: 6 },
  { label: "8 weeks", value: 8 },
  { label: "10 weeks", value: 10 },
  { label: "12 weeks", value: 12 },
] as const

export const STARTER_ROTATION_WEEKS = [{ label: "4 weeks", value: 4 }] as const

/**
 * Resolve effective plan for a user.
 *
 * TEMPORARY: Always returns "starter". Use getEffectivePlanFromDb for server-side
 * lookup from profiles.plan (for manual Pro testing).
 *
 * FUTURE INTEGRATION POINT: Replace with Stripe subscription lookup.
 */
export function getEffectivePlan(_userId: string): Plan {
  return "starter"
}
