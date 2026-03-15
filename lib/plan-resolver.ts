import "server-only"
/**
 * Server-side plan resolution. Reads from profiles.plan + trial_ends_at.
 * Uses getTrialStatus for display, getEffectivePlan for feature limits.
 */

import { createServiceSupabase } from "./supabase-server"
import { getEffectivePlan, getTrialStatus } from "./plan"
import type { Plan } from "./plans"

/**
 * Resolve effective plan from profiles (for feature limits).
 * Starter with active trial returns "pro".
 */
export async function getEffectivePlanFromDb(userId: string): Promise<Plan> {
  const supabase = createServiceSupabase()
  const { data } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle()
  const rawPlan = data?.plan as string | null
  const trialEndsAt = data?.trial_ends_at ?? null
  return getEffectivePlan(rawPlan, trialEndsAt) as Plan
}

export type PlanAndTrial = {
  plan: Plan
  trialActive: boolean
  trialDaysLeft: number
}

/**
 * Get plan plus trial status for banner/UI.
 */
export async function getPlanAndTrialFromDb(userId: string): Promise<PlanAndTrial> {
  const supabase = createServiceSupabase()
  const { data } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle()
  const rawPlan = data?.plan as string | null
  const trialEndsAt = data?.trial_ends_at ?? null
  const status = getTrialStatus(rawPlan, trialEndsAt)
  return {
    plan: status.plan,
    trialActive: status.trialActive,
    trialDaysLeft: status.trialDaysLeft,
  }
}
