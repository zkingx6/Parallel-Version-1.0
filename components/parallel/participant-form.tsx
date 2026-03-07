"use client"

import { useState, useMemo, useEffect } from "react"
import {
  WORK_HOURS,
  FULL_DAY_HOURS,
  getHardNoEndOptions,
  HardNoRange,
} from "@/lib/types"
import { ensureDisplayTimezoneIana, getTimezoneOptions } from "@/lib/timezone"
import { Button } from "@/components/ui/button"

export type ParticipantFormPayload = {
  name: string
  timezone: string
  work_start_hour: number
  work_end_hour: number
  hard_no_ranges: HardNoRange[]
  role?: string
}

type ParticipantFormProps = {
  defaultName?: string
  /** IANA timezone string (e.g. America/New_York) */
  defaultTimezone?: string
  defaultWorkStart?: number
  defaultWorkEnd?: number
  defaultHardNoRanges?: HardNoRange[]
  defaultRole?: string
  onSubmit: (payload: ParticipantFormPayload) => Promise<void>
  submitLabel?: string
  saving?: boolean
}

const inputClasses =
  "w-full rounded-xl border border-border/50 bg-card px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"

const selectClasses =
  "bg-transparent border-none text-muted-foreground cursor-pointer focus:outline-none focus:text-foreground p-0 text-[11px] appearance-none"

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

type DaySchedule = { enabled: boolean; start: number; end: number }

function defaultWorkDaysFromLegacy(
  workStart: number,
  workEnd: number
): DaySchedule[] {
  return [
    { enabled: true, start: workStart, end: workEnd },
    { enabled: true, start: workStart, end: workEnd },
    { enabled: true, start: workStart, end: workEnd },
    { enabled: true, start: workStart, end: workEnd },
    { enabled: true, start: workStart, end: workEnd },
    { enabled: false, start: 9, end: 18 },
    { enabled: false, start: 9, end: 18 },
  ]
}

function deriveWorkHours(days: DaySchedule[]): { start: number; end: number } {
  const enabled = days.filter((d) => d.enabled)
  if (enabled.length === 0) return { start: 9, end: 18 }
  const start = Math.min(...enabled.map((d) => d.start))
  let end = Math.max(...enabled.map((d) => d.end))
  if (end <= start) end = start + 1
  return { start, end }
}

function resolveDefaultTimezone(v: string | number | undefined): string {
  if (v != null) return ensureDisplayTimezoneIana(String(v))
  return "America/New_York"
}

export function ParticipantForm({
  defaultName = "",
  defaultTimezone,
  defaultWorkStart = 9,
  defaultWorkEnd = 18,
  defaultHardNoRanges = [],
  defaultRole = "",
  onSubmit,
  submitLabel = "Save my availability",
  saving = false,
}: ParticipantFormProps) {
  const resolvedDefault = useMemo(
    () => resolveDefaultTimezone(defaultTimezone),
    [defaultTimezone]
  )
  const [name, setName] = useState(defaultName)
  const [timezone, setTimezone] = useState(resolvedDefault)
  useEffect(() => {
    setName(defaultName)
    setTimezone(resolvedDefault)
  }, [defaultName, resolvedDefault])
  const [workDays, setWorkDays] = useState<DaySchedule[]>(() =>
    defaultWorkDaysFromLegacy(defaultWorkStart, defaultWorkEnd)
  )
  useEffect(() => {
    setWorkDays(defaultWorkDaysFromLegacy(defaultWorkStart, defaultWorkEnd))
  }, [defaultWorkStart, defaultWorkEnd])
  const [hardNoRanges, setHardNoRanges] = useState<HardNoRange[]>(
    defaultHardNoRanges.length > 0 ? defaultHardNoRanges : []
  )
  const [role, setRole] = useState(defaultRole)

  useEffect(() => {
    setHardNoRanges(
      defaultHardNoRanges && defaultHardNoRanges.length > 0 ? [...defaultHardNoRanges] : []
    )
  }, [JSON.stringify(defaultHardNoRanges)])

  useEffect(() => {
    setRole(defaultRole ?? "")
  }, [defaultRole])
  const [error, setError] = useState<string | null>(null)

  const handleAddRange = () => {
    setHardNoRanges([...hardNoRanges, { start: 0, end: 6 }])
  }

  const handleRemoveRange = (index: number) => {
    setHardNoRanges(hardNoRanges.filter((_, i) => i !== index))
  }

  const handleRangeStartChange = (index: number, start: number) => {
    const ranges = [...hardNoRanges]
    const old = ranges[index]
    const duration = ((old.end - old.start + 24) % 24) || 1
    const clamped = Math.min(Math.max(duration, 1), 6)
    ranges[index] = { start, end: (start + clamped) % 24 }
    setHardNoRanges(ranges)
  }

  const handleRangeEndChange = (index: number, end: number) => {
    const ranges = [...hardNoRanges]
    ranges[index] = { ...ranges[index], end }
    setHardNoRanges(ranges)
  }

  const timezoneOptions = useMemo(() => getTimezoneOptions(), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { start: workStart, end: workEnd } = deriveWorkHours(workDays)
    try {
      await onSubmit({
        name: name.trim(),
        timezone,
        work_start_hour: workStart,
        work_end_hour: workEnd,
        hard_no_ranges: hardNoRanges,
        role: role.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Your name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Role (optional)
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClasses}
            placeholder="e.g. Frontend Lead"
          />
        </div>
      </section>

      <section>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Timezone *
        </label>
        <select
          required
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={`${inputClasses} appearance-none cursor-pointer`}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Working hours *
        </label>
        <p className="text-xs text-muted-foreground/50 mb-3">
          Set the days and times when you usually work. These hours help estimate inconvenience during rotation.
        </p>
        <div className="space-y-2">
          {workDays.map((day, i) => (
            <div
              key={i}
              className="flex items-center gap-2 flex-wrap text-sm"
            >
              <label className="flex items-center gap-2 min-w-[100px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => {
                    const next = [...workDays]
                    next[i] = { ...next[i], enabled: e.target.checked }
                    setWorkDays(next)
                  }}
                  className="rounded border-border/50"
                />
                <span className={day.enabled ? "text-foreground" : "text-muted-foreground"}>
                  {DAY_LABELS[i]}
                </span>
              </label>
              {day.enabled ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={day.start}
                    onChange={(e) => {
                      const next = [...workDays]
                      const start = Number(e.target.value)
                      next[i] = { ...next[i], start, end: Math.max(day.end, start + 1) }
                      setWorkDays(next)
                    }}
                    className={`${selectClasses} border border-border/50 rounded px-2 py-1.5 bg-card`}
                  >
                    {WORK_HOURS.filter((h) => h.value < day.end).map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground/40">–</span>
                  <select
                    value={day.end}
                    onChange={(e) => {
                      const next = [...workDays]
                      const end = Number(e.target.value)
                      next[i] = { ...next[i], end, start: Math.min(day.start, end - 1) }
                      setWorkDays(next)
                    }}
                    className={`${selectClasses} border border-border/50 rounded px-2 py-1.5 bg-card`}
                  >
                    {WORK_HOURS.filter((h) => h.value > day.start).map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground/50">Off</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Never available (hard boundaries)
        </label>
        <p className="text-xs text-muted-foreground/50 mb-3">
          Time ranges when you are absolutely unavailable. Up to 6 hours each.
        </p>
        <div className="space-y-2">
          {hardNoRanges.map((range, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-foreground/15 shrink-0" />
              <select
                value={range.start}
                onChange={(e) => handleRangeStartChange(i, Number(e.target.value))}
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
                onChange={(e) => handleRangeEndChange(i, Number(e.target.value))}
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
                type="button"
                onClick={() => handleRemoveRange(i)}
                className="text-muted-foreground/30 hover:text-foreground/60 transition-colors ml-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddRange}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
          >
            + add a hard boundary
          </button>
        </div>
      </section>

      {error && (
        <p className="text-xs text-stretch-foreground bg-stretch/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={saving || !name.trim()}
        size="lg"
        className="w-full h-11 text-sm font-medium rounded-xl"
      >
        {saving ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
