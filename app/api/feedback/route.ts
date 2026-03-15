import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceSupabase } from "@/lib/supabase-server"
import { type FeedbackType, type FeedbackSource } from "@/lib/feedback"

const TYPE_VALUES = ["bug", "idea", "confusing", "love_it", "general", "enterprise_inquiry"] as const
const SOURCE_VALUES = ["landing_page", "owner_dashboard", "member_dashboard", "privacy_page", "terms_page", "footer", "pricing"] as const

const MAX_MESSAGE_LENGTH = 5000
const MAX_EMAIL_LENGTH = 500
const MAX_PAGE_PATH_LENGTH = 500
const MAX_USER_ID_LENGTH = 100
const MAX_TEAM_ID_LENGTH = 100
const MAX_PAYLOAD_BYTES = 50 * 1024

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const client = forwarded.split(",")[0]?.trim()
    if (client) return client
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k)
    }
  }
  const entry = rateLimitMap.get(key)
  if (!entry) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false
  entry.count++
  return true
}

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
    return { error: "Invalid type. Must be one of: bug, idea, confusing, love_it, general, enterprise_inquiry" }
  }

  const source = b.source
  if (typeof source !== "string" || !SOURCE_VALUES.includes(source as FeedbackSource)) {
    return { error: "Invalid source. Must be one of: landing_page, owner_dashboard, member_dashboard, privacy_page, terms_page, footer, pricing" }
  }

  const message = b.message
  if (typeof message !== "string" || !message.trim()) {
    return { error: "Message is required" }
  }
  const trimmedMessage = message.trim()
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` }
  }

  const email = b.email
  if (email !== undefined && email !== null && typeof email !== "string") {
    return { error: "Email must be a string if provided" }
  }
  const trimmedEmail = typeof email === "string" ? email.trim() || undefined : undefined
  if (trimmedEmail && trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return { error: `Email must be at most ${MAX_EMAIL_LENGTH} characters` }
  }

  const userId = b.userId
  if (userId !== undefined && userId !== null && typeof userId !== "string") {
    return { error: "userId must be a string if provided" }
  }
  const trimmedUserId = typeof userId === "string" ? userId.trim() || undefined : undefined
  if (trimmedUserId && trimmedUserId.length > MAX_USER_ID_LENGTH) {
    return { error: "userId too long" }
  }

  const teamId = b.teamId
  if (teamId !== undefined && teamId !== null && typeof teamId !== "string") {
    return { error: "teamId must be a string if provided" }
  }
  const trimmedTeamId = typeof teamId === "string" ? teamId.trim() || undefined : undefined
  if (trimmedTeamId && trimmedTeamId.length > MAX_TEAM_ID_LENGTH) {
    return { error: "teamId too long" }
  }

  const pagePath = b.pagePath
  if (pagePath !== undefined && pagePath !== null && typeof pagePath !== "string") {
    return { error: "pagePath must be a string if provided" }
  }
  const trimmedPagePath = typeof pagePath === "string" ? pagePath.trim() || undefined : undefined
  if (trimmedPagePath && trimmedPagePath.length > MAX_PAGE_PATH_LENGTH) {
    return { error: "pagePath too long" }
  }

  return {
    type: type as FeedbackType,
    source: source as FeedbackSource,
    message: trimmedMessage,
    email: trimmedEmail,
    userId: trimmedUserId,
    teamId: trimmedTeamId,
    pagePath: trimmedPagePath,
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }

    const ip = getClientIp(request)
    const rateLimitKey = `feedback:${ip}`
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

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
        return NextResponse.json(
          { error: "Failed to send notification" },
          { status: 500 }
        )
      }
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
      return NextResponse.json(
        { error: "Failed to store feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
