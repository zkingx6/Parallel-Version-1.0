"use client"

import { TeamMember, RotationWeek } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function RotationRow({
  week,
  member,
}: {
  week: RotationWeek
  member: TeamMember
}) {
  return (
    <div
      className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both"
      style={{ animationDelay: `${week.week * 60}ms` }}
    >
      <div className="w-16 sm:w-20 shrink-0">
        <span className="text-sm font-medium tabular-nums">
          Week {week.week}
        </span>
      </div>

      <div className="w-24 sm:w-28 shrink-0">
        <span className="text-xs text-muted-foreground">{week.dateRange}</span>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-medium">
            {member.initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{member.name}</span>
      </div>

      <div className="hidden sm:flex sm:items-baseline sm:gap-1 shrink-0">
        <span className="text-sm tabular-nums font-medium text-foreground/70">
          {week.localTime}
        </span>
        <span className="text-[11px] text-muted-foreground/50">local</span>
      </div>

      <Badge
        variant="outline"
        className={
          week.type === "sacrifice"
            ? "bg-sacrifice/40 text-sacrifice-foreground border-sacrifice/20 text-[11px] italic"
            : "bg-stretch/40 text-stretch-foreground border-stretch/20 text-[11px] italic"
        }
      >
        {week.type}
      </Badge>
    </div>
  )
}

function LoadingPulse() {
  return (
    <div className="space-y-4 py-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted/60" />
          <div className="h-6 w-6 rounded-full bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted/40" />
        </div>
      ))}
    </div>
  )
}

export function RotationPlanner({
  team,
  rotation,
  isGenerating,
  onGenerate,
}: {
  team: TeamMember[]
  rotation: RotationWeek[] | null
  isGenerating: boolean
  onGenerate: () => void
}) {
  const memberMap = Object.fromEntries(team.map((m) => [m.id, m]))

  return (
    <section>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Next Rotation
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rotation
            ? "8 weeks — distributed intentionally"
            : "Distribute the next 8 weeks of inconvenience"}
        </p>
      </div>

      {!rotation && !isGenerating && (
        <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8 text-center">
          <p className="text-sm text-foreground/70 mb-6 max-w-md mx-auto leading-relaxed">
            Those who have carried the most will be protected.
            <br className="hidden sm:block" />{" "}
            Inconvenience will be distributed among those with the lightest
            load.
          </p>
          <Button
            size="lg"
            className="px-8 h-12 text-sm font-medium"
            onClick={onGenerate}
          >
            Generate Fair Rotation
          </Button>
        </div>
      )}

      {isGenerating && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <LoadingPulse />
          <p className="text-xs text-muted-foreground/60 text-center mt-1">
            Analyzing burden data…
          </p>
        </div>
      )}

      {rotation && !isGenerating && (
        <div className="rounded-xl border border-border/60 bg-card">
          <div className="divide-y divide-border/30 px-4 sm:px-5">
            {rotation.map((week) => {
              const member = memberMap[week.memberId]
              if (!member) return null
              return (
                <RotationRow key={week.week} week={week} member={member} />
              )
            })}
          </div>
          <div className="border-t border-border/40 px-4 sm:px-5 py-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/50">
              8-week cycle — resets and recalculates automatically
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={onGenerate}
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
