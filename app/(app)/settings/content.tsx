"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageBackLink } from "@/components/ui/page-back-link"
import { SignOutButton } from "@/components/ui/sign-out-button"
import { ChangePasswordModal } from "@/components/account/change-password-modal"
import { ChangeEmailModal } from "@/components/account/change-email-modal"
import { SignOutConfirmModal } from "@/components/account/sign-out-confirm-modal"
import { updateProfile } from "@/lib/actions"
import type { Plan } from "@/lib/plans"
import type { BillingInfo } from "@/lib/billing"

type SettingsContentProps = {
  userEmail: string
  userName: string
  userAvatar: string
  plan?: Plan
  trialActive?: boolean
  trialDaysLeft?: number
  billing?: BillingInfo | null
}

export function SettingsContent({
  userEmail,
  userName,
  userAvatar,
  plan = "starter",
  trialActive = false,
  trialDaysLeft = 0,
  billing = null,
}: SettingsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [changeEmailOpen, setChangeEmailOpen] = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  const [manageBillingLoading, setManageBillingLoading] = useState(false)
  const [manageBillingError, setManageBillingError] = useState<string | null>(null)

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/teams")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
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
      <PageBackLink onClick={handleBack}>Back</PageBackLink>

      {/* Page title */}
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Account
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground mb-10">
        Manage your profile and billing.
      </p>

      {/* Profile card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Profile</h3>
        {successMessage && (
          <p className="text-sm text-green-600 dark:text-green-500 mb-4">
            {successMessage}
          </p>
        )}
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            {userAvatar?.trim() ? (
              <AvatarImage src={userAvatar} alt="" />
            ) : null}
            <AvatarFallback className="text-base" delayMs={userAvatar?.trim() ? 600 : 0}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {userName || userEmail || "—"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {userEmail || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setSuccessMessage(null)
              setAvatarPreview(null)
              setAvatarRemoved(false)
              setEditOpen(true)
            }}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0 cursor-pointer"
          >
            Edit profile
          </button>
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <form
            id="edit-profile-form"
            encType="multipart/form-data"
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setSaving(true)
              try {
                const fd = new FormData(e.currentTarget)
                if (avatarRemoved) fd.set("removeAvatar", "1")
                const res = await updateProfile(fd)
                if (res.error) {
                  setError(res.error)
                  return
                }
                setEditOpen(false)
                setAvatarPreview(null)
                setAvatarRemoved(false)
                setSuccessMessage("Profile updated.")
                router.refresh()
                setTimeout(() => setSuccessMessage(null), 4000)
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save profile.")
              } finally {
                setSaving(false)
              }
            }}
            className="space-y-4"
          >
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div>
              <label
                htmlFor="edit-display-name"
                className="block text-sm font-medium mb-1.5"
              >
                Display name
              </label>
              <Input
                id="edit-display-name"
                name="displayName"
                defaultValue={userName}
                placeholder="Your name"
                required
                disabled={saving}
                className="w-full"
              />
            </div>
            <div>
              <label
                htmlFor="edit-email-display"
                className="block text-sm font-medium mb-1.5"
              >
                Email
              </label>
              <Input
                id="edit-email-display"
                type="text"
                value={userEmail || "—"}
                readOnly
                className="bg-muted/50 cursor-default"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email is part of your account identity. To change it, use the Security section below.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Avatar
              </label>
              <div className="flex items-center gap-4">
                <Avatar className="size-14 shrink-0">
                  {(avatarPreview || (userAvatar?.trim() && !avatarRemoved)) ? (
                    <AvatarImage
                      src={avatarPreview || userAvatar || ""}
                      alt=""
                    />
                  ) : null}
                  <AvatarFallback className="text-base" delayMs={(avatarPreview || (userAvatar?.trim() && !avatarRemoved)) ? 600 : 0}>
                    {userName ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : userEmail ? userEmail[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Input
                    type="file"
                    name="avatar"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={saving}
                    className="w-full"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setAvatarPreview(URL.createObjectURL(f))
                        setAvatarRemoved(false)
                      } else {
                        setAvatarPreview(null)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF, or WebP. Optional.
                  </p>
                  {(userAvatar?.trim() || avatarPreview) && !avatarRemoved ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setAvatarPreview(null)
                        setAvatarRemoved(true)
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Remove avatar
                    </button>
                  ) : avatarRemoved ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setAvatarRemoved(false)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Undo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Billing card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Billing</h3>
        <div className="space-y-2 mb-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Plan:</span>{" "}
            <span className="font-medium">
              {plan === "starter" ? "Trial" : plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </p>
          {plan === "starter" && trialActive && (
            <p className="text-sm">
              <span className="text-muted-foreground">Trial:</span>{" "}
              <span className="font-medium">{trialDaysLeft} days remaining</span>
            </p>
          )}
          {plan === "starter" && !trialActive && (
            <p className="text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="font-medium">Ended</span>
            </p>
          )}
          {plan === "pro" && (
            <p className="text-sm">
              <span className="text-muted-foreground">Billing:</span>{" "}
              <span className="font-medium">Active</span>
            </p>
          )}
          {plan === "pro" && billing && (
            <>
              {billing.billingAmountCents != null && billing.billingInterval && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-medium">
                    ${(billing.billingAmountCents / 100).toFixed(0)} / {billing.billingInterval}
                  </span>
                </p>
              )}
              {billing.planStartedAt && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Started on:</span>{" "}
                  <span className="font-medium">
                    {new Date(billing.planStartedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
              {billing.currentPeriodEnd && !billing.cancelAtPeriodEnd && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Next renewal:</span>{" "}
                  <span className="font-medium">
                    {new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
              {billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Access until:</span>{" "}
                  <span className="font-medium">
                    {new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
        {manageBillingError && (
          <p className="text-sm text-destructive mb-4">{manageBillingError}</p>
        )}
        {plan === "starter" && (
          <div className="space-y-3">
            {trialActive && trialDaysLeft > 3 && (
              <p className="text-sm text-muted-foreground">
                You are currently on a free trial. Before your trial ends, choose a plan to continue using Parallel.
              </p>
            )}
            {trialActive && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
              <p className="text-sm text-muted-foreground">
                Your free trial will end soon. To continue using Parallel, choose Starter or Pro before the trial ends.
              </p>
            )}
            {(!trialActive || trialDaysLeft <= 0) && (
              <p className="text-sm text-muted-foreground">
                Your free trial has ended. Choose Starter or Pro to continue using Parallel.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/upgrade"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Choose a plan
              </Link>
              <Link
                href="/upgrade"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}
        {plan === "pro" && (
          <button
            type="button"
            disabled={manageBillingLoading || !billing?.stripeCustomerId}
            onClick={async () => {
              setManageBillingError(null)
              setManageBillingLoading(true)
              try {
                const res = await fetch("/api/stripe/create-portal", { method: "POST" })
                const json = await res.json()
                if (!res.ok) {
                  setManageBillingError(json.error ?? "Failed to open billing portal")
                  return
                }
                if (json.url) window.location.href = json.url
              } catch {
                setManageBillingError("Failed to open billing portal")
              } finally {
                setManageBillingLoading(false)
              }
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {manageBillingLoading ? "Opening…" : "Manage billing"}
          </button>
        )}
      </section>

      {/* Security card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Security</h3>
        <div className="space-y-3">
          <div>
            <button
              type="button"
              onClick={() => setChangeEmailOpen(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Change email
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Change password
            </button>
          </div>
          <div>
            <SignOutButton onClick={() => setSignOutConfirmOpen(true)} />
          </div>
        </div>
      </section>

      {/* Support card */}
      <section className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Support</h3>
        <div className="space-y-3">
          <div>
            <a
              href="mailto:support@parallelflow.app?subject=Bug%20Report"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Report a bug
            </a>
          </div>
          <div>
            <a
              href="mailto:support@parallelflow.app?subject=Feedback"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Send feedback
            </a>
          </div>
        </div>
      </section>

      <ChangeEmailModal
        open={changeEmailOpen}
        onOpenChange={setChangeEmailOpen}
        currentEmail={userEmail}
        onSuccess={() => router.refresh()}
      />
      <ChangePasswordModal
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        userEmail={userEmail}
        hasSession={true}
      />
      <SignOutConfirmModal
        open={signOutConfirmOpen}
        onOpenChange={setSignOutConfirmOpen}
        onConfirm={handleSignOut}
      />
    </main>
  )
}
