/**
 * DEV ONLY: Verify share-link resolution for schedules.
 * GET /api/dev/verify-share-link?scheduleId=<id> | ?token=<shareToken>
 *
 * - scheduleId: fetches schedule row, checks hasToken/tokenFormatValid, then resolves by token
 * - token: resolves directly via getPublicScheduleByToken
 *
 * Returns a report indicating whether the share link would work.
 * Never returns real token values; uses hasToken, tokenFormatValid, publicUrlPattern.
 */
import { NextRequest, NextResponse } from "next/server"
import { isDevRouteAllowed } from "@/lib/dev-route-guard"
import { createServiceSupabase } from "@/lib/supabase-server"
import { getPublicScheduleByToken } from "@/lib/public-schedule"

export async function GET(request: NextRequest) {
  if (!isDevRouteAllowed()) {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get("scheduleId")
  const token = searchParams.get("token")

  if (!scheduleId && !token) {
    return NextResponse.json(
      {
        error: "Provide scheduleId or token query param",
        usage: {
          scheduleId: "Verify by schedule UUID (checks DB share_token, then resolves)",
          token: "Verify by share token directly (e.g. from /s/<token> URL)",
        },
      },
      { status: 400 }
    )
  }

  const supabase = createServiceSupabase()
  const report: Record<string, unknown> = {}

  if (scheduleId) {
    const { data: schedule, error } = await supabase
      .from("schedules")
      .select("id, name, team_id, share_token, weeks")
      .eq("id", scheduleId)
      .single()

    if (error) {
      return NextResponse.json({
        ok: false,
        error: "Schedule not found by ID",
        detail: error.message,
      })
    }

    const shareToken = schedule.share_token
    const hasToken = !!(
      shareToken &&
      typeof shareToken === "string" &&
      shareToken.trim() !== ""
    )
    const tokenFormatValid = hasToken && /^[a-f0-9]+$/i.test(shareToken.trim())

    report.scheduleId = schedule.id
    report.scheduleName = schedule.name
    report.teamId = schedule.team_id
    report.hasToken = hasToken
    report.tokenFormatValid = tokenFormatValid
    report.dbWeeksCount = (schedule.weeks ?? 0) as number
    report.publicUrlPattern = "/s/[token]"

    if (!hasToken) {
      return NextResponse.json({
        ok: false,
        report,
        conclusion:
          "Schedule has no valid share_token in DB. Run repair migration: supabase-migration-schedule-share-token-repair.sql",
      })
    }

    const resolved = await getPublicScheduleByToken(shareToken)
    report.resolveByToken = resolved
      ? {
          scheduleName: resolved.scheduleName,
          meetingTitle: resolved.meetingTitle,
          weeksCount: resolved.weeks.length,
        }
      : null

    if (!resolved) {
      return NextResponse.json({
        ok: false,
        report,
        conclusion:
          "getPublicScheduleByToken returned null. Token exists in DB but lookup fails. Check meetings row for team_id.",
      })
    }

    if (resolved.weeks.length === 0) {
      return NextResponse.json({
        ok: false,
        report,
        conclusion:
          "Resolved but weeks.length=0. Public page would show 'Schedule not found' due to !data.weeks.length guard.",
      })
    }

    return NextResponse.json({
      ok: true,
      report,
      conclusion: "Share link would work. Public URL pattern: /s/[token]",
    })
  }

  if (token) {
    const tokenProvided = !!(
      token &&
      typeof token === "string" &&
      token.trim() !== ""
    )
    const tokenFormatValid = tokenProvided && /^[a-f0-9]+$/i.test(token.trim())

    const resolved = await getPublicScheduleByToken(token)
    report.tokenProvided = tokenProvided
    report.tokenFormatValid = tokenFormatValid
    report.publicUrlPattern = "/s/[token]"
    report.resolveResult = resolved
      ? {
          scheduleName: resolved.scheduleName,
          meetingTitle: resolved.meetingTitle,
          weeksCount: resolved.weeks.length,
        }
      : null

    if (!resolved) {
      return NextResponse.json({
        ok: false,
        report,
        conclusion:
          "getPublicScheduleByToken returned null. No schedule matches this token, or meeting not found for team_id.",
      })
    }

    if (resolved.weeks.length === 0) {
      return NextResponse.json({
        ok: false,
        report,
        conclusion:
          "Resolved but weeks.length=0. Public page would show 'Schedule not found'.",
      })
    }

    return NextResponse.json({
      ok: true,
      report,
      conclusion: "Share link would work. Public URL pattern: /s/[token]",
    })
  }

  return NextResponse.json({ ok: false, error: "Unexpected" }, { status: 500 })
}
