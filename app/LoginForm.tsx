"use client"

import { useState } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { useActionState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signInAction } from "@/lib/actions"
import { createClient } from "@/lib/supabase/client"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const defaultSignUp = pathname === "/signup" || searchParams?.get("signup") === "1"
  const [isSignUp, setIsSignUp] = useState(defaultSignUp)
  const redirectTo = searchParams?.get("redirect") ?? null
  const urlError = searchParams?.get("error") ?? null

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string | null; signUpSuccess?: boolean } | null, formData: FormData) => {
      if (redirectTo) {
        formData.set("redirectTo", redirectTo)
        if (typeof window !== "undefined") formData.set("redirectOrigin", window.location.origin)
      }
      formData.set("isSignUp", isSignUp ? "1" : "0")
      return signInAction(formData)
    },
    null
  )

  const error = state?.error ?? urlError ?? null
  const signUpSuccess = state?.signUpSuccess ?? false

  const signInWithGoogle = async () => {
    const supabase = createClient()
    const callbackUrl =
      redirectTo && redirectTo.startsWith("/member-dashboard")
        ? `${location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : `${location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
            {isSignUp ? "Start your free trial" : <ParallelWordmark />}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? "Create your Parallel manager account"
              : redirectTo
                ? "Sign in to join the team"
                : "Sign in to manage meetings"}
          </p>
          {isSignUp && (
            <p className="mt-2 text-xs text-muted-foreground/90 max-w-[280px] mx-auto">
              Set up your first team and generate fair meeting rotations in minutes.
            </p>
          )}
          {isSignUp && (
            <p className="mt-3 text-[11px] text-muted-foreground/70 tracking-wide">
              Create account • Add your team • Generate rotation
            </p>
          )}
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-card px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-card px-3.5 py-2.5 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {signUpSuccess && (
            <p className="text-xs text-green-600 dark:text-green-500">
              Check your email for a confirmation link, then sign in.
            </p>
          )}
          {error && (
            <p className="text-xs text-stretch-foreground bg-stretch/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl text-sm font-medium"
          >
            {isPending ? "Working…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
          {isSignUp && (
            <p className="text-center text-[11px] text-muted-foreground/70 mt-2">
              Free 14-day trial • No credit card required
            </p>
          )}
        </form>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">
                OR
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full border border-border/50 rounded-lg h-11 flex items-center justify-center gap-2 hover:bg-muted text-sm font-medium transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline cursor-pointer"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  )
}
