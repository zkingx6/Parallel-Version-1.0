"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { FeedbackModal } from "@/components/feedback/feedback-modal"

export function TermsContactSection() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email) setUserEmail(session.user.email)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        12. Contact
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        If you have questions about these Terms, you may contact:
      </p>
      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        className="text-primary hover:underline font-medium text-left"
      >
        support@parallelflow.app
      </button>

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="terms_page"
        defaultType="general"
        defaultEmail={userEmail}
        pagePath="/terms"
      />
    </section>
  )
}
