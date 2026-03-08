"use client"

import { useState } from "react"
import Link from "next/link"
import { DateTime } from "luxon"
import { deleteSchedule } from "@/lib/actions"
import { Button } from "@/components/ui/button"

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
}: {
  schedules: ScheduleItem[]
  teamTitles: Record<string, string>
  showDeleteButton?: boolean
  emptyStateHref?: string
  /** Base path for schedule detail links. Use "/member/schedule" for member dashboard. */
  scheduleBasePath?: string
  /** Query params to append (e.g. token=...&memberId=...) for member context. */
  scheduleLinkParams?: string
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [items, setItems] = useState(schedules)

  const handleDeleteSchedule = async (scheduleId: string) => {
    await deleteSchedule(scheduleId)
    setItems((prev) => prev.filter((s) => s.id !== scheduleId))
    setConfirmRemoveId(null)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-8 shadow-sm text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          No schedules published yet.
        </p>
        <p className="text-sm text-muted-foreground/80">
          Generate a rotation and publish a schedule first.
        </p>
        <Link
          href={emptyStateHref ?? "/teams"}
          className="inline-block text-sm text-primary hover:text-primary/80 transition-colors mt-2"
        >
          Go to Teams →
        </Link>
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
              className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm flex items-start justify-between gap-3 hover:border-border/80 transition-colors"
            >
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
              <div
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
