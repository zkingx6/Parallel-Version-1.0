import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { resolvePostLoginRedirect } from "@/lib/actions"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next")
  const errorParam = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "email"
    | null

  if (errorParam) {
    console.error("[auth/callback] OAuth error:", errorParam, errorDescription)
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(errorParam)}`
    )
  }

  const supabase = await createServerSupabase()

  if (code) {
    console.log("[auth/callback] Exchanging code for session...")
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message)
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(error.message)}`
      )
    }
    console.log("[auth/callback] Session established successfully")
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  }

  const safeNext =
    nextParam &&
    typeof nextParam === "string" &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")

  const target = safeNext ? nextParam : await resolvePostLoginRedirect()
  const url = target.startsWith("/") ? `${origin}${target}` : `${origin}/teams`
  return NextResponse.redirect(url)
}
