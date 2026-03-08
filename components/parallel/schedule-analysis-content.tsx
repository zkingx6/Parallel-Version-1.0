"use client"

import Link from "next/link"
import {
  CalendarCheck,
  ShieldCheck,
  RotateCw,
  Scale,
  CheckCircle2,
} from "lucide-react"
import {
  DbMemberSubmission,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import { getBurdenCounts, hasConsecutiveStretch } from "@/lib/rotation"
import type { RotationWeekData } from "@/lib/types"
import { formatHourLabel } from "@/lib/types"
import { MemberAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  convertUtcToLocal,
  ensureDisplayTimezoneIana,
  getIanaShortLabel,
} from "@/lib/timezone"

type ExplainData = {
  shareablePlanExists?: boolean
  forcedSummary?: string
  forcedReason?: string
} | undefined

export function ScheduleAnalysisContent({
  scheduleId,
  scheduleName,
  teamName,
  weeksCount,
  modeLabel,
  explain,
  members,
  weeks,
  membersDisplay,
  scheduleBasePath,
  scheduleLinkParams,
  embedded,
  displayTimezone: displayTimezoneProp,
}: {
  scheduleId: string
  scheduleName: string
  teamName: string
  weeksCount: number
  modeLabel: string
  explain: ExplainData
  members: DbMemberSubmission[]
  weeks: RotationWeekData[]
  membersDisplay: Map<string, { name: string; avatarUrl: string }>
  scheduleBasePath?: string
  scheduleLinkParams?: string
  embedded?: boolean
  displayTimezone?: string
}) {
  const scheduleBasePathResolved = scheduleBasePath ?? "/schedule"
  const scheduleLinkSuffix = scheduleLinkParams ? `?${scheduleLinkParams}` : ""
  const displayTimezone = ensureDisplayTimezoneIana(
    displayTimezoneProp ?? "America/New_York"
  )

  const team = members.map((m) => {
    const base = dbMemberToTeamMember(m)
    const resolved = membersDisplay.get(m.id)
    return {
      ...base,
      name: resolved?.name ?? base.name,
      avatar_url: resolved?.avatarUrl ?? base.avatar_url,
    }
  })
  const burdenData = weeks.length ? getBurdenCounts(weeks, team) : []
  const maxMemberCount = burdenData.length
    ? Math.max(...burdenData.map((d) => d.count))
    : 0
  const minMemberCount = burdenData.length
    ? Math.min(...burdenData.map((d) => d.count))
    : 0
  const spread = maxMemberCount - minMemberCount
  const isEven = spread <= 1
  const consecutive = weeks.length ? hasConsecutiveStretch(weeks, team) : false
  const maxCount = burdenData.length
    ? Math.max(...burdenData.map((d) => d.count), 1)
    : 0

  const fairnessScore = Math.max(
    0,
    Math.min(100, 100 - spread * 8 - (consecutive ? 12 : 0))
  )

  const fairnessStatus =
    fairnessScore >= 90
      ? "Excellent balance"
      : fairnessScore >= 70
        ? "Good balance"
        : fairnessScore >= 50
          ? "Moderate imbalance"
          : "Poor balance"

  const rotationBarColor = (localHour: number) => {
    const h = ((localHour % 24) + 24) % 24
    if (h < 8) return "bg-blue-400/60"
    if (h >= 18) return "bg-orange-400/60"
    return "bg-muted-foreground/40"
  }

  const weekTimes = weeks.map((w) => {
    const dateIso = w.utcDateIso ?? "2025-03-05"
    const localHour = convertUtcToLocal(dateIso, w.utcHour, displayTimezone)
    return { week: w.week, localHour, label: formatHourLabel(localHour) }
  })

  const sacrificeTimeline = weeks.map((w) => {
    const dateIso = w.utcDateIso ?? "2025-03-05"
    const localHour = convertUtcToLocal(dateIso, w.utcHour, displayTimezone)
    const label = formatHourLabel(localHour)
    const inconveniencedMembers = w.memberTimes
      .filter((mt) => (mt.score ?? 0) > 0)
      .map((mt) => {
        const member = team.find((m) => m.id === mt.memberId)
        const display = membersDisplay.get(mt.memberId)
        const name = display?.name ?? member?.name ?? "—"
        const timezone = member?.timezone ?? "UTC"
        const city = getIanaShortLabel(timezone)
        return {
          memberId: mt.memberId,
          name,
          localTime: mt.localTime,
          city,
          timezone,
          localHour: mt.localHour,
        }
      })
    return {
      week: w.week,
      label,
      members: inconveniencedMembers,
    }
  })

  const timezoneRanges = (() => {
    const byTz = new Map<
      string,
      { min: number; max: number; city: string }
    >()
    for (const m of team) {
      const tz = m.timezone || "UTC"
      const city = getIanaShortLabel(tz)
      if (!byTz.has(tz)) {
        byTz.set(tz, { min: 24, max: 0, city })
      }
      const entry = byTz.get(tz)!
      for (const w of weeks) {
        const dateIso = w.utcDateIso ?? "2025-03-05"
        const localHour = convertUtcToLocal(dateIso, w.utcHour, tz)
        entry.min = Math.min(entry.min, localHour)
        entry.max = Math.max(entry.max, localHour)
      }
    }
    return Array.from(byTz.entries()).map(([tz, { min, max, city }]) => ({
      city,
      range: `${formatHourLabel(min)} – ${formatHourLabel(max)}`,
    }))
  })()

  const maxWidth = embedded ? "max-w-2xl" : "max-w-6xl"

  return (
    <main
      className={
        embedded
          ? `mx-auto ${maxWidth} px-4 py-6`
          : `mx-auto ${maxWidth} px-5 sm:px-8 pt-8 sm:pt-12 pb-8`
      }
    >
      {!embedded && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-6 text-muted-foreground hover:text-foreground"
        >
          <Link
            href={`${scheduleBasePathResolved}/${scheduleId}${scheduleLinkSuffix}`}
            className="inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span>
            Back to schedule
          </Link>
        </Button>
      )}

      {!embedded && (
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Rotation Analysis
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {scheduleName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fairness report for {teamName}
          </p>
        </div>
      )}

      {/* Hero Metric — Fairness Score */}
      <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-6 sm:p-8 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-1">
          Fairness Score
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-4xl sm:text-5xl font-semibold tabular-nums">
              {fairnessScore}
              <span className="text-2xl sm:text-3xl font-normal text-muted-foreground ml-1">
                / 100
              </span>
            </p>
            <span className="inline-flex items-center rounded-md bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground/90">
              {fairnessStatus}
            </span>
          </div>
          <div className="flex-1 w-full sm:max-w-xs mt-4 sm:mt-0">
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80 transition-all"
                style={{ width: `${fairnessScore}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3 max-w-xl">
          This score reflects how evenly meeting inconvenience is distributed
          across the team.
        </p>
      </section>

      {/* Schedule Summary */}
      <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold tracking-tight mb-3">
          Schedule Summary
        </h2>
        <div className="mb-4">
          <p className="text-base font-medium">{teamName}</p>
          <p className="text-sm text-muted-foreground">
            {weeksCount}-week rotation cycle
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {maxMemberCount}
            </p>
            <p className="text-xs text-muted-foreground">Max Burden</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {isEven ? 0 : spread}
            </p>
            <p className="text-xs text-muted-foreground">Burden Spread</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {burdenData.length}
            </p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {weeksCount}
            </p>
            <p className="text-xs text-muted-foreground">Weeks</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Mode</span>
          <span className="inline-flex items-center rounded-md bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-medium">
            {modeLabel.toUpperCase()}
          </span>
        </div>
        {explain?.shareablePlanExists === false && explain?.forcedSummary ? (
          <p className="text-sm text-muted-foreground">
            Schedule generated using fallback optimization mode.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          This schedule balances inconvenience across the team while respecting
          working hours and blocked time ranges.
        </p>
      </section>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left column: Member Burden + Time Rotation */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Member Burden Distribution
            </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Total inconvenience score across the {weeksCount}-week cycle.
          </p>
          {burdenData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No burden data available for this schedule.
            </p>
          ) : (
            <div className="space-y-4">
              {burdenData.map((d) => {
                const isMax = d.count === maxMemberCount && maxMemberCount > 0
                return (
                  <div
                    key={d.memberId}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 -my-0.5 transition-colors ${
                      isMax ? "bg-muted/40" : ""
                    }`}
                  >
                    <MemberAvatar
                      avatarUrl={membersDisplay.get(d.memberId)?.avatarUrl}
                      name={d.name}
                      size="sm"
                      className="shrink-0"
                    />
                    <span className="text-sm font-medium w-24 sm:w-28 truncate">
                      {d.name}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted/60 overflow-hidden min-w-0">
                      <div
                        className="h-full rounded-full bg-stretch/80 transition-all duration-500 relative overflow-hidden"
                        style={{
                          width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%`,
                        }}
                      >
                        {d.sacrificeCount > 0 && d.count > 0 && (
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-stretch-foreground/20 rounded-r-full"
                            style={{
                              width: `${Math.min(100, ((d.sacrificePoints ?? d.sacrificeCount) / d.count) * 100)}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm tabular-nums w-8 text-right shrink-0 ${
                        isMax ? "font-bold text-foreground" : "font-medium"
                      }`}
                    >
                      {d.count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground/80 mt-4 leading-relaxed">
            Burden scores represent early or late meetings outside ideal working
            hours. Lower scores indicate more comfortable schedules.
          </p>
        </section>

          {/* Time Rotation Overview */}
          <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Meeting Time Rotation
            </h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              How meeting time shifts across weeks.
            </p>
            {weekTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No week data available.
              </p>
            ) : (
              <div className="space-y-2">
                {weekTimes.map(({ week, label, localHour }) => {
                  const h = ((localHour % 24) + 24) % 24
                  const dayPct = (h / 24) * 100
                  return (
                    <div
                      key={week}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">
                        Week {week}
                      </span>
                      <span className="text-sm tabular-nums w-20 shrink-0">
                        {label}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden min-w-0">
                        <div
                          className={`h-full rounded-full transition-all ${rotationBarColor(localHour)}`}
                          style={{ width: `${dayPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column: Timezone Impact + Fairness Metrics */}
        <div className="space-y-6">
          {/* Timezone Impact */}
          <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Timezone Impact
            </h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Relative meeting time range per timezone.
            </p>
            {timezoneRanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No timezone data available.
              </p>
            ) : (
              <div className="space-y-2">
                {timezoneRanges.map(({ city, range }) => (
                  <div
                    key={city}
                    className="flex items-center justify-between gap-4 py-1.5"
                  >
                    <span className="text-sm font-medium shrink-0">{city}</span>
                    <span className="text-xs text-muted-foreground tabular-nums text-right min-w-[140px]">
                      {range}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Fairness Metrics */}
          <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Fairness Metrics
            </h2>
            <div className="flex flex-wrap gap-6 mt-4">
              <div>
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {maxMemberCount}
                </p>
                <p className="text-xs text-muted-foreground">Max burden</p>
              </div>
              <div>
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {isEven ? 0 : spread}
                </p>
                <p className="text-xs text-muted-foreground">Burden spread</p>
              </div>
              <div>
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {burdenData.length}
                </p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
            </div>
            {!consecutive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 pt-4 border-t border-border/30">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span>No one carries consecutive stretch weeks</span>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sacrifice Timeline — horizontal, 2 rows of 6, compact */}
      <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Sacrifice Timeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              How meeting inconvenience is distributed each week. Each dot = one
              member outside preferred hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 sm:mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-400/60 shrink-0" />
              Early meeting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-orange-400/60 shrink-0" />
              Late meeting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/50 shrink-0" />
              Mild inconvenience
            </span>
          </div>
        </div>
        {sacrificeTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No week data available.
          </p>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-4">
              {sacrificeTimeline.map(({ week, label, members }) => {
                const dotColor = (h: number) => {
                  const nh = ((h % 24) + 24) % 24
                  if (nh < 8) return "bg-blue-400/60"
                  if (nh >= 18) return "bg-orange-400/60"
                  return "bg-muted-foreground/50"
                }
                return (
                  <div
                    key={week}
                    className="flex flex-col gap-1 min-w-0"
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        Week {week}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground truncate">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-wrap min-h-[20px]">
                      {members.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground/60">
                          —
                        </span>
                      ) : (
                        members.map((m) => (
                          <Tooltip key={m.memberId}>
                            <TooltipTrigger asChild>
                              <span
                                className={`size-2 rounded-full shrink-0 cursor-default ${dotColor(m.localHour)}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px]">
                              <p className="font-medium">{m.name}</p>
                              <p className="opacity-90 mt-0.5">
                                Timezone: {m.timezone}
                              </p>
                              <p className="opacity-90">
                                Meeting time: {m.localTime}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        )}
      </section>

      {/* Explanation Section — Bottom */}
      <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight mb-4">
          Why this schedule was selected
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
            <CalendarCheck className="size-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Availability checked</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All members&apos; working hours were evaluated.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Hard boundaries respected</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No meetings were scheduled during blocked time ranges.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
            <RotateCw className="size-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Fairness rotation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Meeting inconvenience rotates across the team.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
            <Scale className="size-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Balanced burden</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No single member carries the majority of early/late meetings.
            </p>
          </div>
        </div>
      </section>

      {!embedded && (
        <div className="pt-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <Link
              href={`${scheduleBasePathResolved}/${scheduleId}${scheduleLinkSuffix}`}
              className="inline-flex items-center gap-1.5"
            >
              <span aria-hidden>←</span>
              Back to schedule
            </Link>
          </Button>
        </div>
      )}
    </main>
  )
}
