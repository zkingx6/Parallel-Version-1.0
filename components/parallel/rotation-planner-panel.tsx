"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronDownIcon, Calendar, Info } from "lucide-react"
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
  type RotationWeekData,
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
  getZeroBurdenAlternatives,
  hasConsecutiveStretch,
  isInputContractViolation,
  isNoViableTimeResult,
  isRotationResult,
  verifyInputIntegrity,
} from "@/lib/rotation"
import type { Plan } from "@/lib/plans"
import {
  getPlanLimits,
  PRO_ROTATION_WEEKS,
  STARTER_ROTATION_WEEKS,
} from "@/lib/plans"
import { RotationOutput } from "./rotation-output"
import { ScheduleAnalysisContent } from "./schedule-analysis-content"
import { ExplanationPanelContent } from "./explanation-panel"
import { BurdenScoreHelp } from "./burden-score-help"
import { getDemoBurdenData, DEMO_BURDEN_SUMMARY } from "@/lib/demo-data"
import { generateExplanation } from "@/lib/explanation-generator"
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
import { PageBackLink } from "@/components/ui/page-back-link"
import { MemberAvatar } from "@/components/ui/avatar"

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

function getModeLabel(modeUsed: string | undefined): string {
  if (!modeUsed) return "Auto Fair"
  switch (modeUsed) {
    case "FAIRNESS_GUARANTEE":
      return "Auto Fair"
    case "FIXED_ANCHOR":
      return "Fixed Time"
    case "STRICT":
      return "Fair rotation"
    case "RELAXED":
      return "Best possible"
    case "FALLBACK":
      return "Best possible"
    default:
      return "Auto Fair"
  }
}

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
      className="bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-[0.84rem] font-medium text-[#1a1a2e] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d9488]/10 focus:border-[#0d9488] appearance-none transition-colors hover:border-[#d1d5db]"
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
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
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
                "w-full text-left px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
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
  avatarUrl,
  count,
  sacrificeCount,
  sacrificePoints,
  max,
}: {
  name: string
  avatarUrl?: string | null
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
      <MemberAvatar
        avatarUrl={avatarUrl}
        name={name}
        size="sm"
        className="shrink-0"
      />
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

  // Prefer "Allow slightly earlier or later times" as recommended (less intrusive)
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (a.id === "ALLOW_OUTSIDE_WORKING_HOURS") return -1
    if (b.id === "ALLOW_OUTSIDE_WORKING_HOURS") return 1
    return 0
  })

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
            No shared time works for this team
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Working hours and boundaries leave no overlapping meeting window.
          </p>
        </div>

        <section>
          <h4 className="text-sm font-medium text-foreground mb-2">
            Why this happens
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your team spans multiple time zones and members have set limits on when they can meet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Right now, those limits leave no shared meeting window.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground">
              What&apos;s limiting options?
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowBlockers((b) => !b)}
            >
              {showBlockers ? "Hide explanation" : "Why no time works"}
            </Button>
          </div>
          {showBlockers && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {diagnosis.blockers.some((b) => b.blockingType === "HARD_BOUNDARY")
                  ? "These members' limits leave no shared meeting window."
                  : "These members' working hours leave no shared meeting window."}
              </p>
              <ul className="mt-3 space-y-2.5">
                {diagnosis.blockers.map((b) => (
                  <li
                    key={b.memberId}
                    className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-sm space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{b.name}</span>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {b.blockingType === "HARD_BOUNDARY"
                          ? "Never time"
                          : "Working hours"}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {getTimezoneDisplayLabelNow(b.timezone)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
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
            Ways to resolve this
          </h4>
          <div className="space-y-3">
            {sortedSuggestions.map((s, index) => {
              const isRecommended = index === 0
              return (
                <div
                  key={s.id}
                  className={`rounded-lg border p-4 space-y-2 transition-colors cursor-pointer ${
                    isRecommended
                      ? "border-primary/40 bg-primary/10 hover:border-primary/60 hover:bg-primary/15"
                      : "border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5"
                  }`}
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
                    className={
                      isRecommended
                        ? "mt-2 rounded-full px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                        : "mt-2 rounded-full px-6 py-3"
                    }
                    onClick={() => handleApplyClick(s)}
                  >
                    Generate preview
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <Dialog open={!!modalSuggestion} onOpenChange={(o) => !o && setModalSuggestion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate schedule preview?</DialogTitle>
            <DialogDescription>
              This will generate a temporary schedule preview using this option.
              Member settings will not be changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="outline" onClick={handleConfirmApply}>Generate preview</Button>
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
  membersDisplay,
  plan = "starter",
  demoMode,
  demoPreviewWeeks,
  onBack,
  onUpdateMeeting,
  onPublishSchedule,
}: {
  meeting: DbMeeting
  members: DbMemberSubmission[]
  /** Resolved display data from profiles/auth (canonical). memberId -> { name, avatarUrl } */
  membersDisplay: Map<string, { name: string; avatarUrl: string }>
  /** User plan for feature gating. Default starter. */
  plan?: Plan
  /** When true, use demo handlers instead of server actions. */
  demoMode?: boolean
  /** When set (demo mode), show this static preview instead of generate flow. Curated snapshot, not live output. */
  demoPreviewWeeks?: RotationWeekData[] | null
  /** When provided (e.g. in demo mode), used for Back to team instead of href. */
  onBack?: () => void
  onUpdateMeeting?: (id: string, patch: Record<string, unknown>) => void
  onPublishSchedule?: (params: {
    meetingId: string
    meetingTitle: string
    weeks: unknown[]
    modeUsed: string
    explain: unknown
  }) => void
}) {
  const rotationWeeksOptions =
    plan === "pro" ? [...PRO_ROTATION_WEEKS] : [...STARTER_ROTATION_WEEKS]
  const [meeting, setMeeting] = useState(initialMeeting)
  const displayRotationWeeks =
    plan === "starter" && meeting.rotation_weeks > 4
      ? 4
      : (meeting.rotation_weeks ?? 4)
  useEffect(() => {
    setMeeting(initialMeeting)
  }, [initialMeeting])
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
    if (demoMode) return
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
  }, [demoMode, initialMeeting.id, initialMeeting.display_timezone, ownerTimezoneIana])
  const [rotationResult, setRotationResult] = useState<RotationResult | null>(null)
  const [orderedWeeks, setOrderedWeeks] = useState<RotationWeekData[] | null>(null)
  const [noViableResult, setNoViableResult] = useState<NoViableTimeResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [rotationError, setRotationError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [isPreviewFromRelaxedConstraint, setIsPreviewFromRelaxedConstraint] = useState(false)
  const [previewRelaxedMemberName, setPreviewRelaxedMemberName] = useState<string | null>(null)
  const generateOverrideRef = useRef<{ baseTimeMinutes: number; anchorOffset: number } | null>(null)
  const router = useRouter()

  const rotation = orderedWeeks ?? rotationResult?.weeks ?? null

  const team = initialMembers.map((m) => {
    const tm = dbMemberToTeamMember(m)
    const resolved = membersDisplay.get(m.id)
    return {
      ...tm,
      name: resolved?.name ?? tm.name,
      avatar_url: resolved?.avatarUrl ?? tm.avatar_url,
    }
  })
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
  const effectiveConfig =
    plan === "starter" && config.rotationWeeks > 4
      ? { ...config, rotationWeeks: 4 }
      : config
  const fixedBaseTimeStatus = useFixedBaseTime
    ? getBaseTimeStatus(team, { ...config, displayTimezone: displayTimezoneIana })
    : null
  const isFixedBaseTimeBlocked = fixedBaseTimeStatus?.blockedByHardNo ?? false

  const handleConfigChange = useCallback(
    async (updates: Record<string, number | string | null>) => {
      const prevMeeting = meeting
      const normalized =
        plan === "starter" &&
        updates.rotation_weeks != null &&
        Number(updates.rotation_weeks) > 4
          ? { ...updates, rotation_weeks: 4 }
          : updates
      setMeeting((prev) => ({ ...prev, ...normalized }))
      setRotationResult(null)
      setRotationError(null)
      if (demoMode && onUpdateMeeting) {
        onUpdateMeeting(meeting.id, normalized)
      } else {
        const result = await updateMeetingConfig(meeting.id, normalized)
        if (result && "error" in result && result.error) {
          setMeeting(prevMeeting)
          setRotationError(result.error)
        }
      }
    },
    [demoMode, meeting, onUpdateMeeting, plan]
  )

  const handleApplyAlternative = useCallback(
    (baseTimeMinutes: number) => {
      const anchorOffset =
        DateTime.now().setZone(displayTimezoneIana).offset / 60
      generateOverrideRef.current = { baseTimeMinutes, anchorOffset }
      handleConfigChange({
        base_time_minutes: baseTimeMinutes,
        anchor_offset: anchorOffset,
      }).then(() => {
        handleGenerate()
      })
    },
    [displayTimezoneIana, handleConfigChange]
  )

  useEffect(() => {
    if (demoMode) return
    if (
      meeting.base_time_minutes == null &&
      meeting.anchor_offset !== 0
    ) {
      updateMeetingConfig(meeting.id, { anchor_offset: 0 }).then(() => {
        setMeeting((prev) => ({ ...prev, anchor_offset: 0 }))
      })
    }
  }, [demoMode, meeting.id, meeting.base_time_minutes, meeting.anchor_offset])

  useEffect(() => {
    if (demoMode) return
    if (plan === "starter" && meeting.rotation_weeks > 4) {
      updateMeetingConfig(meeting.id, { rotation_weeks: 4 }).then(() => {
        setMeeting((prev) => ({ ...prev, rotation_weeks: 4 }))
      })
    }
  }, [demoMode, plan, meeting.id, meeting.rotation_weeks])

  const handleGenerate = () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Plan button clicked")
    }

    const override = generateOverrideRef.current
    const configToUse =
      override
        ? {
            ...dbMeetingToConfig(meeting),
            baseTimeMinutes: override.baseTimeMinutes,
            anchorOffset: override.anchorOffset,
          }
        : effectiveConfig
    if (override) generateOverrideRef.current = null

    const limits = getPlanLimits(plan)
    if (configToUse.rotationWeeks > limits.maxRotationWeeks) {
      setRotationError(
        "Starter supports rotations up to 4 weeks. Upgrade to Pro to generate longer schedules."
      )
      setRotationResult(null)
      setNoViableResult(null)
      return
    }

    if (
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_DEBUG_ROTATION === "1"
    ) {
      verifyInputIntegrity(team, configToUse)
    }

    if (team.length < 2) {
      if (process.env.NODE_ENV === "development") {
        console.log("[DEBUG] Early return triggered: team.length < 2")
      }
      setRotationError("At least 2 members needed. Share the invite link.")
      setNoViableResult(null)
      return
    }
    if (!override && isFixedBaseTimeBlocked) {
      setRotationError("Blocked by hard boundaries — choose a different time.")
      setRotationResult(null)
      setNoViableResult(null)
      return
    }
    const validation = canGenerateRotation(team, configToUse)
    if (!validation.valid) {
      const reason = validation.reason ?? ""
      const isInfeasible =
        reason.includes("no viable") ||
        reason.includes("never ranges") ||
        reason.toLowerCase().includes("hard boundaries")
      if (isInfeasible) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[DEBUG] validation invalid but continuing to generateRotation due to infeasible case"
          )
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("[DEBUG] Early return triggered: validation.valid=false", reason)
        }
        setRotationError(reason || "No viable rotation.")
        setRotationResult(null)
        setNoViableResult(null)
        return
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Team length:", team?.length)
      console.log("Rotation config:", configToUse)
      console.log("[DEBUG] Calling generateRotationGuarded")
    }
    setIsGenerating(true)
    setRotationResult(null)
    setOrderedWeeks(null)
    setNoViableResult(null)
    setRotationError(null)
    setIsPreviewFromRelaxedConstraint(false)
    setPreviewRelaxedMemberName(null)
    setTimeout(() => {
      try {
        const result = generateRotationGuarded(team, configToUse)
        if (process.env.NODE_ENV === "development") {
          console.log("[DEBUG] generateRotationGuarded result:", result)
        }
        if (isInputContractViolation(result)) {
          const msg =
            result.error.details
              ?.map((d) => (d.name ? `${d.name}: ${d.reason || `${d.field}: invalid`}` : d.reason || `${d.field}: invalid`))
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
          setOrderedWeeks(null)
          if (
            typeof process !== "undefined" &&
            process.env.NEXT_PUBLIC_DEBUG_ROTATION === "1"
          ) {
            console.log("[ROTATION_DEBUG] explain:", JSON.stringify(result.explain, null, 2))
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[DEBUG] Error occurred:", error)
        }
      }
      setIsGenerating(false)
    }, 1200)
  }

  const handleApplySuggestion = useCallback(
    (suggestionId: string, params?: unknown) => {
      setPreviewRelaxedMemberName(null)
      let modifiedTeam = team
      if (suggestionId === "RELAX_HARD_BOUNDARY_1H") {
        const p = params as { memberId?: string; relaxRange?: { start: number; end: number } } | undefined
        const memberId = p?.memberId
        const relaxRange = p?.relaxRange
        if (memberId && relaxRange != null) {
          modifiedTeam = team.map((m) => {
            if (m.id !== memberId) return m
            const filtered = m.hardNoRanges.filter(
              (r) => !(r.start === relaxRange.start && r.end === relaxRange.end)
            )
            return { ...m, hardNoRanges: filtered }
          })
        }
      }
      setIsGenerating(true)
      setNoViableResult(null)
      setRotationError(null)
      setIsPreviewFromRelaxedConstraint(false)
      setPreviewRelaxedMemberName(null)
      setTimeout(() => {
        try {
          const result = generateRotationGuarded(modifiedTeam, effectiveConfig)
          if (isInputContractViolation(result)) {
            const msg =
              result.error.details?.map((d) => (d.name ? `${d.name}: ${d.reason || `${d.field}: invalid`}` : d.reason || `${d.field}: invalid`)).join("; ") ??
              result.error.message
            setRotationError(msg)
            setRotationResult(null)
            setNoViableResult(null)
          } else if (isNoViableTimeResult(result)) {
            setRotationError("PREVIEW_NO_OVERLAP")
            setRotationResult(null)
            setNoViableResult(result)
          } else if (Array.isArray(result) && result.length === 0) {
            setRotationError("PREVIEW_NO_OVERLAP")
            setRotationResult(null)
            setNoViableResult(null)
          } else if (isRotationResult(result)) {
            setRotationResult(result)
            setOrderedWeeks(null)
            setNoViableResult(null)
            setRotationError(null)
            setIsPreviewFromRelaxedConstraint(true)
            if (suggestionId === "RELAX_HARD_BOUNDARY_1H") {
              const p = params as { memberName?: string } | undefined
              setPreviewRelaxedMemberName(p?.memberName ?? null)
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("[Preview] Error:", error)
          }
          setRotationError("PREVIEW_NO_OVERLAP")
          setRotationResult(null)
          setNoViableResult(null)
        }
        setIsGenerating(false)
      }, 800)
    },
    [team, effectiveConfig]
  )

  const handlePublishSchedule = async () => {
    const weeksToPublish = orderedWeeks ?? rotationResult?.weeks
    if (!weeksToPublish?.length || !rotationResult) return
    setIsPublishing(true)
    try {
      if (demoMode && onPublishSchedule) {
        onPublishSchedule({
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          weeks: weeksToPublish,
          modeUsed: rotationResult.modeUsed,
          explain: rotationResult.explain,
        })
      } else {
        const result = await createScheduleRecord(meeting.id, meeting.title, {
          weeks: weeksToPublish,
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

  // Demo mode: show static curated preview only — no config, no generate
  if (demoMode && demoPreviewWeeks?.length) {
    const demoRotation = demoPreviewWeeks
    const demoTeam = initialMembers.map(dbMemberToTeamMember)
    const demoBurdenData = getDemoBurdenData(initialMeeting.id, membersDisplay)
    const demoSummary = DEMO_BURDEN_SUMMARY[initialMeeting.id]
    const demoMaxCount = demoBurdenData.length
      ? Math.max(...demoBurdenData.map((d) => d.count), 1)
      : 0
    const demoMaxMemberCount = demoSummary?.maxUncomfortable ?? 0
    const demoMinMemberCount = demoMaxMemberCount - (demoSummary?.maxDiff ?? 0)
    const demoIsEven = demoMaxMemberCount - demoMinMemberCount <= 1
    const demoConsecutive = false
    return (
      <main className="max-w-5xl mx-auto px-6 py-8 bg-[#f7f8fa]">
        <div className="max-w-2xl mx-auto">
          <PageBackLink onClick={onBack} className="mb-6">
            Back to team
          </PageBackLink>
          <div className="mb-8">
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1 font-semibold">
              {initialMeeting.title}
            </h1>
            <p className="text-[#9ca3af] text-[0.88rem]">
              Preview of how Parallel distributes meeting times across the team.
            </p>
          </div>
          <section className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6 mb-6">
            <RotationOutput
              weeks={demoRotation}
              team={demoTeam}
              displayTimezone={initialMeeting.display_timezone ?? "America/New_York"}
              useBaseTime={initialMeeting.base_time_minutes != null}
            />
            <div className="mt-6 pt-6 border-t border-[#edeef0]">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold">
                  Over {initialMeeting.rotation_weeks} weeks
                </h3>
                <BurdenScoreHelp className="shrink-0" />
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">·</span>
                  No one has more than {demoMaxMemberCount} uncomfortable{" "}
                  {demoMaxMemberCount === 1 ? "meeting" : "meetings"}
                </li>
                <li className="flex items-start gap-2">
                  <span className={cn("mt-0.5", demoIsEven ? "text-primary" : "text-stretch-foreground")}>·</span>
                  {demoIsEven
                    ? "Burden is evenly distributed across the team"
                    : `Burden differs by at most ${demoMaxMemberCount - demoMinMemberCount} between members`}
                </li>
                {!demoConsecutive && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">·</span>
                    No one carries consecutive stretch weeks
                  </li>
                )}
              </ul>
              {demoBurdenData.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {demoBurdenData.map((d) => (
                    <BurdenBar
                      key={d.memberId}
                      name={d.name}
                      avatarUrl={membersDisplay.get(d.memberId)?.avatarUrl}
                      count={d.count}
                      sacrificeCount={d.sacrificeCount}
                      sacrificePoints={d.sacrificePoints}
                      max={demoMaxCount * 1.2}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
          <div className="pt-4">
            <PageBackLink onClick={onBack} className="mb-0">Back to team</PageBackLink>
          </div>
        </div>
      </main>
    )
  }

  const hasNoAvailability = team.length >= 2 && team.some((m) => !m.timezone?.trim())

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 bg-[#f7f8fa]">
      <div className="max-w-2xl mx-auto">
        <PageBackLink
          href={demoMode ? undefined : `/team/${meeting.id}`}
          onClick={demoMode ? onBack : undefined}
          className="mb-6"
        >
          Back to team
        </PageBackLink>

        <div className="mb-8">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1 font-semibold">
            {meeting.title}
          </h1>
          <p className="text-[#9ca3af] text-[0.88rem]">
            Configure the meeting and plan a fair rotation.
          </p>
        </div>

        <div className="space-y-6">
          {/* The meeting card */}
          <section className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-[#0d9488]" />
              <h3 className="text-[#1a1a2e] text-[0.95rem] font-semibold">
                The meeting
              </h3>
            </div>
            <p className="text-[#9ca3af] text-[0.82rem] mb-5">
              Define cadence and cycle length.
            </p>

            <div className="bg-[#f9fafb] rounded-xl p-4 space-y-4 mb-4">
              {/* Row 1: Weekly on [Day] at [Time] for [Duration] over [Weeks] */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.84rem] text-[#6b7280] leading-relaxed">
              <span>Weekly on</span>
              <InlineSelect
                value={meeting.day_of_week}
                onChange={(v) => handleConfigChange({ day_of_week: v })}
                options={DAYS}
              />
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
                value={displayRotationWeeks}
                onChange={(v) => handleConfigChange({ rotation_weeks: v })}
                options={rotationWeeksOptions}
              />
            </div>

            {/* Start week metadata */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.84rem] text-[#6b7280]">
              <span>Start week:</span>
              <label className="flex items-center gap-2" title="Week 1 date. Leave empty for next occurrence.">
                <input
                  type="date"
                  value={meeting.start_date ?? ""}
                  onChange={(e) =>
                    handleConfigChange({
                      start_date: e.target.value ? e.target.value : null,
                    })
                  }
                  className="bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-[0.84rem] font-medium text-[#1a1a2e] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488]"
                />
                <span className="text-[0.78rem] text-[#b0b4bc]">
                  {meeting.start_date ? "(Week 1)" : "(optional)"}
                  {!meeting.start_date && (
                    <> → Next {DateTime.fromISO(getNextOccurrenceOfWeekday(meeting.day_of_week), { zone: "utc" }).toFormat("ccc, MMM d")} (auto)</>
                  )}
                </span>
              </label>
            </div>

            {/* Row 2: displayed in [Timezone] */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.84rem] text-[#6b7280] leading-relaxed">
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

            </div>

            {/* Helper / warning / boundary messages */}
            <div className="flex items-start gap-2 text-[0.78rem] text-[#b0b4bc]">
              <Info size={13} className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                {!useFixedBaseTime && (
                  <p>
                    Times displayed in {getTimezoneDisplayLabelNow(displayTimezoneIana)}. Algorithm runs in UTC.
                  </p>
                )}
                {useFixedBaseTime && (
                  <>
                    <p>Fixed meeting time in {getTimezoneDisplayLabelNow(displayTimezoneIana)}. This sets the meeting time for every week.</p>
                    {fixedBaseTimeStatus && (
                      <>
                        {fixedBaseTimeStatus.blockedByHardNo && (
                          <p className="text-destructive">
                            Blocked by hard boundaries — choose a different time.
                          </p>
                        )}
                        {fixedBaseTimeStatus.outsideWorkHoursCount > 0 && (
                          <p>
                            Outside working hours for {fixedBaseTimeStatus.outsideWorkHoursCount} member
                            {fixedBaseTimeStatus.outsideWorkHoursCount !== 1 ? "s" : ""} — burden will increase.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Fixed base time card */}
          <section className="bg-white rounded-2xl border border-[#edeef0] shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-6">
            <div className="flex items-start gap-3">
              <label className="flex items-start gap-3 cursor-pointer flex-1">
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
                  className="mt-0.5 w-5 h-5 rounded border-[#d1d5db] text-[#0d9488] focus:ring-[#0d9488]/20 shrink-0"
                />
                <div>
                  <span className="text-[#1a1a2e] text-[0.88rem] font-medium block">
                    Use a fixed base time
                  </span>
                  <p className="text-[#b0b4bc] text-[0.78rem] mt-0.5">
                    {meeting.base_time_minutes != null
                      ? "Meeting time is fixed. Some members may see a different local day."
                      : "If disabled, Parallel will choose the fairest time for the team."}
                  </p>
                </div>
              </label>
            </div>
          </section>

          <div className="pt-2">
          <Button
            size="lg"
            className={cn(
              "w-full py-3.5 text-[0.92rem] font-medium rounded-xl bg-[#0d9488] hover:bg-[#0f766e] hover:shadow-[0_6px_24px_rgba(13,148,136,0.20)] text-white border-0 transition-all duration-200",
              (team.length < 2 || isFixedBaseTimeBlocked || hasNoAvailability) && "opacity-50 cursor-not-allowed"
            )}
            disabled={team.length < 2 || isGenerating || isFixedBaseTimeBlocked || hasNoAvailability}
            onClick={handleGenerate}
          >
            {isGenerating
              ? "Planning…"
              : `Plan the next ${displayRotationWeeks} weeks fairly`}
          </Button>
          {(team.length < 2 || isFixedBaseTimeBlocked || hasNoAvailability) && (
            <p className="text-xs text-muted-foreground/60 text-center mt-2">
              {team.length < 2
                ? "At least 2 members needed. Share the invite link."
                : hasNoAvailability
                  ? "No availability submitted yet. Share the invite link so members can set their times."
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
          <>
            {rotationError === "PREVIEW_NO_OVERLAP" && (
              <div className="rounded-lg border border-stretch/40 bg-stretch/15 px-4 py-3 text-sm text-muted-foreground animate-in fade-in-0 duration-300 mb-4">
                <p>Even with this option, the team still has no overlapping meeting window.</p>
                <p className="mt-1.5 text-xs text-muted-foreground/90">You may need to adjust member availability or remove some constraints.</p>
              </div>
            )}
            <NoViableTimePanel
              result={noViableResult}
              onApplySuggestion={handleApplySuggestion}
            />
          </>
        )}

        {rotationError && !noViableResult && !isGenerating && (
          <div className="rounded-xl border border-stretch/40 bg-stretch/15 p-4 text-center animate-in fade-in-0 duration-300">
            <p className="text-sm text-stretch-foreground">{rotationError}</p>
          </div>
        )}

        {rotation && !isGenerating && (
          <>
            {isPreviewFromRelaxedConstraint && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-muted-foreground animate-in fade-in-0 duration-300 space-y-1.5">
                <p>Preview generated using relaxed constraints. Member settings have not been changed.</p>
                {previewRelaxedMemberName && (
                  <p>To generate this preview, one hard boundary was temporarily relaxed for {previewRelaxedMemberName}.</p>
                )}
              </div>
            )}
            {(() => {
              const alternatives =
                rotation &&
                getZeroBurdenAlternatives(
                  team,
                  effectiveConfig,
                  rotation,
                  displayTimezoneIana
                )
              return alternatives && alternatives.length > 0 ? (
                <div className="rounded-lg border border-[#0d9488]/20 bg-[#f0fdfa] px-4 py-3 mb-4 space-y-2 animate-in fade-in-0 duration-300">
                  <p className="text-[0.88rem] font-medium text-[#1a1a2e]">
                    Other equally comfortable options available
                  </p>
                  <p className="text-[0.78rem] text-[#6b7280] leading-relaxed">
                    Parallel also found additional meeting times that keep everyone within working hours and avoid any burden.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {alternatives.map((alt) => (
                      <button
                        key={alt.baseTimeMinutes}
                        type="button"
                        onClick={() => handleApplyAlternative(alt.baseTimeMinutes)}
                        className="inline-flex items-center px-3 py-1.5 text-[0.8rem] font-medium rounded-lg border border-[#0d9488]/30 bg-white text-[#0d9488] hover:bg-[#0d9488]/10 hover:border-[#0d9488]/50 transition-colors cursor-pointer"
                      >
                        {alt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
            <RotationOutput
              weeks={rotation}
              team={team}
              displayTimezone={displayTimezoneIana}
              useBaseTime={useFixedBaseTime}
              reorderable
              onReorder={setOrderedWeeks}
              weekStartConfig={{
                dayOfWeek: meeting.day_of_week,
                startDateIso: meeting.start_date ?? undefined,
              }}
            />
            {rotationResult?.explain?.weeks?.some((w) => w.unavoidableMaxMemberId) && (
              <p className="text-sm text-muted-foreground">
                Given the current hard limits, at least one member had to take a
                late/early meeting in some weeks.
              </p>
            )}
            <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both">
              <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold">
                    Over {meeting.rotation_weeks} weeks
                  </h3>
                  <BurdenScoreHelp className="shrink-0" />
                </div>
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
                {burdenData && (
                  <div className="space-y-2.5 pt-1">
                    {burdenData.map((d) => (
                        <BurdenBar
                          key={d.memberId}
                          name={d.name}
                          avatarUrl={membersDisplay.get(d.memberId)?.avatarUrl}
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

            <div className="pt-6 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 text-sm font-medium rounded-xl border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={() => setExplanationOpen(true)}
              >
                Why this schedule?
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 text-sm font-medium rounded-xl border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
                onClick={() => setAnalysisOpen(true)}
              >
                View rotation analysis
              </Button>
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 text-sm font-medium rounded-xl shadow-sm"
                onClick={handlePublishSchedule}
                disabled={isPublishing}
              >
                {isPublishing ? "Publishing…" : "Publish schedule"}
              </Button>
            </div>
          </>
        )}

        <div className="pt-4">
          {demoMode && onBack ? (
            <PageBackLink onClick={onBack} className="mb-0">Back to team</PageBackLink>
          ) : (
            <PageBackLink href={`/team/${meeting.id}`} className="mb-0">Back to team</PageBackLink>
          )}
        </div>
        </div>
      </div>

      <footer className="mt-16 sm:mt-24 border-t border-border/20 pt-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground/40">
            We shared the weight.
          </p>
        </div>
      </footer>

      <Dialog open={explanationOpen} onOpenChange={setExplanationOpen}>
        <DialogContent className="w-[90vw] max-w-[560px] max-h-[85vh] overflow-y-auto p-8">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 pr-10 sm:text-left">
            <div className="flex flex-col gap-1 min-w-0">
              <DialogTitle>Why this schedule?</DialogTitle>
              <DialogDescription>
                How Parallel chose this rotation for {meeting.title}
              </DialogDescription>
            </div>
            <BurdenScoreHelp className="shrink-0 mt-0.5" />
          </DialogHeader>
          <div className="mt-4">
            {rotation && rotationResult && (
              <ExplanationPanelContent
                sections={generateExplanation({
                  weeks: rotation,
                  team,
                  explain: rotationResult.explain,
                  meetingTitle: meeting.title,
                  rotationWeeks: rotation.length,
                })}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="w-[90vw] max-w-[1000px] max-h-[85vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle>Rotation Analysis</DialogTitle>
            <DialogDescription>
              Fairness report for {meeting.title}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {rotation && (
              <ScheduleAnalysisContent
                scheduleId="preview"
                scheduleName={meeting.title}
                teamName={meeting.title}
                weeksCount={rotation.length}
                modeLabel={getModeLabel(rotationResult?.modeUsed)}
                explain={rotationResult?.explain as { shareablePlanExists?: boolean; forcedSummary?: string; forcedReason?: string } | undefined}
                members={initialMembers}
                weeks={rotation}
                membersDisplay={membersDisplay}
                embedded
                displayTimezone={meeting.display_timezone ?? undefined}
                modeUsed={rotationResult?.modeUsed}
                useFixedBaseTime={useFixedBaseTime}
                relaxedWorkingHours={isPreviewFromRelaxedConstraint && !previewRelaxedMemberName}
                relaxedHardBoundaryMemberName={previewRelaxedMemberName ?? undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
