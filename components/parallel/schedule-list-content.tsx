"use client"

import { useState } from "react"
import Link from "next/link"
import { DateTime } from "luxon"
import { ChevronRight, X } from "lucide-react"
import { deleteSchedule } from "@/lib/actions"
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
      <div className="rounded-xl border border-[#edeef0] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-center space-y-3">
        <p className="text-[0.88rem] text-[#9ca3af]">
          {emptyStateMessage ?? "No schedules published yet."}
        </p>
        {!emptyStateMessage && (
          <p className="text-[0.88rem] text-[#9ca3af]/80">
            Generate a rotation and publish a schedule first.
          </p>
        )}
        {showGoToTeams && (demoMode && onEmptyStateClick ? (
          <button
            type="button"
            onClick={onEmptyStateClick}
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors mt-2 cursor-pointer"
          >
            Go to Teams →
          </button>
        ) : !emptyStateMessage ? (
          <Link
            href={emptyStateHref ?? "/teams"}
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors mt-2 cursor-pointer"
          >
            Go to Teams →
          </Link>
        ) : null)}
      </div>
    )
  }

  return (
    <section>
      <h3 className="text-[#1a1a2e] text-[0.92rem] mb-3 font-semibold">
        Published schedules
      </h3>
      <div className="space-y-2">
        {items.map((s) => {
          const teamName = teamTitles[s.team_id] ?? "Team"
          const dateLabel = DateTime.fromISO(s.created_at).toFormat("MMM d, yyyy")
          const isConfirming = confirmRemoveId === s.id

          const scheduleHref = `${scheduleBasePath}/${s.id}${scheduleLinkParams ? `?${scheduleLinkParams}` : ""}`
          const rowClassName = "group bg-white rounded-xl border border-[#edeef0] px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"

          const rowContent = (
            <>
              <div className="w-1 h-10 rounded-full bg-[#0d9488]/20 group-hover:bg-[#0d9488]/50 transition-colors shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[#1a1a2e] text-[0.88rem] truncate block font-medium">
                  {s.name}
                </span>
                <span className="text-[#b0b4bc] text-[0.78rem]">
                  {teamName}
                </span>
              </div>
              <div
                data-schedule-delete
                className="flex items-center gap-3 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {!isConfirming && (
                  <span className="text-[#b0b4bc] text-[0.78rem]">
                    {dateLabel}
                  </span>
                )}
                {showDeleteButton && (isConfirming ? (
                  <>
                    <span className="text-[11px] text-[#9ca3af]">
                      Remove schedule?
                    </span>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-[11px] text-[#9ca3af] hover:text-[#1a1a2e] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="px-2 py-1 rounded text-[11px] text-white bg-[#ef4444] hover:bg-[#dc2626] cursor-pointer"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(s.id)}
                    className="p-1 rounded-lg bg-transparent border-0 cursor-pointer text-[#d1d5db] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Delete schedule"
                  >
                    <X size={14} />
                  </button>
                ))}
                {!isConfirming && (
                  <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] transition-colors" />
                )}
              </div>
            </>
          )

          return demoMode && onScheduleClick ? (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("[data-schedule-delete]")) {
                  onScheduleClick(s.id)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onScheduleClick(s.id)
                }
              }}
              className={rowClassName}
            >
              {rowContent}
            </div>
          ) : (
            <Link key={s.id} href={scheduleHref} className={rowClassName}>
              {rowContent}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
