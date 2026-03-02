"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type SettingsContentProps = {
  userEmail: string
  userName: string
  userAvatar: string
}

export function SettingsContent({
  userEmail,
  userName,
  userAvatar,
}: SettingsContentProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/meetings")
    }
  }

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return
    await supabase.auth.signOut()
    router.push("/auth")
    router.refresh()
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : "?"

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      {/* Back row */}
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <span aria-hidden>←</span>
        Back
      </button>

      {/* Page title */}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Account
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground mb-10">
        Manage your profile, billing, and setup.
      </p>

      {/* Profile card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Profile</h3>
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt="" />
            ) : null}
            <AvatarFallback className="text-base">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {userName || userEmail || "—"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {userEmail || "—"}
            </p>
          </div>
          <Link
            href="/settings/profile"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            Edit profile
          </Link>
        </div>
      </section>

      {/* Billing card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Billing</h3>
        <div className="space-y-2 mb-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Plan:</span>{" "}
            <span className="font-medium">Starter</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="font-medium">Active</span>
          </p>
        </div>
        <Link
          href="/settings/billing"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Manage billing
        </Link>
      </section>

      {/* Setup card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Setup</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Setup progress: timezone → availability → invite
        </p>
        <Link
          href="/settings/setup"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Continue setup
        </Link>
      </section>

      {/* Divider + Sign out */}
      <hr className="border-border/40 my-8" />
      <div>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
