"use client"

import Link from "next/link"
import {
  DbMeeting,
  DbMemberSubmission,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import { ensureDisplayTimezoneIana } from "@/lib/timezone"
import { getBurdenCounts, hasConsecutiveStretch } from "@/lib/rotation"
import { RotationOutput } from "./rotation-output"
import { cn } from "@/lib/utils"
import type { RotationWeekData } from "@/lib/types"

function BurdenBar({
  name,
  count,
  sacrificeCount,
  sacrificePoints,
  max,
}: {
  name: string
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
  scheduleName,
  meeting,
  members,
  weeks,
}: {
  scheduleName: string
  meeting: DbMeeting
  members: DbMemberSubmission[]
  weeks: RotationWeekData[]
}) {
  const team = members.map(dbMemberToTeamMember)
  const displayTimezone = ensureDisplayTimezoneIana(
    meeting.display_timezone ?? "America/New_York"
  )
  const useBaseTime = (meeting.base_time_minutes ?? null) != null
  const rotationWeeks = meeting.rotation_weeks ?? weeks.length

  if (!weeks.length) {
    return (
      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <span aria-hidden>←</span>
          Back to schedules
        </Link>
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {scheduleName}
          </h1>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-8 shadow-sm text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No schedule data available.
          </p>
          <Link
            href="/schedule"
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors mt-2"
          >
            ← Back to schedules
          </Link>
        </div>
      </main>
    )
  }

  const burdenData = getBurdenCounts(weeks, team)
  const maxCount = burdenData
    ? Math.max(...burdenData.map((d) => d.count), 1)
    : 0
  const maxMemberCount = burdenData
    ? Math.max(...burdenData.map((d) => d.count))
    : 0
  const minMemberCount = burdenData
    ? Math.min(...burdenData.map((d) => d.count))
    : 0
  const isEven = maxMemberCount - minMemberCount <= 1
  const consecutive = hasConsecutiveStretch(weeks, team)

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <Link
        href="/schedule"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <span aria-hidden>←</span>
        Back to schedules
      </Link>
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {scheduleName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {meeting.title} — time rotates, burden distributed transparently.
        </p>
      </div>

      <div className="space-y-10 sm:space-y-12">
        <RotationOutput
          weeks={weeks}
          team={team}
          displayTimezone={displayTimezone}
          useBaseTime={useBaseTime}
        />

        <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 space-y-5">
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
                  : `Burden differs by at most ${maxMemberCount - minMemberCount} between members`}
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
          <Link
            href="/schedule"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            ← Back to schedules
          </Link>
        </div>
      </div>
    </main>
  )
}
