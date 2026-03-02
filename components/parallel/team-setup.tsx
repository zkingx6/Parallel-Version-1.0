"use client"

import { useState, useEffect, useCallback } from "react"
import {
  TeamMember,
  HardNoRange,
  TIMEZONES,
  WORK_HOURS,
  FULL_DAY_HOURS,
  getInitials,
  getHardNoEndOptions,
} from "@/lib/types"
import { cn } from "@/lib/utils"

function LiveTime({ utcOffset }: { utcOffset: number }) {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const utc = now.getTime() + now.getTimezoneOffset() * 60000
      const local = new Date(utc + utcOffset * 3600000)
      setTime(
        local.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      )
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [utcOffset])

  if (!time) return <span className="text-xs text-muted-foreground/40">--:--</span>
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {time}
    </span>
  )
}

function TimelineBar({
  workStart,
  workEnd,
  hardNoRanges,
}: {
  workStart: number
  workEnd: number
  hardNoRanges: HardNoRange[]
}) {
  const workLeftPct = (workStart / 24) * 100
  const workWidthPct = ((workEnd - workStart) / 24) * 100

  const hardNoSegments: { left: number; width: number }[] = []
  for (const range of hardNoRanges) {
    if (range.start < range.end) {
      hardNoSegments.push({
        left: (range.start / 24) * 100,
        width: ((range.end - range.start) / 24) * 100,
      })
    } else {
      hardNoSegments.push(
        {
          left: (range.start / 24) * 100,
          width: ((24 - range.start) / 24) * 100,
        },
        { left: 0, width: (range.end / 24) * 100 }
      )
    }
  }

  return (
    <div className="h-1.5 rounded-full bg-muted/60 relative overflow-hidden">
      {hardNoSegments.map((seg, i) => (
        <div
          key={i}
          className="absolute inset-y-0 bg-foreground/8 transition-all duration-200"
          style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
        />
      ))}
      <div
        className="absolute inset-y-0 bg-primary/25 rounded-full transition-all duration-200"
        style={{ left: `${workLeftPct}%`, width: `${workWidthPct}%` }}
      />
    </div>
  )
}

function MemberCard({
  member,
  onUpdate,
  onRemove,
  canRemove,
}: {
  member: TeamMember
  onUpdate: (updated: TeamMember) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const handleNameChange = useCallback(
    (name: string) => {
      onUpdate({ ...member, name, initials: getInitials(name) })
    },
    [member, onUpdate]
  )

  const handleAddRange = () => {
    onUpdate({
      ...member,
      hardNoRanges: [...member.hardNoRanges, { start: 0, end: 6 }],
    })
  }

  const handleRemoveRange = (index: number) => {
    onUpdate({
      ...member,
      hardNoRanges: member.hardNoRanges.filter((_, i) => i !== index),
    })
  }

  const handleRangeStartChange = (index: number, start: number) => {
    const ranges = [...member.hardNoRanges]
    const old = ranges[index]
    const duration = ((old.end - old.start + 24) % 24) || 1
    const clampedDuration = Math.min(Math.max(duration, 1), 6)
    ranges[index] = { start, end: (start + clampedDuration) % 24 }
    onUpdate({ ...member, hardNoRanges: ranges })
  }

  const handleRangeEndChange = (index: number, end: number) => {
    const ranges = [...member.hardNoRanges]
    ranges[index] = { ...ranges[index], end }
    onUpdate({ ...member, hardNoRanges: ranges })
  }

  const selectClasses =
    "bg-transparent border-none text-muted-foreground cursor-pointer focus:outline-none focus:text-foreground p-0 text-[11px] appearance-none"

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
          {member.initials}
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={member.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Name"
              className="bg-transparent text-sm font-medium outline-none w-full min-w-0 placeholder:text-muted-foreground/40 focus:bg-muted/30 rounded px-1 -mx-1 py-0.5 transition-colors"
            />
            <LiveTime utcOffset={member.utcOffset} />
          </div>

          <select
            value={member.utcOffset}
            onChange={(e) =>
              onUpdate({ ...member, utcOffset: Number(e.target.value) })
            }
            className="bg-transparent border-none text-xs text-muted-foreground cursor-pointer focus:outline-none focus:text-foreground p-0 appearance-none w-full"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-[11px]">
            <select
              value={member.workStartHour}
              onChange={(e) =>
                onUpdate({
                  ...member,
                  workStartHour: Number(e.target.value),
                })
              }
              className={selectClasses}
            >
              {WORK_HOURS.filter((h) => h.value < member.workEndHour).map(
                (h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                )
              )}
            </select>
            <span className="text-muted-foreground/40">–</span>
            <select
              value={member.workEndHour}
              onChange={(e) =>
                onUpdate({
                  ...member,
                  workEndHour: Number(e.target.value),
                })
              }
              className={selectClasses}
            >
              {WORK_HOURS.filter((h) => h.value > member.workStartHour).map(
                (h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                )
              )}
            </select>
          </div>

          <TimelineBar
            workStart={member.workStartHour}
            workEnd={member.workEndHour}
            hardNoRanges={member.hardNoRanges}
          />

          {member.hardNoRanges.map((range, rangeIndex) => (
            <div
              key={rangeIndex}
              className="flex items-center gap-1.5 text-[11px]"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-foreground/15 shrink-0" />
              <select
                value={range.start}
                onChange={(e) =>
                  handleRangeStartChange(rangeIndex, Number(e.target.value))
                }
                className={selectClasses}
              >
                {FULL_DAY_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground/40">–</span>
              <select
                value={range.end}
                onChange={(e) =>
                  handleRangeEndChange(rangeIndex, Number(e.target.value))
                }
                className={selectClasses}
              >
                {getHardNoEndOptions(range.start).map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground/40 ml-0.5">never</span>
              <button
                onClick={() => handleRemoveRange(rangeIndex)}
                className="text-muted-foreground/30 hover:text-foreground/60 transition-colors ml-1 cursor-pointer"
                aria-label="Remove boundary"
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={handleAddRange}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
          >
            + set a hard boundary
          </button>
        </div>

        {canRemove && (
          <button
            onClick={onRemove}
            className="text-muted-foreground/30 hover:text-destructive transition-colors text-lg leading-none shrink-0 mt-0.5 px-0.5"
            aria-label="Remove member"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

let nextId = 100

export function TeamSetup({
  team,
  onTeamChange,
}: {
  team: TeamMember[]
  onTeamChange: (team: TeamMember[]) => void
}) {
  const handleUpdate = (index: number, updated: TeamMember) => {
    const next = [...team]
    next[index] = updated
    onTeamChange(next)
  }

  const handleRemove = (index: number) => {
    onTeamChange(team.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    const id = `m-${nextId++}`
    onTeamChange([
      ...team,
      {
        id,
        name: "",
        utcOffset: 0,
        workStartHour: 9,
        workEndHour: 18,
        hardNoRanges: [],
        initials: "?",
      },
    ])
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">Your team</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Add the people who share this meeting.
        </p>
      </div>

      <div className="space-y-2.5">
        {team.map((member, index) => (
          <MemberCard
            key={member.id}
            member={member}
            onUpdate={(updated) => handleUpdate(index, updated)}
            onRemove={() => handleRemove(index)}
            canRemove={team.length > 2}
          />
        ))}
      </div>

      <button
        onClick={handleAdd}
        className={cn(
          "mt-3 w-full rounded-xl border border-dashed border-border/60",
          "py-2.5 text-sm text-muted-foreground",
          "hover:border-primary/30 hover:text-primary hover:bg-primary/3",
          "transition-colors cursor-pointer"
        )}
      >
        + Add member
      </button>
    </section>
  )
}
