import {
  TeamMember,
  RotationWeekData,
  formatHourLabel,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  utcToLocalInZone,
  convertUtcToLocal,
  getIanaShortLabel,
} from "@/lib/timezone"

function WeekCard({
  week,
  team,
  index,
  displayTimezone,
}: {
  week: RotationWeekData
  team: TeamMember[]
  index: number
  displayTimezone: string
}) {
  const memberMap = Object.fromEntries(team.map((m) => [m.id, m]))
  const hasDiscomfort = week.memberTimes.some(
    (mt) => mt.discomfort !== "comfortable"
  )
  const anchorDisplay =
    week.utcDateIso
      ? utcToLocalInZone(week.utcDateIso, week.utcHour, displayTimezone)
      : null
  const anchorLocalHour =
    anchorDisplay?.localHour ??
    convertUtcToLocal(week.utcDateIso ?? "2025-03-05", week.utcHour, displayTimezone)
  const anchorLabel = getIanaShortLabel(displayTimezone)

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card shadow-sm p-4 sm:p-5 animate-in fade-in-0 slide-in-from-bottom-3 duration-400 fill-mode-both"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">Week {week.week}</span>
          <span className="text-xs text-muted-foreground">{week.date}</span>
        </div>
        <span className="text-[11px] text-muted-foreground/50 tabular-nums">
          {formatHourLabel(anchorLocalHour)} {anchorLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        {week.memberTimes.map((mt) => {
          const member = memberMap[mt.memberId]
          if (!member) return null
          return (
            <div
              key={mt.memberId}
              className={cn(
                "flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-colors",
                mt.discomfort === "sacrifice"
                  ? "bg-stretch/60"
                  : mt.discomfort === "stretch"
                    ? "bg-stretch/40"
                    : ""
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full text-[8px] font-semibold flex items-center justify-center shrink-0",
                    mt.discomfort !== "comfortable"
                      ? "bg-stretch/60 text-stretch-foreground"
                      : "bg-primary/10 text-primary/70"
                  )}
                >
                  {member.initials}
                </div>
                <span className="text-sm truncate">{member.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "text-sm tabular-nums font-medium",
                    mt.discomfort !== "comfortable"
                      ? "text-stretch-foreground"
                      : "text-foreground/60"
                  )}
                >
                  {mt.localTime}
                  {(mt.dateOffset !== undefined && mt.dateOffset !== 0) ||
                  mt.localDateLabel ? (
                    <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                      ({mt.localDateLabel ?? (mt.dateOffset! > 0 ? "+1 day" : "-1 day")})
                    </span>
                  ) : null}
                </span>
                {mt.discomfort === "sacrifice" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-stretch-foreground" />
                )}
                {mt.discomfort === "stretch" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-stretch-foreground/60" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasDiscomfort && (
        <p className="mt-3.5 text-xs text-muted-foreground/70 italic leading-relaxed">
          {week.explanation}
        </p>
      )}
      {!hasDiscomfort && (
        <p className="mt-3.5 text-xs text-comfortable-foreground/80 italic leading-relaxed">
          {week.explanation}
        </p>
      )}
    </div>
  )
}

export function RotationOutput({
  weeks,
  team,
  displayTimezone,
  useBaseTime,
}: {
  weeks: RotationWeekData[]
  team: TeamMember[]
  /** IANA timezone for header display (DST-aware). */
  displayTimezone: string
  useBaseTime?: boolean
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">
          Rotation schedule
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {weeks.length} weeks — time rotates, burden distributed
          transparently.
          {useBaseTime !== undefined && (
            <span className="ml-1.5 text-muted-foreground/70">
              ({useBaseTime ? "Anchor mode" : "Auto fair mode"})
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {weeks.map((week, i) => (
          <WeekCard
            key={week.week}
            week={week}
            team={team}
            index={i}
            displayTimezone={displayTimezone}
          />
        ))}
      </div>
    </section>
  )
}
