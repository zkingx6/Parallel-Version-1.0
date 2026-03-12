import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceSupabase } from "@/lib/supabase-server"

const TYPE_VALUES = ["bug", "idea", "confusing", "love_it", "general"] as const
const SOURCE_VALUES = ["landing_page", "owner_dashboard", "member_dashboard"] as const

type FeedbackType = (typeof TYPE_VALUES)[number]
type FeedbackSource = (typeof SOURCE_VALUES)[number]

function validatePayload(body: unknown): {
  type: FeedbackType
  source: FeedbackSource
  message: string
  email?: string
  userId?: string
  teamId?: string
  pagePath?: string
} | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid payload" }
  }
  const b = body as Record<string, unknown>

  const type = b.type
  if (typeof type !== "string" || !TYPE_VALUES.includes(type as FeedbackType)) {
    return { error: "Invalid type. Must be one of: bug, idea, confusing, love_it, general" }
  }

  const source = b.source
  if (typeof source !== "string" || !SOURCE_VALUES.includes(source as FeedbackSource)) {
    return { error: "Invalid source. Must be one of: landing_page, owner_dashboard, member_dashboard" }
  }

  const message = b.message
  if (typeof message !== "string" || !message.trim()) {
    return { error: "Message is required" }
  }

  const email = b.email
  if (email !== undefined && email !== null && typeof email !== "string") {
    return { error: "Email must be a string if provided" }
  }

  const userId = b.userId
  if (userId !== undefined && userId !== null && typeof userId !== "string") {
    return { error: "userId must be a string if provided" }
  }

  const teamId = b.teamId
  if (teamId !== undefined && teamId !== null && typeof teamId !== "string") {
    return { error: "teamId must be a string if provided" }
  }

  const pagePath = b.pagePath
  if (pagePath !== undefined && pagePath !== null && typeof pagePath !== "string") {
    return { error: "pagePath must be a string if provided" }
  }

  return {
    type: type as FeedbackType,
    source: source as FeedbackSource,
    message: message.trim(),
    email: typeof email === "string" ? email.trim() || undefined : undefined,
    userId: typeof userId === "string" ? userId.trim() || undefined : undefined,
    teamId: typeof teamId === "string" ? teamId.trim() || undefined : undefined,
    pagePath: typeof pagePath === "string" ? pagePath.trim() || undefined : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = validatePayload(body)
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const { type, source, message, email, userId, teamId, pagePath } = validated
    const createdAt = new Date().toISOString()

    const toEmail = process.env.FEEDBACK_TO_EMAIL
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL
    const resendKey = process.env.RESEND_API_KEY

    if (!toEmail || !fromEmail) {
      console.error("[feedback] Missing FEEDBACK_TO_EMAIL or FEEDBACK_FROM_EMAIL")
      return NextResponse.json(
        { error: "Feedback service not configured" },
        { status: 500 }
      )
    }

    if (resendKey) {
      const resend = new Resend(resendKey)
      const subject = `[Parallel Feedback] ${type} from ${source}`
      const textBody = [
        `Type: ${type}`,
        `Source: ${source}`,
        `Message: ${message}`,
        `Email: ${email ?? "(not provided)"}`,
        `UserId: ${userId ?? "(not provided)"}`,
        `TeamId: ${teamId ?? "(not provided)"}`,
        `PagePath: ${pagePath ?? "(not provided)"}`,
        `CreatedAt: ${createdAt}`,
      ].join("\n")

      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject,
        text: textBody,
      })
      if (emailError) {
        console.error("[feedback] Resend error:", emailError)
        return NextResponse.json(
          { error: "Failed to send notification email" },
          { status: 500 }
        )
      }
    } else {
      console.warn("[feedback] RESEND_API_KEY not set, skipping email")
    }

    const supabase = createServiceSupabase()
    const { error: dbError } = await supabase.from("feedback_submissions").insert({
      type,
      source,
      message,
      email: email ?? null,
      user_id: userId ?? null,
      team_id: teamId ?? null,
      page_path: pagePath ?? null,
      created_at: createdAt,
    })

    if (dbError) {
      console.error("[feedback] Supabase insert error:", dbError)
      return NextResponse.json(
        { error: "Failed to store feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[feedback] Unexpected error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
