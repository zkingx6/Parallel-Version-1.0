/**
 * Server-side plan resolution. Reads from profiles.plan for manual Pro testing.
 * Use this instead of getEffectivePlan when you need DB-backed plan.
 */

import { createServiceSupabase } from "./supabase-server"
import type { Plan } from "./plans"

/**
 * Resolve effective plan from profiles.plan. Falls back to "starter" when unset.
 */
export async function getEffectivePlanFromDb(userId: string): Promise<Plan> {
  const supabase = createServiceSupabase()
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle()
  const plan = data?.plan
  if (plan === "pro" || plan === "starter") return plan
  return "starter"
}
