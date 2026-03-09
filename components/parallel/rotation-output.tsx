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
import { Leaf, AlertTriangle, GripHorizontal } from "lucide-react"
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

  const isInconvenient = (mt: (typeof week.memberTimes)[0]) =>
    mt.discomfort === "sacrifice" || mt.discomfort === "stretch"

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden",
        !noAnimation && "animate-in fade-in-0 slide-in-from-bottom-3 duration-400 fill-mode-both"
      )}
      style={!noAnimation ? { animationDelay: `${index * 80}ms` } : undefined}
    >
      {/* Week header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {dragHandle}
          <span className="text-[#1a1a2e] text-[0.92rem] font-semibold shrink-0">
            Week {week.week}
          </span>
          {burdenCategory === "lightest" && (
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-[#0d9488] bg-[#f0fdfa] border border-[#0d9488]/15 px-2.5 py-0.5 rounded-full font-medium shrink-0">
              <Leaf size={10} />
              Lightest week
            </span>
          )}
          {burdenCategory === "heaviest" && (
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-[#d97706] bg-[#fffbeb] border border-[#d97706]/15 px-2.5 py-0.5 rounded-full font-medium shrink-0">
              <AlertTriangle size={10} />
              Heaviest week
            </span>
          )}
          {burdenCategory === "balanced" && (
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-[#6b7280] bg-[#f4f5f7] px-2.5 py-0.5 rounded-full font-medium shrink-0">
              Balanced week
            </span>
          )}
          <span className="text-[0.82rem] text-[#b0b4bc] truncate">{week.date}</span>
        </div>
        <span className="text-[0.75rem] text-[#b0b4bc] tabular-nums shrink-0">
          {formatHourLabel(anchorLocalHour)} {anchorLabel}
        </span>
      </div>

      {/* Member rows */}
      <div className="px-5 pb-2">
        {week.memberTimes.map((mt) => {
          const member = memberMap[mt.memberId]
          if (!member) return null
          const inconvenient = isInconvenient(mt)
          return (
            <div
              key={mt.memberId}
              className={cn(
                "flex items-center justify-between py-2.5 -mx-5 px-5 rounded-lg transition-colors duration-150",
                inconvenient
                  ? "bg-[#fef8f0] border-l-2 border-l-[#f5c882] hover:bg-[#fef5eb]"
                  : "hover:bg-[#f9fafb]"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar
                  avatarUrl={member.avatar_url || undefined}
                  name={member.name}
                  size="sm"
                  className="shrink-0 size-7"
                />
                <span
                  className={cn(
                    "text-[0.86rem] text-[#1a1a2e] truncate",
                    inconvenient ? "font-medium" : "font-normal"
                  )}
                >
                  {member.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "text-[0.86rem] tabular-nums",
                    inconvenient ? "text-[#d97706] font-semibold" : "text-[#6b7280] font-normal"
                  )}
                >
                  {mt.localTime}
                  {(mt.dateOffset !== undefined && mt.dateOffset !== 0) || mt.localDateLabel ? (
                    <span className="ml-1 text-[0.7rem] text-[#9ca3af] font-normal">
                      ({mt.localDateLabel ?? (mt.dateOffset! > 0 ? "+1 day" : "-1 day")})
                    </span>
                  ) : null}
                </span>
                {inconvenient && (
                  <span className="w-2 h-2 rounded-full bg-[#f5c882] shrink-0" aria-hidden />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer message */}
      <div className="px-5 pb-4 pt-1">
        <p
          className={cn(
            "text-[0.78rem] italic leading-relaxed",
            burdenCategory === "heaviest"
              ? "text-[#d97706]"
              : burdenCategory === "lightest"
                ? "text-[#0d9488]"
                : "text-[#9ca3af]"
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
          <div
            className="rotation-drag-handle group shrink-0 p-2 -m-1 rounded cursor-grab active:cursor-grabbing touch-none hover:bg-[#f4f5f7]"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripHorizontal size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] pointer-events-none select-none" aria-hidden />
          </div>
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
    if (typeof document !== "undefined") document.body.style.cursor = "grabbing"
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (typeof document !== "undefined") document.body.style.cursor = ""
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
      <div className="mb-6">
        <h2 className="text-[1.25rem] text-[#1a1a2e] tracking-[-0.02em] font-semibold mb-1">
          Rotation schedule
        </h2>
        <p className="text-[#9ca3af] text-[0.84rem] leading-relaxed">
          {weeks.length} weeks — time rotates, burden distributed transparently.
          {useBaseTime !== undefined && (
            <span className="text-[#b0b4bc] ml-1">
              ({useBaseTime ? "Anchor mode" : "Auto fair mode"})
            </span>
          )}
        </p>
        {reorderable && (
          <p className="text-[#c4c7cc] text-[0.78rem] mt-1">
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
            <div className="space-y-4">
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
                  <div className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-5 cursor-grabbing">
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
        <div className="space-y-4">
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
