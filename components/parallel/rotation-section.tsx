"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { updateMeetingConfig } from "@/lib/actions"
import {
  DbMeeting,
  DbMemberSubmission,
  dbMeetingToConfig,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import { TIMEZONES, BASE_TIME_OPTIONS, RotationWeekData } from "@/lib/types"
import {
  generateRotation,
  canGenerateRotation,
  getBurdenCounts,
  hasConsecutiveStretch,
} from "@/lib/rotation"
import { RotationOutput } from "./rotation-output"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

function BurdenBar({
  name,
  count,
  sacrificeCount,
  sacrificePoints,
  max,
}: {
  name: string
  count: number
  sacrificeCount: number
  sacrificePoints?: number
  max: number
}) {
  const widthPct = max > 0 ? (count / max) * 100 : 0
  const sacrificePct =
    count > 0 && (sacrificePoints !== undefined ? sacrificePoints : sacrificeCount)
      ? ((sacrificePoints ?? sacrificeCount) / count) * 100
      : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 sm:w-36 truncate">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-stretch/80 transition-all duration-500 relative overflow-hidden"
          style={{ width: `${widthPct}%` }}
        >
          {sacrificeCount > 0 && (
            <div
              className="absolute right-0 top-0 bottom-0 bg-stretch-foreground/20 rounded-r-full"
              style={{ width: `${sacrificePct}%` }}
            />
          )}
        </div>
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">
        {count}
      </span>
    </div>
  )
}

export function RotationSection({
  meeting: initialMeeting,
  members: initialMembers,
}: {
  meeting: DbMeeting
  members: DbMemberSubmission[]
}) {
  const [meeting, setMeeting] = useState(initialMeeting)
  const [rotation, setRotation] = useState<RotationWeekData[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [rotationError, setRotationError] = useState<string | null>(null)

  const team = initialMembers.map(dbMemberToTeamMember)
  const config = dbMeetingToConfig(meeting)

  const handleConfigChange = useCallback(
    async (updates: Record<string, number | string | null>) => {
      setMeeting((prev) => ({ ...prev, ...updates }))
      setRotation(null)
      await updateMeetingConfig(meeting.id, updates)
    },
    [meeting.id]
  )

  const handleGenerate = () => {
    if (team.length < 2) {
      setRotationError("At least 2 members needed. Share the invite link.")
      return
    }
    const validation = canGenerateRotation(team, config)
    if (!validation.valid) {
      setRotationError(validation.reason || "No viable rotation.")
      setRotation(null)
      return
    }
    setIsGenerating(true)
    setRotation(null)
    setRotationError(null)
    setTimeout(() => {
      const weeks = generateRotation(team, config)
      if (weeks.length === 0) {
        setRotationError("No viable rotation with current boundaries.")
      } else {
        setRotation(weeks)
      }
      setIsGenerating(false)
    }, 1200)
  }

  const burdenData = rotation ? getBurdenCounts(rotation, team) : null
  const maxCount = burdenData
    ? Math.max(...burdenData.map((d) => d.count), 1)
    : 0
  const maxMemberCount = burdenData
    ? Math.max(...burdenData.map((d) => d.count))
    : 0
  const minMemberCount = burdenData
    ? Math.min(...burdenData.map((d) => d.count))
    : 0
  const isEven = maxMemberCount - minMemberCount <= 1
  const consecutive = rotation ? hasConsecutiveStretch(rotation, team) : false

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <div className="mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {meeting.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure the meeting and plan a fair rotation.
        </p>
      </div>

      <div className="space-y-10 sm:space-y-12">
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight">
              The meeting
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Define cadence and cycle length.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm text-muted-foreground leading-relaxed">
              <span>Weekly on</span>
              <InlineSelect
                value={meeting.day_of_week}
                onChange={(v) => handleConfigChange({ day_of_week: v })}
                options={DAYS}
              />
              {meeting.base_time_minutes != null && (
                <>
                  <span>at</span>
                  <InlineSelect
                    value={meeting.base_time_minutes ?? 540}
                    onChange={(v) => handleConfigChange({ base_time_minutes: v })}
                    options={BASE_TIME_OPTIONS}
                  />
                </>
              )}
              <span>for</span>
              <InlineSelect
                value={meeting.duration_minutes}
                onChange={(v) => handleConfigChange({ duration_minutes: v })}
                options={DURATIONS}
              />
              <span>over</span>
              <InlineSelect
                value={meeting.rotation_weeks}
                onChange={(v) => handleConfigChange({ rotation_weeks: v })}
                options={ROTATION_WEEKS}
              />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm text-muted-foreground leading-relaxed">
              <span>displayed in</span>
              <InlineSelect
                value={meeting.anchor_offset}
                onChange={(v) => handleConfigChange({ anchor_offset: v })}
                options={TIMEZONE_OPTIONS}
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={meeting.base_time_minutes != null}
                onChange={(e) =>
                  handleConfigChange({
                    base_time_minutes: e.target.checked ? 540 : null,
                  })
                }
                className="rounded border-border/60 text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-foreground/90">
                Use a fixed base time
              </span>
            </label>
            <p className="text-xs text-muted-foreground/50 leading-relaxed pt-0.5">
              {meeting.base_time_minutes != null
                ? "Time rotates week to week. Some members may see a different local day."
                : "If disabled, Parallel will choose the fairest time for the team."}
            </p>
          </div>
        </section>

        <div className="pt-2">
          <Button
            size="lg"
            className={cn(
              "w-full h-12 text-sm font-medium rounded-xl shadow-sm transition-all duration-200",
              team.length < 2 && "opacity-50 cursor-not-allowed"
            )}
            disabled={team.length < 2 || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating
              ? "Planning…"
              : `Plan the next ${meeting.rotation_weeks} weeks fairly`}
          </Button>
          {team.length < 2 && (
            <p className="text-xs text-muted-foreground/60 text-center mt-2">
              At least 2 members needed. Share the invite link.
            </p>
          )}
        </div>

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 animate-in fade-in-0 duration-300">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analyzing burden distribution…
            </p>
          </div>
        )}

        {rotationError && !isGenerating && (
          <div className="rounded-xl border border-stretch/40 bg-stretch/15 p-4 text-center animate-in fade-in-0 duration-300">
            <p className="text-sm text-stretch-foreground">{rotationError}</p>
          </div>
        )}

        {rotation && !isGenerating && (
          <>
            <RotationOutput
              weeks={rotation}
              team={team}
              anchorOffset={meeting.anchor_offset}
              useBaseTime={meeting.base_time_minutes != null}
            />
            <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both">
              <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Over {meeting.rotation_weeks} weeks
                  </h3>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">·</span>
                      No one has more than {maxMemberCount} uncomfortable{" "}
                      {maxMemberCount === 1 ? "meeting" : "meetings"}
                    </li>
                    <li className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5",
                          isEven ? "text-primary" : "text-stretch-foreground"
                        )}
                      >
                        ·
                      </span>
                      {isEven
                        ? "Burden is evenly distributed across the team"
                        : `Burden differs by at most ${maxMemberCount - minMemberCount} between members`}
                    </li>
                    {!consecutive && (
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">·</span>
                        No one carries consecutive stretch weeks
                      </li>
                    )}
                  </ul>
                </div>
                {burdenData && (
                  <div className="space-y-2.5 pt-1">
                    {burdenData.map((d) => (
                      <BurdenBar
                        key={d.memberId}
                        name={d.name}
                        count={d.count}
                        sacrificeCount={d.sacrificeCount}
                        sacrificePoints={d.sacrificePoints}
                        max={maxCount * 1.2}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <div className="pt-4">
          <Link
            href={`/team/${meeting.id}`}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            ← Back to team
          </Link>
        </div>
      </div>

      <footer className="mt-16 sm:mt-24 border-t border-border/20 pt-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground/40">
            We shared the weight.
          </p>
        </div>
      </footer>
    </main>
  )
}
