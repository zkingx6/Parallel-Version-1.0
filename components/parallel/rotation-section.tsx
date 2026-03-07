"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronDownIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateMeetingConfig, createScheduleRecord } from "@/lib/actions"
import {
  DbMeeting,
  DbMemberSubmission,
  dbMeetingToConfig,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import {
  BASE_TIME_OPTIONS,
  minutesToTimeLabel,
  parseTimeToMinutes,
  type NoViableTimeResult,
  type RotationResult,
} from "@/lib/types"
import { DateTime } from "luxon"
import {
  ensureDisplayTimezoneIana,
  getTimezoneDisplayLabelNow,
  getTimezoneOptions,
  resolveToStandardTimezone,
} from "@/lib/timezone"
import {
  generateRotationGuarded,
  canGenerateRotation,
  getBaseTimeStatus,
  getBurdenCounts,
  hasConsecutiveStretch,
  isInputContractViolation,
  isNoViableTimeResult,
  isRotationResult,
  verifyInputIntegrity,
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

/** Next occurrence of weekday (1=Mon..7=Sun) as YYYY-MM-DD. */
function getNextOccurrenceOfWeekday(dayOfWeek: number): string {
  const now = DateTime.utc()
  const current = now.weekday
  let daysUntil = dayOfWeek - current
  if (daysUntil <= 0) daysUntil += 7
  return now.plus({ days: daysUntil }).toISODate() ?? ""
}
function InlineSelect<T extends number | string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(
          (typeof value === "number" ? Number(e.target.value) : e.target.value) as T
        )
      }
      className="bg-card border border-border/60 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 appearance-none shadow-sm transition-colors hover:border-primary/30"
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function BaseTimePicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [inputValue, setInputValue] = useState(() => minutesToTimeLabel(value))
  const [isOpen, setIsOpen] = useState(false)
  const [isInvalid, setIsInvalid] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const didSelectRef = useRef(false)

  const currentIndex = BASE_TIME_OPTIONS.findIndex((o) => o.value === value)
  const scrollToIndex = useCallback((idx: number) => {
    const el = listRef.current?.children[idx] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [])

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseTimeToMinutes(raw)
      if (parsed != null) {
        onChange(parsed)
        setInputValue(minutesToTimeLabel(parsed))
        setIsInvalid(false)
      } else {
        setIsInvalid(true)
      }
    },
    [onChange]
  )

  const selectOption = useCallback(
    (opt: { label: string; value: number }) => {
      didSelectRef.current = true
      onChange(opt.value)
      setInputValue(opt.label)
      setIsInvalid(false)
      setIsOpen(false)
      setHighlightIndex(-1)
    },
    [onChange]
  )

  const openDropdown = useCallback(() => {
    const idx = currentIndex >= 0 ? currentIndex : 0
    setHighlightIndex(idx)
    setIsOpen(true)
    requestAnimationFrame(() => scrollToIndex(idx))
  }, [currentIndex, scrollToIndex])

  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        commit(inputValue)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [isOpen, inputValue, commit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        openDropdown()
      } else if (e.key === "Enter") {
        commit(inputValue)
      }
      return
    }
    if (e.key === "Escape") {
      setIsOpen(false)
      setInputValue(minutesToTimeLabel(value))
      setHighlightIndex(-1)
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (highlightIndex >= 0 && BASE_TIME_OPTIONS[highlightIndex]) {
        selectOption(BASE_TIME_OPTIONS[highlightIndex])
      } else {
        commit(inputValue)
        setIsOpen(false)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.min(highlightIndex + 1, BASE_TIME_OPTIONS.length - 1)
      setHighlightIndex(next)
      scrollToIndex(next)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.max(highlightIndex - 1, 0)
      setHighlightIndex(next)
      scrollToIndex(next)
      return
    }
  }

  return (
    <div ref={containerRef} className="relative inline-flex flex-col gap-0.5">
      <div className="relative flex">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsInvalid(false)
            setIsOpen(true)
            setHighlightIndex(-1)
          }}
          onFocus={() => openDropdown()}
          onBlur={() => {
            setTimeout(() => {
              if (didSelectRef.current) {
                didSelectRef.current = false
                return
              }
              commit(inputValue)
              setIsOpen(false)
            }, 150)
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 9:00 AM"
          className={cn(
            "bg-card border rounded-lg pl-2.5 pr-8 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 shadow-sm transition-colors w-30",
            isInvalid
              ? "border-destructive/60 focus:border-destructive/60"
              : "border-border/60 hover:border-primary/30"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground focus:outline-none"
          aria-label="Open time options"
        >
          <ChevronDownIcon
            className={cn("size-4 transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </div>
      {isOpen && (
        <div
          ref={listRef}
          className="absolute top-full left-0 mt-1 z-50 w-30 max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-card shadow-lg py-1"
        >
          {BASE_TIME_OPTIONS.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-sm font-medium transition-colors",
                idx === highlightIndex
                  ? "bg-primary/15 text-foreground"
                  : "text-foreground/90 hover:bg-muted/60"
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                selectOption(opt)
              }}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {isInvalid && (
        <span className="text-xs text-destructive">Invalid time</span>
      )}
    </div>
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
                    {getTimezoneDisplayLabelNow(b.timezone)}
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

function getOwnerTimezoneIana(members: DbMemberSubmission[]): string | null {
  const owner = members.find((m) => m.is_owner_participant === true)
  if (!owner) return null
  return resolveToStandardTimezone(owner.timezone)
}

export function RotationSection({
  meeting: initialMeeting,
  members: initialMembers,
}: {
  meeting: DbMeeting
  members: DbMemberSubmission[]
}) {
  const [meeting, setMeeting] = useState(initialMeeting)
  const ownerTimezoneIana = getOwnerTimezoneIana(initialMembers)
  const displayTimezoneInitial = ensureDisplayTimezoneIana(
    initialMeeting.display_timezone ?? ownerTimezoneIana ?? "America/New_York"
  )
  const [displayTimezoneIana, setDisplayTimezoneIana] = useState<string>(displayTimezoneInitial)

  useEffect(() => {
    const initial = ensureDisplayTimezoneIana(
      initialMeeting.display_timezone ?? getOwnerTimezoneIana(initialMembers) ?? "America/New_York"
    )
    setDisplayTimezoneIana(initial)
    // Only re-init when loading a different meeting; never when toggling or re-planning
  }, [initialMeeting.id])

  const lastPersistedMeetingId = useRef<string | null>(null)
  useEffect(() => {
    if (
      lastPersistedMeetingId.current === initialMeeting.id ||
      initialMeeting.display_timezone != null ||
      !ownerTimezoneIana
    )
      return
    lastPersistedMeetingId.current = initialMeeting.id
    updateMeetingConfig(initialMeeting.id, { display_timezone: ownerTimezoneIana }).then(() => {
      setMeeting((prev) => ({ ...prev, display_timezone: ownerTimezoneIana }))
    })
  }, [initialMeeting.id, initialMeeting.display_timezone, ownerTimezoneIana])
  const [rotationResult, setRotationResult] = useState<RotationResult | null>(null)
  const [noViableResult, setNoViableResult] = useState<NoViableTimeResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [rotationError, setRotationError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const router = useRouter()

  const rotation = rotationResult?.weeks ?? null

  const team = initialMembers.map(dbMemberToTeamMember)
  const useFixedBaseTime = meeting.base_time_minutes != null
  const effectiveAnchorOffset = useFixedBaseTime ? meeting.anchor_offset : 0
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[rotation-section] display timezone state:", {
      ownerTimezoneIana,
      meetingDisplayTimezone: meeting.display_timezone,
      displayTimezoneIana,
      useFixedBaseTime,
      effectiveAnchorOffset,
    })
  }
  const baseConfig = dbMeetingToConfig(meeting)
  const config = useFixedBaseTime
    ? baseConfig
    : {
        ...baseConfig,
        baseTimeMinutes: null,
        anchorOffset: meeting.anchor_offset,
      }
  const fixedBaseTimeStatus = useFixedBaseTime
    ? getBaseTimeStatus(team, { ...config, displayTimezone: displayTimezoneIana })
    : null
  const isFixedBaseTimeBlocked = fixedBaseTimeStatus?.blockedByHardNo ?? false

  const handleConfigChange = useCallback(
    async (updates: Record<string, number | string | null>) => {
      setMeeting((prev) => ({ ...prev, ...updates }))
      setRotationResult(null)
      await updateMeetingConfig(meeting.id, updates)
    },
    [meeting.id]
  )

  useEffect(() => {
    if (
      meeting.base_time_minutes == null &&
      meeting.anchor_offset !== 0
    ) {
      updateMeetingConfig(meeting.id, { anchor_offset: 0 }).then(() => {
        setMeeting((prev) => ({ ...prev, anchor_offset: 0 }))
      })
    }
  }, [meeting.id, meeting.base_time_minutes, meeting.anchor_offset])

  const handleGenerate = () => {
    console.log("[DEBUG] Plan button clicked")

    if (
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_DEBUG_ROTATION === "1"
    ) {
      verifyInputIntegrity(team, config)
    }

    if (team.length < 2) {
      console.log("[DEBUG] Early return triggered: team.length < 2")
      setRotationError("At least 2 members needed. Share the invite link.")
      setNoViableResult(null)
      return
    }
    if (isFixedBaseTimeBlocked) {
      setRotationError("Blocked by hard boundaries — choose a different time.")
      setRotationResult(null)
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
        setRotationResult(null)
        setNoViableResult(null)
        return
      }
    }
    console.log("[DEBUG] Team length:", team?.length)
    setIsGenerating(true)
    setRotationResult(null)
    setNoViableResult(null)
    setRotationError(null)
    console.log("Rotation config:", config)
    console.log("[DEBUG] Calling generateRotationGuarded")
    setTimeout(() => {
      try {
        const result = generateRotationGuarded(team, config)
        console.log("[DEBUG] generateRotationGuarded result:", result)
        if (isInputContractViolation(result)) {
          const msg =
            result.error.details
              ?.map((d) => d.reason || `${d.field}: invalid`)
              .join("; ") ?? result.error.message
          setRotationError(msg)
          setRotationResult(null)
          setNoViableResult(null)
        } else if (isNoViableTimeResult(result)) {
          setNoViableResult(result)
        } else if (Array.isArray(result) && result.length === 0) {
          setRotationError("No viable rotation with current boundaries.")
        } else if (isRotationResult(result)) {
          setRotationResult(result)
          if (
            typeof process !== "undefined" &&
            process.env.NEXT_PUBLIC_DEBUG_ROTATION === "1"
          ) {
            console.log("[ROTATION_DEBUG] explain:", JSON.stringify(result.explain, null, 2))
          }
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

  const handlePublishSchedule = async () => {
    if (!rotationResult?.weeks?.length) return
    setIsPublishing(true)
    try {
      const result = await createScheduleRecord(meeting.id, meeting.title, {
        weeks: rotationResult.weeks,
        modeUsed: rotationResult.modeUsed,
        explain: rotationResult.explain,
      })
      if (result?.error) {
        setRotationError(result.error)
        return
      }
      if (result?.data?.id) {
        router.push(`/schedule/${result.data.id}`)
      }
    } finally {
      setIsPublishing(false)
    }
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
              <span className="sr-only sm:not-sr-only">, starting</span>
              <label className="flex items-center gap-1.5" title="Week 1 date. Leave empty for next occurrence.">
                <input
                  type="date"
                  value={meeting.start_date ?? ""}
                  onChange={(e) =>
                    handleConfigChange({
                      start_date: e.target.value ? e.target.value : null,
                    })
                  }
                  className="bg-card border border-border/60 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-xs text-muted-foreground/70">
                  {meeting.start_date ? "(Week 1)" : "(optional)"}
                </span>
              </label>
              {!meeting.start_date && (
                <span className="text-xs text-muted-foreground/60">
                  Start week: Next{" "}
                  {DateTime.fromISO(
                    getNextOccurrenceOfWeekday(meeting.day_of_week),
                    { zone: "utc" }
                  ).toFormat("ccc, MMM d")}{" "}
                  (auto)
                </span>
              )}
              {meeting.base_time_minutes != null && (
                <>
                  <span>at</span>
                  <BaseTimePicker
                    key={meeting.base_time_minutes ?? 540}
                    value={meeting.base_time_minutes ?? 540}
                    onChange={(v) => handleConfigChange({ base_time_minutes: v })}
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
                value={displayTimezoneIana}
                onChange={(v) => {
                  setDisplayTimezoneIana(v)
                  const updates: Record<string, number | string | null> = {
                    display_timezone: v,
                  }
                  if (useFixedBaseTime) {
                    updates.anchor_offset =
                      DateTime.now().setZone(v).offset / 60
                  }
                  handleConfigChange(updates)
                }}
                options={getTimezoneOptions()}
              />
            </div>
            {!useFixedBaseTime && (
              <p className="text-xs text-muted-foreground/70">
                Times displayed in {getTimezoneDisplayLabelNow(displayTimezoneIana)}. Algorithm runs in UTC.
              </p>
            )}
            {useFixedBaseTime && (
              <>
                <p className="text-xs text-muted-foreground/70">
                  Anchor time in {getTimezoneDisplayLabelNow(displayTimezoneIana)}.
                </p>
                {fixedBaseTimeStatus && (
                  <>
                    {fixedBaseTimeStatus.blockedByHardNo && (
                      <p className="text-xs text-destructive mt-1">
                        Blocked by hard boundaries — choose a different time.
                      </p>
                    )}
                    {fixedBaseTimeStatus.outsideWorkHoursCount > 0 && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Outside working hours for {fixedBaseTimeStatus.outsideWorkHoursCount} member
                        {fixedBaseTimeStatus.outsideWorkHoursCount !== 1 ? "s" : ""} — burden will
                        increase.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={meeting.base_time_minutes != null}
                onChange={(e) => {
                  const checked = e.target.checked
                  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
                    console.log("[rotation-section] before toggle fixed base time:", {
                      displayTimezoneIana,
                      willBeChecked: checked,
                    })
                  }
                  handleConfigChange({
                    base_time_minutes: checked ? 540 : null,
                    anchor_offset: checked
                      ? DateTime.now().setZone(displayTimezoneIana).offset / 60
                      : 0,
                  })
                  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
                    console.log("[rotation-section] after toggle (displayTimezoneIana unchanged):", displayTimezoneIana)
                  }
                }}
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
              (team.length < 2 || isFixedBaseTimeBlocked) && "opacity-50 cursor-not-allowed"
            )}
            disabled={team.length < 2 || isGenerating || isFixedBaseTimeBlocked}
            onClick={handleGenerate}
          >
            {isGenerating
              ? "Planning…"
              : `Plan the next ${meeting.rotation_weeks} weeks fairly`}
          </Button>
          {(team.length < 2 || isFixedBaseTimeBlocked) && (
            <p className="text-xs text-muted-foreground/60 text-center mt-2">
              {team.length < 2
                ? "At least 2 members needed. Share the invite link."
                : "Blocked by hard boundaries — choose a different time."}
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
              displayTimezone={displayTimezoneIana}
              useBaseTime={useFixedBaseTime}
            />
            {rotationResult?.explain?.weeks?.some((w) => w.unavoidableMaxMemberId) && (
              <p className="text-sm text-muted-foreground">
                Given the current hard limits, at least one member had to take a
                late/early meeting in some weeks.
              </p>
            )}
            {rotationResult?.explain?.weeks?.some((w) => w.rotationForced) && (
              <p className="text-sm text-muted-foreground">
                In some weeks, rotation was not possible without exceeding limits —
                the same member had to take the late/early slot.
              </p>
            )}
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

            <div className="pt-6">
              <Button
                size="lg"
                className="w-full h-12 text-sm font-medium rounded-xl shadow-sm"
                onClick={handlePublishSchedule}
                disabled={isPublishing}
              >
                {isPublishing ? "Publishing…" : "Publish schedule"}
              </Button>
            </div>
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
