import { TeamMember, BurdenRecord } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type BurdenState = {
  label: string
  level: "high" | "elevated" | "moderate" | "low"
}

function getBurdenState(
  percent: number,
  rank: number,
  total: number
): BurdenState {
  if (rank === 0) return { label: "carrying the most", level: "high" }
  if (percent >= 40) return { label: "high burden", level: "high" }
  if (percent >= 30) return { label: "above average", level: "elevated" }
  if (rank === total - 1) return { label: "lightest load", level: "low" }
  if (percent >= 25) return { label: "moderate", level: "moderate" }
  return { label: "low burden", level: "low" }
}

function BurdenBar({
  record,
  member,
  state,
}: {
  record: BurdenRecord
  member: TeamMember
  state: BurdenState
}) {
  const { comfortable, stretch, sacrifice, total, burdenPercent } = record
  const comfortPct = (comfortable / total) * 100
  const stretchPct = (stretch / total) * 100
  const sacrificePct = (sacrifice / total) * 100
  const isHigh = state.level === "high" || state.level === "elevated"

  return (
    <div
      className={cn(
        "py-4 sm:py-5 transition-colors",
        isHigh
          ? "border-l-2 border-l-sacrifice/50 pl-4 sm:pl-5"
          : "pl-0 sm:pl-0"
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
              {member.initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{member.name}</span>
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            state.level === "high" && "text-sacrifice-foreground",
            state.level === "elevated" && "text-stretch-foreground",
            state.level === "moderate" && "text-muted-foreground",
            state.level === "low" && "text-comfortable-foreground"
          )}
        >
          {state.label}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden flex gap-px">
        {comfortPct > 0 && (
          <div
            className="bg-comfortable rounded-l-full transition-all duration-500"
            style={{ width: `${comfortPct}%` }}
          />
        )}
        {stretchPct > 0 && (
          <div
            className="bg-stretch transition-all duration-500"
            style={{ width: `${stretchPct}%` }}
          />
        )}
        {sacrificePct > 0 && (
          <div
            className="bg-sacrifice rounded-r-full transition-all duration-500"
            style={{ width: `${sacrificePct}%` }}
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <div className="flex gap-3 text-muted-foreground">
          {sacrifice > 0 && (
            <span className="text-sacrifice-foreground">
              {sacrifice} sacrifice
            </span>
          )}
          {stretch > 0 && (
            <span>
              <span className="text-stretch-foreground font-medium">
                {stretch}
              </span>{" "}
              <span className="italic text-stretch-foreground">stretch</span>
            </span>
          )}
          <span>{comfortable} comfortable</span>
        </div>
        <span className="tabular-nums text-muted-foreground/40">
          {burdenPercent}%
        </span>
      </div>
    </div>
  )
}

export function BurdenOverview({
  team,
  burden,
}: {
  team: TeamMember[]
  burden: BurdenRecord[]
}) {
  const memberMap = Object.fromEntries(team.map((m) => [m.id, m]))
  const sorted = [...burden].sort((a, b) => b.burdenPercent - a.burdenPercent)
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]
  const highestMember = memberMap[highest.memberId]
  const lowestMember = memberMap[lowest.memberId]
  const ratio =
    Math.round((highest.burdenPercent / lowest.burdenPercent) * 10) / 10

  return (
    <section>
      <div className="mb-8 sm:mb-10">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Who carries the weight
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80 max-w-xl">
          <strong className="text-foreground font-semibold">
            {highestMember.name}
          </strong>{" "}
          has absorbed{" "}
          <span className="text-sacrifice-foreground font-semibold">
            {ratio}×
          </span>{" "}
          more meeting inconvenience than {lowestMember.name} over the past 12
          weeks.{" "}
          <span className="text-muted-foreground">
            That gap is structural, not incidental.
          </span>
        </p>
      </div>

      <div className="divide-y divide-border/30">
        {sorted.map((record, index) => {
          const member = memberMap[record.memberId]
          if (!member) return null
          const state = getBurdenState(
            record.burdenPercent,
            index,
            sorted.length
          )
          return (
            <BurdenBar
              key={record.memberId}
              record={record}
              member={member}
              state={state}
            />
          )
        })}
      </div>

      <div className="mt-4 text-[11px] text-muted-foreground/40">
        <span>Past 12 weeks · sorted by burden · weighted inconvenience score</span>
      </div>
    </section>
  )
}
