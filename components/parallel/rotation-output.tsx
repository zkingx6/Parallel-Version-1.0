"use client"

import { useCallback, useState } from "react"
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  TeamMember,
  RotationWeekData,
  formatHourLabel,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { MemberAvatar } from "@/components/ui/avatar"
import {
  utcToLocalInZone,
  convertUtcToLocal,
  getOffsetLabelForLocalDateTime,
} from "@/lib/timezone"
import { applyWeekLabelsToReordered } from "@/lib/schedule-reorder"

type BurdenCategory = "lightest" | "heaviest" | "balanced"

function getWeekBurdenCategories(weeks: RotationWeekData[]): BurdenCategory[] {
  if (weeks.length === 0) return []
  const burdens = weeks.map((w) =>
    w.memberTimes.reduce((s, mt) => s + (mt.score ?? 0), 0)
  )
  const minB = Math.min(...burdens)
  const maxB = Math.max(...burdens)
  return burdens.map((b) =>
    b === minB ? "lightest" : b === maxB ? "heaviest" : "balanced"
  )
}

function WeekCard({
  week,
  team,
  index,
  displayTimezone,
  dragHandle,
  noAnimation,
  burdenCategory,
}: {
  week: RotationWeekData
  team: TeamMember[]
  index: number
  displayTimezone: string
  dragHandle?: React.ReactNode
  noAnimation?: boolean
  burdenCategory?: BurdenCategory
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
  const dateIso = week.utcDateIso ?? "2025-03-05"
  const localH = Math.floor(anchorLocalHour)
  const localM = Math.round((anchorLocalHour % 1) * 60)
  const anchorLabel = getOffsetLabelForLocalDateTime(
    displayTimezone,
    dateIso,
    localH,
    localM
  )

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card shadow-sm p-4 sm:p-5",
        !noAnimation && "animate-in fade-in-0 slide-in-from-bottom-3 duration-400 fill-mode-both"
      )}
      style={!noAnimation ? { animationDelay: `${index * 80}ms` } : undefined}
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {dragHandle}
          <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-semibold">Week {week.week}</span>
            {burdenCategory === "lightest" && (
              <span className="text-[10px] font-medium text-comfortable-foreground/90 px-1.5 py-0.5 rounded bg-comfortable/30">
                🌿 Lightest week
              </span>
            )}
            {burdenCategory === "heaviest" && (
              <span className="text-[10px] font-medium text-stretch-foreground/90 px-1.5 py-0.5 rounded bg-stretch/30">
                🔥 Heaviest week
              </span>
            )}
            {burdenCategory === "balanced" && (
              <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                ⚖️ Balanced week
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate">{week.date}</span>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground/50 tabular-nums shrink-0">
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
                <MemberAvatar
                  avatarUrl={member.avatar_url || undefined}
                  name={member.name}
                  size="xs"
                  className={cn(
                    "shrink-0",
                    mt.discomfort !== "comfortable" &&
                      "[&_[data-slot=avatar-fallback]]:bg-stretch/60 [&_[data-slot=avatar-fallback]]:text-stretch-foreground"
                  )}
                />
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

      <p
        className={cn(
          "mt-3.5 text-xs italic leading-relaxed",
          hasDiscomfort
            ? "text-muted-foreground/70"
            : "text-comfortable-foreground/80"
        )}
      >
        {burdenCategory === "lightest"
          ? "Most members are comfortable with this time."
          : burdenCategory === "heaviest"
            ? "Some members take a less convenient time this week."
            : burdenCategory === "balanced"
              ? "The meeting time is shared fairly this week."
              : week.explanation}
      </p>
    </div>
  )
}

function SortableWeekCard({
  id,
  week,
  team,
  index,
  displayTimezone,
  burdenCategory,
}: {
  id: string
  week: RotationWeekData
  team: TeamMember[]
  index: number
  displayTimezone: string
  burdenCategory?: BurdenCategory
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    transition: null,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-0 pointer-events-none")}
    >
      <WeekCard
        week={week}
        team={team}
        index={index}
        displayTimezone={displayTimezone}
        burdenCategory={burdenCategory}
        dragHandle={
          <button
            type="button"
            className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
        }
      />
    </div>
  )
}

export function RotationOutput({
  weeks,
  team,
  displayTimezone,
  useBaseTime,
  reorderable,
  onReorder,
  weekStartConfig,
}: {
  weeks: RotationWeekData[]
  team: TeamMember[]
  /** IANA timezone for header display (DST-aware). */
  displayTimezone: string
  useBaseTime?: boolean
  /** When true, weeks can be dragged to reorder. Requires onReorder and weekStartConfig. */
  reorderable?: boolean
  onReorder?: (weeks: RotationWeekData[]) => void
  weekStartConfig?: { dayOfWeek: number; startDateIso?: string | null }
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (!over || active.id === over.id || !onReorder || !weekStartConfig) return
      const oldIndex = weeks.findIndex((_, i) => `week-${i}` === active.id)
      const newIndex = weeks.findIndex((_, i) => `week-${i}` === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(weeks, oldIndex, newIndex)
      const withLabels = applyWeekLabelsToReordered(
        reordered,
        weekStartConfig.dayOfWeek,
        weekStartConfig.startDateIso
      )
      onReorder(withLabels)
    },
    [weeks, onReorder, weekStartConfig]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const ids = weeks.map((_, i) => `week-${i}`)
  const burdenCategories = getWeekBurdenCategories(weeks)

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
        {reorderable && (
          <p className="mt-2 text-xs text-muted-foreground/80">
            Drag to reorder weeks if needed. This does not change the fairness calculation.
          </p>
        )}
      </div>

      {reorderable && onReorder && weekStartConfig ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {weeks.map((week, i) => (
                <SortableWeekCard
                  key={`week-${i}`}
                  id={ids[i]}
                  week={week}
                  team={team}
                  index={i}
                  displayTimezone={displayTimezone}
                  burdenCategory={burdenCategories[i]}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              (() => {
                const i = ids.indexOf(activeId)
                if (i === -1) return null
                const week = weeks[i]
                return (
                  <div className="rounded-2xl border border-border/50 bg-card shadow-lg p-4 sm:p-5 cursor-grabbing">
                    <WeekCard
                      week={week}
                      team={team}
                      index={i}
                      displayTimezone={displayTimezone}
                      noAnimation
                      burdenCategory={burdenCategories[i]}
                    />
                  </div>
                )
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {weeks.map((week, i) => (
            <WeekCard
              key={week.week}
              week={week}
              team={team}
              index={i}
              displayTimezone={displayTimezone}
              burdenCategory={burdenCategories[i]}
            />
          ))}
        </div>
      )}
    </section>
  )
}
