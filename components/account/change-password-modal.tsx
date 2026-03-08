"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase"

type ChangePasswordModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
  /** When true, user has active session (owner). When false, use reset-email flow (member without session). */
  hasSession: boolean
  onSuccess?: () => void
}

export function ChangePasswordModal({
  open,
  onOpenChange,
  userEmail,
  hasSession,
  onSuccess,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const reset = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
    setResetEmailSent(false)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleForgotPassword = async () => {
    if (!userEmail) {
      setError("No email on file. Contact your team owner.")
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setResetEmailSent(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!hasSession) {
      await handleForgotPassword()
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    if (!currentPassword) {
      setError("Current password is required.")
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })
    if (signInError) {
      setLoading(false)
      setError("Current password is incorrect.")
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    reset()
    handleClose(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {resetEmailSent ? (
            <p className="text-sm text-green-600 dark:text-green-500">
              Check your email for the password reset link.
            </p>
          ) : hasSession ? (
            <>
              <div>
                <label
                  htmlFor="change-pw-current"
                  className="block text-sm font-medium mb-1.5"
                >
                  Current password
                </label>
                <Input
                  id="change-pw-current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="change-pw-new"
                  className="block text-sm font-medium mb-1.5"
                >
                  New password
                </label>
                <Input
                  id="change-pw-new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="change-pw-confirm"
                  className="block text-sm font-medium mb-1.5"
                >
                  Confirm new password
                </label>
                <Input
                  id="change-pw-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                We&apos;ll send a password reset link to your email.
              </p>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Send password reset email
              </button>
            </>
          )}
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              {resetEmailSent ? "Close" : "Cancel"}
            </Button>
            {!resetEmailSent && (
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : hasSession ? "Update password" : "Send reset email"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
