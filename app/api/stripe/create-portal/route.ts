import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerSupabase } from "@/lib/supabase-server"

export async function POST() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  const customerId = profile?.stripe_customer_id
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account found. Please upgrade first." },
      { status: 400 }
    )
  }

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  if (baseUrl.includes("localhost")) {
    baseUrl = baseUrl.replace(/^https:/, "http:")
  }
  const returnUrl = `${baseUrl}/settings`

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
