import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { resolvePostLoginRedirect } from "@/lib/actions"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "email"
    | null

  const supabase = await createServerSupabase()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  }

  const target = await resolvePostLoginRedirect()
  const url = target.startsWith("/") ? `${origin}${target}` : `${origin}/dashboard`
  return NextResponse.redirect(url)
}
