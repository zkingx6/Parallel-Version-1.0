"use client"

import { useState } from "react"
import { TeamMember, MeetingConfig, RotationWeekData } from "@/lib/types"
import {
  getBurdenCounts,
  hasConsecutiveStretch,
  encodeShareData,
} from "@/lib/rotation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

export function FairnessSummary({
  team,
  config,
  weeks,
}: {
  team: TeamMember[]
  config: MeetingConfig
  weeks: RotationWeekData[]
}) {
  const [copied, setCopied] = useState(false)
  const burdenData = getBurdenCounts(weeks, team)
  const maxCount = Math.max(...burdenData.map((d) => d.count), 1)
  const maxMemberCount = Math.max(...burdenData.map((d) => d.count))
  const minMemberCount = Math.min(...burdenData.map((d) => d.count))
  const isEven = maxMemberCount - minMemberCount <= 1
  const consecutive = hasConsecutiveStretch(weeks, team)
  const burdenCarriers = burdenData.filter((d) => d.count > 0).length
  const onlyPartialBurden =
    burdenCarriers > 0 && burdenCarriers < team.length && !isEven

  const handleShare = async () => {
    const encoded = encodeShareData(team, config)
    const url = `${window.location.origin}${window.location.pathname}?d=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard may not be available */
    }
  }

  return (
    <section
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both"
      style={{ animationDelay: `${weeks.length * 80 + 200}ms` }}
    >
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-3">
            Over {config.rotationWeeks} weeks
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {burdenCarriers > 0 && burdenCarriers < team.length && (
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-0.5">·</span>
                {burdenCarriers} of {team.length} members carry the burden this
                cycle
              </li>
            )}
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
            {onlyPartialBurden && (
              <li className="flex items-start gap-2">
                <span className="text-stretch-foreground mt-0.5">·</span>
                Consider adjusting constraints or widening candidate times to
                redistribute
              </li>
            )}
          </ul>
        </div>

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

        <div className="pt-2 border-t border-border/30">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-xs h-8 w-full sm:w-auto",
              copied && "bg-primary/10 text-primary border-primary/30"
            )}
            onClick={handleShare}
          >
            {copied ? "Link copied" : "Generate share link"}
          </Button>
        </div>
      </div>
    </section>
  )
}
