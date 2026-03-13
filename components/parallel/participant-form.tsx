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
  "w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-[0.88rem] text-[#1a1a2e] placeholder:text-[#c4c7cc] focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all"

const selectClasses =
  "bg-transparent border-none text-[#1a1a2e] cursor-pointer focus:outline-none focus:text-[#1a1a2e] p-0 text-[0.82rem] font-medium appearance-none"

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
      <section className="rounded-xl border border-[#edeef0] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Your info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[0.82rem] font-medium text-[#9ca3af] mb-1.5">
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
            <label className="block text-[0.82rem] font-medium text-[#9ca3af] mb-1.5">
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
        </div>
      </section>

      <section className="rounded-xl border border-[#edeef0] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Timezone</h2>
        <label className="block text-[0.82rem] font-medium text-[#9ca3af] mb-1.5">
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

      <section className="rounded-xl border border-[#edeef0] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-2">Working hours *</h2>
        <p className="text-[0.82rem] text-[#9ca3af] mb-4">
          Set the days and times when you usually work. These hours help estimate inconvenience during rotation.
        </p>
        <div className="space-y-3">
          {workDays.map((day, i) => (
            <div
              key={i}
              className="flex items-center gap-4 flex-wrap py-2.5 px-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]/50"
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
                  className="rounded border-[#d1d5db] text-[#0d9488] focus:ring-[#0d9488]/20 cursor-pointer"
                />
                <span className={`text-[0.88rem] ${day.enabled ? "text-[#1a1a2e] font-medium" : "text-[#9ca3af]"}`}>
                  {DAY_LABELS[i]}
                </span>
              </label>
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <select
                    value={day.start}
                    onChange={(e) => {
                      const next = [...workDays]
                      const start = Number(e.target.value)
                      next[i] = { ...next[i], start, end: Math.max(day.end, start + 1) }
                      setWorkDays(next)
                    }}
                    className={`${selectClasses} border border-[#e5e7eb] rounded-lg px-2.5 py-1.5 bg-white min-w-[4.5rem] focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/10 transition-all`}
                  >
                    {WORK_HOURS.filter((h) => h.value < day.end).map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[#9ca3af] text-[0.82rem]">–</span>
                  <select
                    value={day.end}
                    onChange={(e) => {
                      const next = [...workDays]
                      const end = Number(e.target.value)
                      next[i] = { ...next[i], end, start: Math.min(day.start, end - 1) }
                      setWorkDays(next)
                    }}
                    className={`${selectClasses} border border-[#e5e7eb] rounded-lg px-2.5 py-1.5 bg-white min-w-[4.5rem] focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/10 transition-all`}
                  >
                    {WORK_HOURS.filter((h) => h.value > day.start).map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-[0.78rem] text-[#9ca3af]">Off</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#edeef0] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-2">Never available (hard boundaries)</h2>
        <p className="text-[0.82rem] text-[#9ca3af] mb-4">
          Time ranges when you are absolutely unavailable. Up to 6 hours each. Parallel will never schedule meetings during these times.
        </p>
        <div className="space-y-3">
          {hardNoRanges.map((range, i) => (
            <div
              key={i}
              className="flex items-center gap-2 flex-wrap py-2 px-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb]/50"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-[#0d9488]/40 shrink-0" />
              <select
                value={range.start}
                onChange={(e) => handleRangeStartChange(i, Number(e.target.value))}
                className={`${selectClasses} border border-[#e5e7eb] rounded-lg px-2.5 py-1.5 bg-white min-w-[4.5rem] focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/10 transition-all`}
              >
                {FULL_DAY_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <span className="text-[#9ca3af] text-[0.82rem]">–</span>
              <select
                value={range.end}
                onChange={(e) => handleRangeEndChange(i, Number(e.target.value))}
                className={`${selectClasses} border border-[#e5e7eb] rounded-lg px-2.5 py-1.5 bg-white min-w-[4.5rem] focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/10 transition-all`}
              >
                {getHardNoEndOptions(range.start).map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <span className="text-[0.78rem] text-[#9ca3af]">never</span>
              <button
                type="button"
                onClick={() => handleRemoveRange(i)}
                className="ml-1 p-1 rounded text-[#9ca3af] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all cursor-pointer"
                aria-label="Remove boundary"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddRange}
            className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors cursor-pointer"
          >
            + Add a hard boundary
          </button>
        </div>
      </section>

      {error && (
        <p className="text-[0.88rem] text-[#dc2626] bg-[#fef2f2] rounded-lg px-4 py-3 border border-[#fecaca]">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={saving || !name.trim()}
        size="lg"
        className="w-full h-11 text-[0.82rem] font-medium rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white border-0 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
