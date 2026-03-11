import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerSupabase } from "@/lib/supabase-server"

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 })
  }
  const stripe = new Stripe(secret)

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let billingInterval: "monthly" | "yearly" = "monthly"
  try {
    const body = await req.json()
    if (body?.billingInterval === "yearly" || body?.billingInterval === "monthly") {
      billingInterval = body.billingInterval
    }
  } catch {
    // Default to monthly when body is missing or invalid
  }

  const priceId =
    billingInterval === "yearly"
      ? process.env.STRIPE_PRO_YEARLY_PRICE_ID
      : process.env.STRIPE_PRO_MONTHLY_PRICE_ID

  if (!priceId) {
    return NextResponse.json(
      {
        error: `Missing ${billingInterval === "yearly" ? "STRIPE_PRO_YEARLY_PRICE_ID" : "STRIPE_PRO_MONTHLY_PRICE_ID"}`,
      },
      { status: 500 }
    )
  }

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  if (baseUrl.includes("localhost")) {
    baseUrl = baseUrl.replace(/^https:/, "http:")
  }
  const successUrl = `${baseUrl}/upgrade?success=1`
  const cancelUrl = `${baseUrl}/upgrade?canceled=1`

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: user.email ?? undefined,
    metadata: { supabase_user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
