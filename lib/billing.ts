/**
 * Billing metadata for Pro users. Fetched from profiles.
 */

import "server-only"
import Stripe from "stripe"
import { createServiceSupabase } from "./supabase-server"

export type BillingInfo = {
  stripeCustomerId: string | null
  billingInterval: "monthly" | "yearly" | null
  billingAmountCents: number | null
  billingStatus: string | null
  currentPeriodEnd: string | null
  planStartedAt: string | null
  cancelAtPeriodEnd: boolean
}

export async function getBillingForUser(userId: string): Promise<BillingInfo | null> {
  const supabase = createServiceSupabase()
  const { data } = await supabase
    .from("profiles")
    .select(
      "stripe_customer_id, billing_interval, billing_amount_cents, billing_status, current_period_end, plan_started_at, cancel_at_period_end"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (!data) return null
  return {
    stripeCustomerId: data.stripe_customer_id ?? null,
    billingInterval: (data.billing_interval as "monthly" | "yearly") ?? null,
    billingAmountCents: data.billing_amount_cents ?? null,
    billingStatus: data.billing_status ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    planStartedAt: data.plan_started_at ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  }
}

/**
 * Backfill billing metadata for Pro users who upgraded before the expanded webhook.
 * Uses email to find Stripe customer and active subscription, then writes to profiles.
 * Safe to call when stripe_customer_id is already set (no-op).
 */
export async function syncBillingFromStripe(
  userId: string,
  email: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!email?.trim()) {
    return { ok: false, error: "Email required to sync billing" }
  }

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    return { ok: false, error: "Missing STRIPE_SECRET_KEY" }
  }

  const supabase = createServiceSupabase()
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id")
    .eq("user_id", userId)
    .single()

  if (!profile || profile.plan !== "pro") {
    return { ok: false, error: "User is not Pro" }
  }
  if (profile.stripe_customer_id) {
    return { ok: true }
  }

  const stripe = new Stripe(secret)
  const customers = await stripe.customers.list({ email: email.trim(), limit: 1 })
  const customer = customers.data[0]
  if (!customer) {
    return { ok: false, error: "No Stripe customer found for this email" }
  }

  const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 10 })
  const sub = subs.data.find((s) => s.status === "active" || s.status === "trialing")
  if (!sub) {
    return { ok: false, error: "No active subscription found" }
  }

  const expanded = await stripe.subscriptions.retrieve(sub.id, {
    expand: ["items.data.price"],
  })
  const item = expanded.items.data[0]
  const price = item?.price
  const interval = price?.recurring?.interval ?? "month"
  const amountCents = price?.unit_amount ?? 0
  const billingInterval = interval === "year" ? "yearly" : "monthly"
  const billingStatus =
    expanded.cancel_at_period_end
      ? "cancel_at_period_end"
      : expanded.status === "active"
        ? "active"
        : (expanded.status as string)

  const periodEnd = (expanded as { current_period_end?: number }).current_period_end
  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customer.id,
      stripe_subscription_id: expanded.id,
      billing_interval: billingInterval,
      billing_amount_cents: amountCents,
      billing_status: billingStatus,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      plan_started_at: expanded.created
        ? new Date(expanded.created * 1000).toISOString()
        : null,
      cancel_at_period_end: expanded.cancel_at_period_end ?? false,
    })
    .eq("user_id", userId)

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
