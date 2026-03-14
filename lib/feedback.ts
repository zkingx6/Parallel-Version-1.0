/**
 * Shared client helper for submitting feedback to /api/feedback.
 */

export type FeedbackType = "bug" | "idea" | "confusing" | "love_it" | "general" | "enterprise_inquiry"
export type FeedbackSource = "landing_page" | "owner_dashboard" | "member_dashboard" | "privacy_page" | "terms_page" | "footer" | "pricing"

export type SubmitFeedbackPayload = {
  type: FeedbackType
  source: FeedbackSource
  message: string
  email?: string
  userId?: string
  teamId?: string
  pagePath?: string
}

export type SubmitFeedbackResult =
  | { success: true }
  | { success: false; error: string }

export async function submitFeedback(
  payload: SubmitFeedbackPayload
): Promise<SubmitFeedbackResult> {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: (data.error as string) || `Request failed (${res.status})`,
      }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error"
    return { success: false, error: msg }
  }
}
