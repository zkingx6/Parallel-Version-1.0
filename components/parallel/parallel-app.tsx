"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  TeamMember,
  MeetingConfig,
  RotationWeekData,
  getAnchorLabel,
} from "@/lib/types"
import {
  generateRotation,
  canGenerateRotation,
  decodeShareData,
  getBurdenCounts,
} from "@/lib/rotation"
import { Header } from "./header"
import { TeamSetup } from "./team-setup"
import { MeetingConfiguration } from "./meeting-config"
import { RotationOutput } from "./rotation-output"
import { FairnessSummary } from "./fairness-summary"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const defaultTeam: TeamMember[] = [
  {
    id: "m-1",
    name: "Alex Rivera",
    utcOffset: -8,
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "AR",
  },
  {
    id: "m-2",
    name: "Maria Weber",
    utcOffset: 1,
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "MW",
  },
  {
    id: "m-3",
    name: "Kenji Tanaka",
    utcOffset: 9,
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
}

function ShareView({
  team,
  config,
}: {
  team: TeamMember[]
  config: MeetingConfig
}) {
  const weeks = generateRotation(team, config)
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
                  {getAnchorLabel(m.utcOffset)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <RotationOutput
          weeks={weeks}
          team={team}
          anchorOffset={config.anchorOffset}
        />

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

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground/50">
            Created with{" "}
            <span className="font-medium text-primary/60">Parallel</span> — we
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
  const shareParam = searchParams.get("d")

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
        setRotationError(
          "Current constraints leave no viable rotation. Adjust hard boundary ranges."
        )
      } else {
        setRotation(weeks)
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
                anchorOffset={config.anchorOffset}
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
