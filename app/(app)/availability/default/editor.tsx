"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { getTimezoneOptions } from "@/lib/timezone"
import type {
  WeeklyHours,
  WeeklyHardNo,
  ConsolidatedHardNoRange,
  AppliesTo,
} from "@/lib/availability"
import {
  consolidatedRangesFromWeeklyHardNo,
  weeklyHardNoFromConsolidated,
} from "@/lib/availability"
import { saveAvailabilityTemplate } from "@/lib/actions"
import { formatHourLabel, getHardNoEndOptions } from "@/lib/types"
import { Button } from "@/components/ui/button"

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: formatHourLabel(i),
  hhmm: `${i.toString().padStart(2, "0")}:00`,
}))

function hourToHHmm(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`
}

function hhmmToHour(s: string): number {
  const [h] = s.split(":").map(Number)
  return isNaN(h) ? 9 : Math.max(0, Math.min(23, h))
}

type Props = {
  initialTimezone: string
  initialWeeklyHours: WeeklyHours
  initialWeeklyHardNo: WeeklyHardNo
}

export function AvailabilityEditor({
  initialTimezone,
  initialWeeklyHours,
  initialWeeklyHardNo,
}: Props) {
  const [timezone, setTimezone] = useState(initialTimezone)
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(() => ({
    ...initialWeeklyHours,
  }))
  const { ranges: initialRanges, appliesTo: initialAppliesTo } =
    consolidatedRangesFromWeeklyHardNo(initialWeeklyHardNo)
  const [hardNoRanges, setHardNoRanges] = useState<ConsolidatedHardNoRange[]>(
    () => initialRanges
  )
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(() => initialAppliesTo)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timezoneOptions = useMemo(() => getTimezoneOptions(), [])

  const toggleDay = (day: (typeof DAY_KEYS)[number]) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      if (next[day].length > 0) {
        next[day] = []
      } else {
        next[day] = [{ start: "09:00", end: "18:00" }]
      }
      return next
    })
  }

  const setRange = (
    day: (typeof DAY_KEYS)[number],
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      const ranges = [...next[day]]
      if (!ranges[index]) return prev
      ranges[index] = { ...ranges[index], [field]: value }
      next[day] = ranges
      return next
    })
  }

  const addRange = (day: (typeof DAY_KEYS)[number]) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      next[day] = [...next[day], { start: "09:00", end: "18:00" }]
      return next
    })
  }

  const removeRange = (day: (typeof DAY_KEYS)[number], index: number) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      const ranges = next[day].filter((_, i) => i !== index)
      next[day] = ranges
      return next
    })
  }

  const setHardNoRange = (
    index: number,
    field: "start" | "end",
    value: number
  ) => {
    setHardNoRanges((prev) => {
      const next = [...prev]
      if (!next[index]) return prev
      if (field === "start") {
        const endOpts = getHardNoEndOptions(value)
        const currentEnd = next[index].end
        const endValid =
          endOpts.some((o) => o.value === currentEnd) && currentEnd > value
        next[index] = {
          start: value,
          end: endValid ? currentEnd : endOpts[0]?.value ?? value + 1,
        }
      } else {
        next[index] = { ...next[index], end: value }
      }
      return next
    })
  }

  const addHardNoRange = () => {
    setHardNoRanges((prev) => [...prev, { start: 12, end: 13 }])
  }

  const removeHardNoRange = (index: number) => {
    setHardNoRanges((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const weeklyHardNo = weeklyHardNoFromConsolidated(hardNoRanges, appliesTo)
    const result = await saveAvailabilityTemplate({
      timezone,
      weekly_hours: weeklyHours,
      weekly_hard_no: weeklyHardNo,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-8">
      <section>
        <label className="block text-sm font-medium text-foreground mb-2">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-xl border border-border/50 bg-card px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <label className="block text-sm font-medium text-foreground mb-3">
          Working days & hours
        </label>
        <div className="space-y-4">
          {DAY_KEYS.map((day) => {
            const enabled = weeklyHours[day].length > 0
            return (
              <div
                key={day}
                className="rounded-xl border border-border/50 bg-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-md border transition-colors ${
                      enabled
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                  {enabled && (
                    <button
                      type="button"
                      onClick={() => addRange(day)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Add range
                    </button>
                  )}
                </div>
                {enabled && (
                  <div className="space-y-2">
                    {weeklyHours[day].map((range, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <select
                          value={hhmmToHour(range.start)}
                          onChange={(e) =>
                            setRange(
                              day,
                              i,
                              "start",
                              hourToHHmm(Number(e.target.value))
                            )
                          }
                          className="rounded-lg border border-border/50 bg-background px-2 py-1.5 text-sm"
                        >
                          {HOUR_OPTIONS.filter(
                            (o) => o.value < hhmmToHour(range.end)
                          ).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-muted-foreground">–</span>
                        <select
                          value={hhmmToHour(range.end)}
                          onChange={(e) =>
                            setRange(
                              day,
                              i,
                              "end",
                              hourToHHmm(Number(e.target.value))
                            )
                          }
                          className="rounded-lg border border-border/50 bg-background px-2 py-1.5 text-sm"
                        >
                          {HOUR_OPTIONS.filter(
                            (o) => o.value > hhmmToHour(range.start)
                          ).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {weeklyHours[day].length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRange(day, i)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium text-foreground mb-3">
          Hard boundaries (cannot schedule meetings)
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Time ranges when you are never available. Meetings will not be
          scheduled during these times.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Applies to:{" "}
          {appliesTo === "every_day" ? "Every day" : "Weekdays (Mon–Fri)"}
        </p>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setAppliesTo("every_day")}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              appliesTo === "every_day"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/50 text-muted-foreground hover:border-border"
            }`}
          >
            Every day
          </button>
          <button
            type="button"
            onClick={() => setAppliesTo("weekdays")}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              appliesTo === "weekdays"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/50 text-muted-foreground hover:border-border"
            }`}
          >
            Weekdays (Mon–Fri)
          </button>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
          {hardNoRanges.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hard boundaries</p>
          ) : (
            hardNoRanges.map((range, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm"
              >
                <select
                  value={range.start}
                  onChange={(e) =>
                    setHardNoRange(i, "start", Number(e.target.value))
                  }
                  className="rounded-lg border border-border/50 bg-background px-2 py-1.5 text-sm"
                >
                  {HOUR_OPTIONS.filter((o) => o.value < range.end).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">–</span>
                <select
                  value={range.end}
                  onChange={(e) =>
                    setHardNoRange(i, "end", Number(e.target.value))
                  }
                  className="rounded-lg border border-border/50 bg-background px-2 py-1.5 text-sm"
                >
                  {getHardNoEndOptions(range.start).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeHardNoRange(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addHardNoRange}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add range
          </button>
        </div>
      </section>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/availability">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
