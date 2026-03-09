"use client"

import { useState } from "react"
import Link from "next/link"
import { DateTime } from "luxon"
import { deleteSchedule } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ScheduleItem = {
  id: string
  name: string
  weeks: number
  created_at: string
  team_id: string
}

export function ScheduleListContent({
  schedules,
  teamTitles,
  showDeleteButton = true,
  emptyStateHref,
  scheduleBasePath = "/schedule",
  scheduleLinkParams,
  demoMode,
  onScheduleClick,
  onDeleteSchedule: onDeleteScheduleProp,
  onEmptyStateClick,
  emptyStateMessage,
}: {
  schedules: ScheduleItem[]
  teamTitles: Record<string, string>
  showDeleteButton?: boolean
  emptyStateHref?: string
  /** Base path for schedule detail links. Use "/member/schedule" for member dashboard. */
  scheduleBasePath?: string
  /** Query params to append (e.g. token=...&memberId=...) for member context. */
  scheduleLinkParams?: string
  /** When true, use demo handlers instead of server actions. */
  demoMode?: boolean
  onScheduleClick?: (scheduleId: string) => void
  onDeleteSchedule?: (scheduleId: string) => Promise<void>
  onEmptyStateClick?: () => void
  /** Override empty state message (e.g. for member view). */
  emptyStateMessage?: string
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [items, setItems] = useState(schedules)

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (demoMode && onDeleteScheduleProp) {
      await onDeleteScheduleProp(scheduleId)
      setItems((prev) => prev.filter((s) => s.id !== scheduleId))
      setConfirmRemoveId(null)
    } else {
      await deleteSchedule(scheduleId)
      setItems((prev) => prev.filter((s) => s.id !== scheduleId))
      setConfirmRemoveId(null)
    }
  }

  if (items.length === 0) {
    const showGoToTeams = !emptyStateMessage && (demoMode ? !!onEmptyStateClick : true)
    return (
      <div className="rounded-xl border border-border/50 bg-card p-8 shadow-sm text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {emptyStateMessage ?? "No schedules published yet."}
        </p>
        {!emptyStateMessage && (
          <p className="text-sm text-muted-foreground/80">
            Generate a rotation and publish a schedule first.
          </p>
        )}
        {showGoToTeams && (demoMode && onEmptyStateClick ? (
          <button
            type="button"
            onClick={onEmptyStateClick}
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors mt-2"
          >
            Go to Teams →
          </button>
        ) : !emptyStateMessage ? (
          <Link
            href={emptyStateHref ?? "/teams"}
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors mt-2"
          >
            Go to Teams →
          </Link>
        ) : null)}
      </div>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight mb-4">
        Published schedules
      </h2>
      <div className="space-y-3">
        {items.map((s) => {
          const teamName = teamTitles[s.team_id] ?? "Team"
          const dateLabel = DateTime.fromISO(s.created_at).toFormat("MMM d, yyyy")
          const isConfirming = confirmRemoveId === s.id

          return (
            <div
              key={s.id}
              role={demoMode && onScheduleClick ? "button" : undefined}
              tabIndex={demoMode && onScheduleClick ? 0 : undefined}
              onClick={
                demoMode && onScheduleClick
                  ? (e) => {
                      if (!(e.target as HTMLElement).closest("[data-schedule-delete]")) {
                        onScheduleClick(s.id)
                      }
                    }
                  : undefined
              }
              onKeyDown={
                demoMode && onScheduleClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onScheduleClick(s.id)
                      }
                    }
                  : undefined
              }
              className={cn(
                "rounded-xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm flex items-start justify-between gap-3 transition-all",
                demoMode && onScheduleClick
                  ? "cursor-pointer hover:border-primary/20 hover:shadow-md"
                  : "hover:border-primary/20 hover:shadow-md"
              )}
            >
              {demoMode && onScheduleClick ? (
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {s.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {teamName}
                  </p>
                </div>
              ) : (
                <Link
                  href={`${scheduleBasePath}/${s.id}${scheduleLinkParams ? `?${scheduleLinkParams}` : ""}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="text-sm font-semibold text-foreground">
                    {s.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {teamName}
                  </p>
                </Link>
              )}
              <div
                data-schedule-delete
                className="flex items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {!isConfirming && (
                  <span className="text-xs text-muted-foreground">
                    {dateLabel}
                  </span>
                )}
                {showDeleteButton && (isConfirming ? (
                  <>
                    <span className="text-[11px] text-muted-foreground">
                      Remove schedule?
                    </span>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="h-6 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleDeleteSchedule(s.id)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(s.id)}
                    className="text-muted-foreground/30 hover:text-destructive transition-colors text-lg px-0.5 cursor-pointer"
                    aria-label="Delete schedule"
                  >
                    ×
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
