"use client"

import { MeetingConfig, TIMEZONES } from "@/lib/types"

const DAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
]

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "90 min", value: 90 },
  { label: "2 hours", value: 120 },
]

const ROTATION_WEEKS = [
  { label: "4 weeks", value: 4 },
  { label: "6 weeks", value: 6 },
  { label: "8 weeks", value: 8 },
  { label: "10 weeks", value: 10 },
  { label: "12 weeks", value: 12 },
]

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({
  label: tz.label,
  value: tz.value,
}))

function InlineSelect({
  value,
  onChange,
  options,
}: {
  value: number
  onChange: (v: number) => void
  options: { label: string; value: number }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-card border border-border/60 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 appearance-none shadow-sm transition-colors hover:border-primary/30"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function MeetingConfiguration({
  config,
  onConfigChange,
}: {
  config: MeetingConfig
  onConfigChange: (config: MeetingConfig) => void
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">The meeting</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Define cadence and cycle length. Time is chosen per week for fairness.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm text-muted-foreground leading-relaxed">
          <span>Weekly on</span>
          <InlineSelect
            value={config.dayOfWeek}
            onChange={(v) => onConfigChange({ ...config, dayOfWeek: v })}
            options={DAYS}
          />
          <span>for</span>
          <InlineSelect
            value={config.durationMinutes}
            onChange={(v) => onConfigChange({ ...config, durationMinutes: v })}
            options={DURATIONS}
          />
          <span>over</span>
          <InlineSelect
            value={config.rotationWeeks}
            onChange={(v) => onConfigChange({ ...config, rotationWeeks: v })}
            options={ROTATION_WEEKS}
          />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm text-muted-foreground leading-relaxed">
          <span>displayed in</span>
          <InlineSelect
            value={config.anchorOffset}
            onChange={(v) => onConfigChange({ ...config, anchorOffset: v })}
            options={TIMEZONE_OPTIONS}
          />
        </div>

        <p className="text-xs text-muted-foreground/50 leading-relaxed pt-1">
          Time rotates week to week. Some members may see a different local day.
        </p>
      </div>
    </section>
  )
}
