"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { submitFeedback, type FeedbackType, type FeedbackSource } from "@/lib/feedback"

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug report" },
  { value: "idea", label: "I have an idea" },
  { value: "confusing", label: "Something's confusing" },
  { value: "love_it", label: "Love it" },
  { value: "general", label: "General feedback" },
  { value: "enterprise_inquiry", label: "Enterprise inquiry" },
]

const MESSAGE_PLACEHOLDERS: Partial<Record<FeedbackType, string>> = {
  enterprise_inquiry:
    "Tell us about your team size and needs. Our team will reach out with Enterprise plan details.",
}

type FeedbackModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: FeedbackSource
  /** Pre-fill type when opened from "Report a bug" or "Send feedback" */
  defaultType?: FeedbackType
  /** Pre-fill email for logged-in users */
  defaultEmail?: string
  /** User ID when logged in */
  userId?: string
  /** Team/meeting ID when in team context */
  teamId?: string
  /** Current page path */
  pagePath?: string
}

export function FeedbackModal({
  open,
  onOpenChange,
  source,
  defaultType = "general",
  defaultEmail = "",
  userId,
  teamId,
  pagePath,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>(defaultType)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState(defaultEmail)

  useEffect(() => {
    if (open) {
      setType(defaultType)
      setEmail(defaultEmail)
    }
  }, [open, defaultType, defaultEmail])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setType(defaultType)
    setMessage("")
    setEmail(defaultEmail)
    setError(null)
    setSuccess(false)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)
    const result = await submitFeedback({
      type,
      source,
      message: message.trim(),
      email: email.trim() || undefined,
      userId,
      teamId,
      pagePath: pagePath ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    })
    setSubmitting(false)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {success ? "Thank you!" : "Send feedback"}
          </DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            Your feedback helps us make Parallel better. We&apos;ll read it carefully.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      type === opt.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={MESSAGE_PLACEHOLDERS[type] ?? "Share your thoughts..."}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !message.trim()}>
                {submitting ? "Sending…" : "Send feedback"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
