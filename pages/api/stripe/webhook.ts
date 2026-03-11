import type { NextApiRequest, NextApiResponse } from "next"
import { buffer } from "node:stream/consumers"
import Stripe from "stripe"
import { createServiceSupabase } from "@/lib/supabase-server"

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !webhookSecret) {
    return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" })
  }

  const stripe = new Stripe(secret)
  const buf = await buffer(req)
  const signature = req.headers["stripe-signature"]
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "Missing stripe-signature header" })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, signature, webhookSecret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(400).json({ error: `Invalid signature: ${msg}` })
  }

  const supabase = createServiceSupabase()

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.supabase_user_id
    if (!userId) {
      return res.status(400).json({ error: "Missing user in metadata" })
    }

    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
    if (!customerId || !subscriptionId) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ plan: "pro", trial_ends_at: null })
        .eq("user_id", userId)
      if (updateError) return res.status(500).json({ error: updateError.message })
      return res.status(200).json({ received: true })
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    })
    const item = subscription.items.data[0]
    const price = item?.price
    const interval = price?.recurring?.interval ?? "month"
    const amountCents = price?.unit_amount ?? 0
    const billingInterval = interval === "year" ? "yearly" : "monthly"
    const billingStatus = subscription.cancel_at_period_end ? "cancel_at_period_end" : subscription.status === "active" ? "active" : (subscription.status as string)

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: "pro",
        trial_ends_at: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        billing_interval: billingInterval,
        billing_amount_cents: amountCents,
        billing_status: billingStatus,
        current_period_end: (() => {
          const end = (subscription as { current_period_end?: number }).current_period_end
          return end ? new Date(end * 1000).toISOString() : null
        })(),
        plan_started_at: subscription.created
          ? new Date(subscription.created * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      })
      .eq("user_id", userId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ received: true })
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const subscriptionId = subscription.id

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .limit(1)

    if (!profiles?.length) {
      return res.status(200).json({ received: true })
    }
    const userId = profiles[0].user_id

    if (event.type === "customer.subscription.deleted") {
      const { error } = await supabase
        .from("profiles")
        .update({
          plan: "starter",
          stripe_subscription_id: null,
          billing_interval: null,
          billing_amount_cents: null,
          billing_status: "canceled",
          current_period_end: null,
          plan_started_at: null,
          cancel_at_period_end: false,
        })
        .eq("user_id", userId)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ received: true })
    }

    const item = subscription.items.data[0]
    const price = item?.price
    const interval = price?.recurring?.interval ?? "month"
    const amountCents = price?.unit_amount ?? 0
    const billingInterval = interval === "year" ? "yearly" : "monthly"
    const billingStatus =
      subscription.cancel_at_period_end ? "cancel_at_period_end" : subscription.status === "active" ? "active" : (subscription.status as string)

    const { error } = await supabase
      .from("profiles")
      .update({
        billing_interval: billingInterval,
        billing_amount_cents: amountCents,
        billing_status: billingStatus,
        current_period_end: (() => {
          const end = (subscription as { current_period_end?: number }).current_period_end
          return end ? new Date(end * 1000).toISOString() : null
        })(),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      })
      .eq("user_id", userId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ received: true })
  }

  return res.status(200).json({ received: true })
}
