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

type ChangeEmailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEmail: string
  onSuccess?: () => void
}

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
  onSuccess,
}: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setNewEmail("")
    setError(null)
    setSuccess(false)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = newEmail.trim()
    if (!trimmed) {
      setError("Enter a new email address.")
      return
    }
    if (trimmed === currentEmail) {
      setError("New email must be different from your current email.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ email: trimmed })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success ? (
            <p className="text-sm text-green-600 dark:text-green-500">
              A confirmation link has been sent to your new email address. Click it to complete the change.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                A confirmation link will be sent to the new address. Your email will not change until you confirm.
              </p>
              <div>
                <label
                  htmlFor="change-email-new"
                  className="block text-sm font-medium mb-1.5"
                >
                  New email address
                </label>
                <Input
                  id="change-email-new"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  autoComplete="email"
                  className="w-full"
                />
              </div>
            </>
          )}
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              {success ? "Close" : "Cancel"}
            </Button>
            {!success && (
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send confirmation link"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
