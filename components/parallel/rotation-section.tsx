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
import { TIMEZONES, BASE_TIME_OPTIONS, RotationWeekData, type NoViableTimeResult } from "@/lib/types"
import {
  generateRotation,
  canGenerateRotation,
  getBurdenCounts,
  hasConsecutiveStretch,
  isNoViableTimeResult,
} from "@/lib/rotation"
import { RotationOutput } from "./rotation-output"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

function NoViableTimePanel({
  result,
  onApplySuggestion,
}: {
  result: NoViableTimeResult
  onApplySuggestion: (suggestionId: string, params?: unknown) => void
}) {
  const [showBlockers, setShowBlockers] = useState(false)
  const [modalSuggestion, setModalSuggestion] = useState<{
    id: string
    title: string
    description: string
    params?: unknown
  } | null>(null)

  const { diagnosis, suggestions } = result

  const handleApplyClick = (s: (typeof suggestions)[0]) => {
    setModalSuggestion({
      id: s.id,
      title: s.title,
      description: s.description,
      params: s.params,
    })
  }

  const handleConfirmApply = () => {
    if (modalSuggestion) {
      onApplySuggestion(modalSuggestion.id, modalSuggestion.params)
      setModalSuggestion(null)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-6 animate-in fade-in-0 duration-300">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            No shared time fits everyone&apos;s limits
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone&apos;s limits overlap, so there&apos;s no overlap left.
          </p>
        </div>

        <section>
          <h4 className="text-sm font-medium text-foreground mb-2">
            What&apos;s going on
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {diagnosis.notes[0]}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {diagnosis.notes.slice(1).map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">·</span>
                {note}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground">
              Who&apos;s limiting options?
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowBlockers((b) => !b)}
            >
              {showBlockers ? "Hide conflicts" : "Show conflicts"}
            </Button>
          </div>
          {showBlockers && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                These team members have the most impact on when the meeting can be scheduled:
              </p>
              <ul className="mt-3 space-y-2.5">
              {diagnosis.blockers.map((b) => (
                <li
                  key={b.memberId}
                  className="flex flex-wrap items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-foreground">{b.name}</span>
                  <Badge
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    {b.blockingType === "HARD_BOUNDARY"
                      ? "Never times"
                      : "Working hours"}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    UTC{b.timezone_offset >= 0 ? "+" : ""}{b.timezone_offset}
                  </span>
                  <p className="w-full text-muted-foreground text-xs mt-1">
                    {b.localBlockedSummary}
                  </p>
                </li>
              ))}
            </ul>
            </>
          )}
        </section>

        <section>
          <h4 className="text-sm font-medium text-foreground mb-3">
            Choose how to proceed
          </h4>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2"
              >
                <h5 className="text-sm font-medium text-foreground">
                  {s.title}
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {s.impactSummary}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleApplyClick(s)}
                >
                  Apply this option
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={!!modalSuggestion} onOpenChange={(o) => !o && setModalSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalSuggestion?.id === "RELAX_HARD_BOUNDARY_1H"
                ? "Relax one \"never\" time for this plan"
                : modalSuggestion?.id === "ALLOW_OUTSIDE_WORKING_HOURS"
                  ? "Allow slightly earlier or later times"
                  : modalSuggestion?.title}
            </DialogTitle>
            <DialogDescription>
              {modalSuggestion?.id === "RELAX_HARD_BOUNDARY_1H" ? (
                <>
                  We&apos;ll temporarily allow one hour that{" "}
                  {(modalSuggestion?.params as { memberName?: string })?.memberName ?? "this person"}{" "}
                  marked as &quot;never&quot; for this meeting plan. Their other &quot;never&quot;
                  times still apply. Use this only when the team agrees. This only affects this
                  meeting plan.
                </>
              ) : modalSuggestion?.id === "ALLOW_OUTSIDE_WORKING_HOURS" ? (
                <>
                  We&apos;ll consider meeting times that fall slightly outside your normal working
                  hours. Your &quot;never&quot; times still apply. This only affects this meeting
                  plan.
                </>
              ) : (
                modalSuggestion?.description
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirmApply}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [noViableResult, setNoViableResult] = useState<NoViableTimeResult | null>(null)
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
    console.log("[DEBUG] Plan button clicked")

    if (team.length < 2) {
      console.log("[DEBUG] Early return triggered: team.length < 2")
      setRotationError("At least 2 members needed. Share the invite link.")
      setNoViableResult(null)
      return
    }
    const validation = canGenerateRotation(team, config)
    if (!validation.valid) {
      const reason = validation.reason ?? ""
      const isInfeasible =
        reason.includes("no viable") ||
        reason.includes("never ranges") ||
        reason.toLowerCase().includes("hard boundaries")
      if (isInfeasible) {
        console.log(
          "[DEBUG] validation invalid but continuing to generateRotation due to infeasible case"
        )
      } else {
        console.log("[DEBUG] Early return triggered: validation.valid=false", reason)
        setRotationError(reason || "No viable rotation.")
        setRotation(null)
        setNoViableResult(null)
        return
      }
    }
    console.log("[DEBUG] Team length:", team?.length)
    setIsGenerating(true)
    setRotation(null)
    setNoViableResult(null)
    setRotationError(null)
    console.log("[DEBUG] Calling generateRotation")
    setTimeout(() => {
      try {
        const result = generateRotation(team, config)
        console.log("[DEBUG] generateRotation result:", result)
        if (isNoViableTimeResult(result)) {
          setNoViableResult(result)
        } else if (result.length === 0) {
          setRotationError("No viable rotation with current boundaries.")
        } else {
          setRotation(result)
        }
      } catch (error) {
        console.error("[DEBUG] Error occurred:", error)
      }
      setIsGenerating(false)
    }, 1200)
  }

  const handleApplySuggestion = useCallback(
    (suggestionId: string, params?: unknown) => {
      console.log("[NoViableTime] Apply suggestion:", suggestionId, params)
      // Phase 1: no DB write, just log
    },
    []
  )

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
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: "black",
          color: "white",
          padding: "6px 10px",
          zIndex: 9999,
        }}
      >
        DEBUG BUILD ACTIVE (RotationSection)
      </div>
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

        {noViableResult && !isGenerating && (
          <NoViableTimePanel
            result={noViableResult}
            onApplySuggestion={handleApplySuggestion}
          />
        )}

        {rotationError && !noViableResult && !isGenerating && (
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
