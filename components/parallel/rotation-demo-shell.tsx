"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  TeamMember,
  MeetingConfig,
  RotationWeekData,
} from "@/lib/types"
import { getTimezoneDisplayLabelNow } from "@/lib/timezone"
import {
  generateRotationGuarded,
  canGenerateRotation,
  decodeShareData,
  getBurdenCounts,
  isInputContractViolation,
  isNoViableTimeResult,
  isRotationResult,
} from "@/lib/rotation"
import { Header } from "./demo-header"
import { TeamSetup } from "./team-setup"
import { MeetingConfiguration } from "./rotation-config-panel"
import { RotationOutput } from "./rotation-output"
import { ensureDisplayTimezoneIana } from "@/lib/timezone"
import { FairnessSummary } from "./fairness-summary"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

const defaultTeam: TeamMember[] = [
  {
    id: "m-1",
    name: "Alex Rivera",
    timezone: "America/Los_Angeles",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "AR",
  },
  {
    id: "m-2",
    name: "Maria Weber",
    timezone: "Europe/Berlin",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "MW",
  },
  {
    id: "m-3",
    name: "Kenji Tanaka",
    timezone: "Asia/Tokyo",
    workStartHour: 10,
    workEndHour: 19,
    hardNoRanges: [],
    initials: "KT",
  },
]

const defaultConfig: MeetingConfig = {
  dayOfWeek: 2,
  anchorHour: 12,
  anchorOffset: -5,
  durationMinutes: 60,
  rotationWeeks: 8,
  displayTimezone: "America/New_York",
}

function ShareView({
  team,
  config,
}: {
  team: TeamMember[]
  config: MeetingConfig
}) {
  const result = generateRotationGuarded(team, config)
  if (isInputContractViolation(result)) {
    const msg =
      result.error.details
        ?.map((d) => `${d.name ?? "Member"}: ${d.reason}`)
        .join("; ") ?? result.error.message
    return (
      <div className="min-h-screen">
        <Header isShareView />
        <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8 flex items-center justify-center">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">Invalid share link: {msg}</p>
          </div>
        </main>
      </div>
    )
  }
  const weeks = isNoViableTimeResult(result)
    ? []
    : isRotationResult(result)
      ? result.weeks
      : Array.isArray(result)
        ? result
        : []
  const noViable = isNoViableTimeResult(result)
  const burdenData = getBurdenCounts(weeks, team)
  const maxCount = Math.max(...burdenData.map((d) => d.count), 1)
  const maxMemberCount = Math.max(...burdenData.map((d) => d.count))
  const minMemberCount = Math.min(...burdenData.map((d) => d.count))
  const isEven = maxMemberCount - minMemberCount <= 1

  return (
    <div className="min-h-screen">
      <Header isShareView />
      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8 space-y-10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">Team</h2>
          <div className="rounded-xl border border-border/50 bg-card shadow-sm divide-y divide-border/30">
            {team.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[8px] font-semibold flex items-center justify-center">
                    {m.initials}
                  </div>
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getTimezoneDisplayLabelNow(m.timezone)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {noViable ? (
          <div className="rounded-xl border border-stretch/40 bg-stretch/15 p-4 text-center">
            <p className="text-sm text-stretch-foreground">
              No viable meeting time with current constraints.
            </p>
          </div>
        ) : (
          <RotationOutput
            weeks={weeks}
            team={team}
            displayTimezone={ensureDisplayTimezoneIana(
              config.displayTimezone ?? "America/New_York"
            )}
          />
        )}

        {!noViable && (
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Over {config.rotationWeeks} weeks
            </h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">·</span>
                No one has more than {maxMemberCount} uncomfortable{" "}
                {maxMemberCount === 1 ? "meeting" : "meetings"}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">·</span>
                {isEven
                  ? "Burden is evenly distributed"
                  : `Burden differs by at most ${maxMemberCount - minMemberCount}`}
              </li>
            </ul>
          </div>
          <div className="space-y-2.5 pt-1">
            {burdenData.map((d) => (
              <div key={d.memberId} className="flex items-center gap-3">
                <span className="text-sm w-28 sm:w-36 truncate">{d.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-stretch/80"
                    style={{
                      width: `${(d.count / (maxCount * 1.2)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground/50">
            Created with{" "}
            <span className="font-medium text-primary/60"><ParallelWordmark /></span> — we
            shared the weight.
          </p>
        </div>
      </main>
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 animate-in fade-in-0 duration-300">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">
        Analyzing burden distribution…
      </p>
    </div>
  )
}

export function ParallelApp() {
  const searchParams = useSearchParams()
  const shareParam = searchParams?.get("d") ?? null

  const [shareData, setShareData] = useState<{
    team: TeamMember[]
    config: MeetingConfig
  } | null>(null)

  useEffect(() => {
    if (shareParam) {
      const decoded = decodeShareData(shareParam)
      if (decoded) setShareData(decoded)
    }
  }, [shareParam])

  const [team, setTeam] = useState<TeamMember[]>(defaultTeam)
  const [config, setConfig] = useState<MeetingConfig>(defaultConfig)
  const [rotation, setRotation] = useState<RotationWeekData[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [rotationError, setRotationError] = useState<string | null>(null)

  if (shareData) {
    return <ShareView team={shareData.team} config={shareData.config} />
  }

  const canGenerate = team.length >= 2 && team.every((m) => m.name.trim())

  const handleGenerate = () => {
    console.log("[DEBUG] Plan button clicked (ParallelApp)")

    const validation = canGenerateRotation(team, config)
    if (!validation.valid) {
      console.log("[DEBUG] Early return triggered: validation.valid=false", validation.reason)
      setRotationError(validation.reason || "No viable rotation.")
      setRotation(null)
      return
    }
    console.log("[DEBUG] Team length:", team?.length)
    setIsGenerating(true)
    setRotation(null)
    setRotationError(null)
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
        } else if (isNoViableTimeResult(result)) {
          setRotationError(
            "No viable meeting time. Adjust constraints or try suggested changes."
          )
        } else if (Array.isArray(result) && result.length === 0) {
          setRotationError(
            "Current constraints leave no viable rotation. Adjust hard boundary ranges."
          )
        } else if (isRotationResult(result)) {
          setRotation(result.weeks)
        }
      } catch (error) {
        console.error("[DEBUG] Error occurred:", error)
      }
      setIsGenerating(false)
    }, 1400)
  }

  const handleTeamChange = (newTeam: TeamMember[]) => {
    setTeam(newTeam)
    setRotation(null)
    setRotationError(null)
  }

  const handleConfigChange = (newConfig: MeetingConfig) => {
    setConfig(newConfig)
    setRotation(null)
    setRotationError(null)
  }

  return (
    <div className="min-h-screen">
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
        DEBUG BUILD ACTIVE (ParallelApp)
      </div>
      <Header />

      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <div className="mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
            Plan a fair rotation
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
            Someone will always stretch. Parallel distributes that burden
            intentionally.
          </p>
        </div>

        <div className="space-y-10 sm:space-y-12">
          <TeamSetup team={team} onTeamChange={handleTeamChange} />

          <MeetingConfiguration
            config={config}
            onConfigChange={handleConfigChange}
          />

          <div className="pt-2">
            <Button
              size="lg"
              className={cn(
                "w-full h-12 text-sm font-medium rounded-xl shadow-sm",
                "transition-all duration-200",
                !canGenerate && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canGenerate || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating
                ? "Planning…"
                : `Plan the next ${config.rotationWeeks} weeks fairly`}
            </Button>
            {!canGenerate && team.length >= 2 && (
              <p className="text-xs text-muted-foreground/60 text-center mt-2">
                Give each team member a name to continue.
              </p>
            )}
            {team.length < 2 && (
              <p className="text-xs text-muted-foreground/60 text-center mt-2">
                Add at least 2 team members.
              </p>
            )}
          </div>

          {isGenerating && <LoadingOverlay />}

          {rotationError && !isGenerating && (
            <div className="rounded-xl border border-stretch/40 bg-stretch/15 p-4 sm:p-5 text-center animate-in fade-in-0 duration-300">
              <p className="text-sm text-stretch-foreground">
                {rotationError}
              </p>
            </div>
          )}

          {rotation && !isGenerating && (
            <>
              <RotationOutput
                weeks={rotation}
                team={team}
                displayTimezone={ensureDisplayTimezoneIana(
                  config.displayTimezone ?? "America/New_York"
                )}
              />
              <FairnessSummary
                team={team}
                config={config}
                weeks={rotation}
              />
            </>
          )}
        </div>
      </main>

      <footer className="mt-16 sm:mt-24 border-t border-border/20">
        <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 sm:py-12 text-center">
          <p className="text-sm text-muted-foreground/40 leading-relaxed">
            We shared the weight.
          </p>
        </div>
      </footer>
    </div>
  )
}
