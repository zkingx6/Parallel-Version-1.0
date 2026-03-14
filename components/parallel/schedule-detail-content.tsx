"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { Share2, ChevronDown, Link2, Calendar } from "lucide-react"
import {
  DbMeeting,
  DbMemberSubmission,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import { ensureDisplayTimezoneIana } from "@/lib/timezone"
import { getBurdenCounts, hasConsecutiveStretch } from "@/lib/rotation"
import { getDemoBurdenData, DEMO_BURDEN_SUMMARY } from "@/lib/demo-data"
import { RotationOutput } from "./rotation-output"
import { MemberAvatar } from "@/components/ui/avatar"
import { PageBackLink } from "@/components/ui/page-back-link"
import { cn } from "@/lib/utils"
import { getInitials, type RotationWeekData } from "@/lib/types"

function formatUtcForIcs(dateIso: string, utcHour: number): string {
  const d = dateIso.replace(/-/g, "")
  const h = String(utcHour).padStart(2, "0")
  return `${d}T${h}0000Z`
}

function generateIcsContent(
  meetingTitle: string,
  weeks: RotationWeekData[],
  durationMinutes: number
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Parallel//Rotation Schedule//EN",
    "CALSCALE:GREGORIAN",
  ]
  const durationIcs = `PT${Math.floor(durationMinutes / 60)}H${durationMinutes % 60}M`
  for (const w of weeks) {
    const dateIso = w.utcDateIso
    if (!dateIso || dateIso.length < 10) continue
    const start = formatUtcForIcs(dateIso.slice(0, 10), w.utcHour)
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DURATION:${durationIcs}`,
      `SUMMARY:${meetingTitle.replace(/\n/g, " ")}`,
      `DESCRIPTION:Week ${w.week} rotation`,
      "END:VEVENT"
    )
  }
  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

function ShareScheduleDropdown({
  scheduleName,
  meeting,
  weeks,
  shareToken,
}: {
  scheduleName: string
  meeting: DbMeeting
  weeks: RotationWeekData[]
  shareToken: string | undefined
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  const scheduleUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/s/${shareToken}`
      : ""

  const handleCopyLink = async () => {
    if (!scheduleUrl) return
    try {
      await navigator.clipboard.writeText(scheduleUrl)
      setCopied(true)
      setOpen(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleExportIcs = () => {
    const content = generateIcsContent(
      meeting.title,
      weeks,
      meeting.duration_minutes ?? 60
    )
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${scheduleName.replace(/[^a-z0-9]/gi, "_")}.ics`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1a1a2e] text-[0.82rem] border border-[#d1d5db] cursor-pointer font-medium hover:border-[#0d9488] hover:text-[#0d9488] hover:shadow-[0_2px_12px_rgba(13,148,136,0.08)] transition-all shrink-0"
      >
        <Share2 size={14} />
        Share schedule
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 min-w-[180px] rounded-lg border border-[#e8e8e8] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] py-1">
          {shareToken ? (
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[0.88rem] text-[#1a1a2e] hover:bg-[#f5f5f5] cursor-pointer transition-colors"
            >
              <Link2 size={14} className="text-[#9ca3af] shrink-0" />
              {copied ? "Copied!" : "Copy schedule link"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleExportIcs}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[0.88rem] text-[#1a1a2e] hover:bg-[#f5f5f5] cursor-pointer transition-colors"
          >
            <Calendar size={14} className="text-[#9ca3af] shrink-0" />
            Export calendar (.ics)
          </button>
        </div>
      )}
    </div>
  )
}

function BurdenBar({
  name,
  avatarUrl,
  count,
  sacrificeCount,
  sacrificePoints,
  max,
}: {
  name: string
  avatarUrl?: string | null
  count: number
  sacrificeCount: number
  sacrificePoints?: number
  max: number
}) {
  const widthPct = max > 0 ? (count / max) * 100 : 0
  const sacrificePct =
    count > 0 && (sacrificePoints !== undefined ? sacrificePoints : sacrificeCount)
      ? ((sacrificePoints ?? sacrificeCount) / count) * 100
      : 0
  return (
    <div className="flex items-center gap-3">
      <MemberAvatar
        avatarUrl={avatarUrl}
        name={name}
        size="sm"
        className="shrink-0"
      />
      <span className="text-sm w-28 sm:w-36 truncate">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-stretch/80 transition-all duration-500 relative overflow-hidden"
          style={{ width: `${widthPct}%` }}
        >
          {sacrificeCount > 0 && (
            <div
              className="absolute right-0 top-0 bottom-0 bg-stretch-foreground/20 rounded-r-full"
              style={{ width: `${sacrificePct}%` }}
            />
          )}
        </div>
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">
        {count}
      </span>
    </div>
  )
}

export function ScheduleDetailContent({
  scheduleId,
  scheduleName,
  meeting,
  members,
  weeks,
  membersDisplay,
  scheduleBasePath = "/schedule",
  backHref,
  scheduleLinkParams,
  showShareActions = false,
  shareToken,
  demoMode,
  onBack,
  onAnalysisClick,
}: {
  scheduleId: string
  scheduleName: string
  meeting: DbMeeting
  members: DbMemberSubmission[]
  weeks: RotationWeekData[]
  membersDisplay: Map<string, { name: string; avatarUrl: string }>
  /** Base path for schedule links (e.g. /member/schedule for member context). */
  scheduleBasePath?: string
  /** Override "Back to schedules" link (e.g. member dashboard schedule tab). */
  backHref?: string
  /** Query params for schedule links (e.g. token=...&memberId=...) */
  scheduleLinkParams?: string
  /** When true, show Share schedule dropdown (owner only). Members must not see this. */
  showShareActions?: boolean
  /** Share token for public schedule link. Required for Copy schedule link when showShareActions. */
  shareToken?: string
  /** When true, use demo handlers for navigation. */
  demoMode?: boolean
  onBack?: () => void
  onAnalysisClick?: () => void
}) {
  const backLink = backHref ?? scheduleBasePath
  const team = members.map(dbMemberToTeamMember).map((tm) => {
    const display = membersDisplay.get(tm.id)
    const name = display?.name ?? tm.name
    return {
      ...tm,
      name,
      initials: getInitials(name),
      avatar_url: display?.avatarUrl ?? undefined,
    }
  })
  const displayTimezone = ensureDisplayTimezoneIana(
    meeting.display_timezone ?? "America/New_York"
  )
  const useBaseTime = (meeting.base_time_minutes ?? null) != null
  const rotationWeeks = meeting.rotation_weeks ?? weeks.length

  if (!weeks.length) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <PageBackLink href={demoMode ? undefined : backLink} onClick={demoMode ? onBack : undefined} className="mb-6">
            Back to schedules
          </PageBackLink>
          <div className="mb-10">
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
              {scheduleName}
            </h1>
          </div>
          <div className="bg-white rounded-xl border border-[#edeef0] p-8 shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-center space-y-3">
            <p className="text-[0.88rem] text-[#9ca3af]">
              No schedule data available.
            </p>
            <PageBackLink href={demoMode ? undefined : backLink} onClick={demoMode ? onBack : undefined} className="mt-2 mb-0">
              Back to schedules
            </PageBackLink>
          </div>
        </div>
      </main>
    )
  }

  const burdenData = demoMode
    ? getDemoBurdenData(meeting.id, membersDisplay)
    : getBurdenCounts(weeks, team)
  const summaryOverride = demoMode ? DEMO_BURDEN_SUMMARY[meeting.id] : null
  const maxCount = burdenData.length
    ? Math.max(...burdenData.map((d) => d.count), 1)
    : 0
  const maxMemberCount = summaryOverride
    ? summaryOverride.maxUncomfortable
    : burdenData.length
      ? Math.max(...burdenData.map((d) => d.count))
      : 0
  const minMemberCount = burdenData.length
    ? Math.min(...burdenData.map((d) => d.count))
    : 0
  const maxDiff = summaryOverride
    ? summaryOverride.maxDiff
    : maxMemberCount - minMemberCount
  const isEven = maxDiff <= 1
  const consecutive = demoMode ? false : hasConsecutiveStretch(weeks, team)

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <PageBackLink href={demoMode ? undefined : backLink} onClick={demoMode ? onBack : undefined} className="mb-6">
          Back to schedules
        </PageBackLink>
        <div className="mb-10">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-2 font-semibold">
            {scheduleName}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-[#9ca3af] text-[0.88rem]">
              {meeting.title} — time rotates, burden distributed transparently.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {showShareActions && (
                demoMode ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1a1a2e] text-[0.82rem] border border-[#d1d5db] font-medium shrink-0 pointer-events-none select-none opacity-90">
                    <Share2 size={14} />
                    Share schedule
                    <ChevronDown size={14} className="text-[#9ca3af]" />
                  </div>
                ) : (
                  <ShareScheduleDropdown
                    scheduleName={scheduleName}
                    meeting={meeting}
                    weeks={weeks}
                    shareToken={shareToken}
                  />
                )
              )}
              {demoMode && onAnalysisClick ? (
                <button
                  onClick={onAnalysisClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] text-white text-[0.82rem] border-0 cursor-pointer shrink-0 font-medium hover:bg-[#0f766e] hover:shadow-[0_4px_16px_rgba(13,148,136,0.2)] transition-all"
                >
                  Rotation analysis
                </button>
              ) : (
                <Link
                  href={`${scheduleBasePath}/${scheduleId}/analysis${scheduleLinkParams ? `?${scheduleLinkParams}` : ""}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] text-white text-[0.82rem] border-0 shrink-0 font-medium hover:bg-[#0f766e] hover:shadow-[0_4px_16px_rgba(13,148,136,0.2)] transition-all cursor-pointer"
                >
                  Rotation analysis
                </Link>
              )}
            </div>
          </div>
        </div>

      <div className="space-y-10 sm:space-y-12">
        <RotationOutput
          weeks={weeks}
          team={team}
          displayTimezone={displayTimezone}
          useBaseTime={useBaseTime}
        />

        <section className="rounded-2xl border border-[#edeef0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Over {rotationWeeks} weeks
            </h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">·</span>
                No one has more than {maxMemberCount} uncomfortable{" "}
                {maxMemberCount === 1 ? "meeting" : "meetings"}
              </li>
              <li className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5",
                    isEven ? "text-primary" : "text-stretch-foreground"
                  )}
                >
                  ·
                </span>
                {isEven
                  ? "Burden is evenly distributed across the team"
                  : `Burden differs by at most ${maxDiff} between members`}
              </li>
              {!consecutive && (
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">·</span>
                  No one carries consecutive stretch weeks
                </li>
              )}
            </ul>
          </div>
          {burdenData && (
            <div className="space-y-2.5 pt-1">
              {burdenData.map((d) => (
                <BurdenBar
                  key={d.memberId}
                  name={d.name}
                  avatarUrl={membersDisplay.get(d.memberId)?.avatarUrl}
                  count={d.count}
                  sacrificeCount={d.sacrificeCount}
                  sacrificePoints={d.sacrificePoints}
                  max={maxCount * 1.2}
                />
              ))}
            </div>
          )}
        </section>

        <div className="pt-4">
          <PageBackLink href={demoMode ? undefined : backLink} onClick={demoMode ? onBack : undefined} className="mb-0">
            Back to schedules
          </PageBackLink>
        </div>
      </div>
      </div>
    </main>
  )
}
