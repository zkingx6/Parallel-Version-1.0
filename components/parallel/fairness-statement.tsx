import { TeamMember, BurdenRecord, RotationWeek } from "@/lib/types"

export function FairnessStatement({
  team,
  burden,
  rotation,
}: {
  team: TeamMember[]
  burden: BurdenRecord[]
  rotation: RotationWeek[]
}) {
  const memberMap = Object.fromEntries(team.map((m) => [m.id, m]))
  const sorted = [...burden].sort((a, b) => b.burdenPercent - a.burdenPercent)

  const assignedIds = new Set(rotation.map((r) => r.memberId))
  const protectedMembers = sorted.filter((b) => !assignedIds.has(b.memberId))
  const assignedMembers = sorted.filter((b) => assignedIds.has(b.memberId))

  const assignmentCounts: Record<string, number> = {}
  for (const week of rotation) {
    assignmentCounts[week.memberId] =
      (assignmentCounts[week.memberId] || 0) + 1
  }

  return (
    <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
      <div className="border-l-2 border-l-foreground/15 pl-5 sm:pl-7 space-y-4 py-1">
        {protectedMembers.length > 0 && (
          <p className="text-[15px] sm:text-base font-medium leading-relaxed text-foreground">
            {protectedMembers.map((b, i) => (
              <span key={b.memberId}>
                {i > 0 && (i === protectedMembers.length - 1 ? " and " : ", ")}
                {memberMap[b.memberId]?.name}
              </span>
            ))}{" "}
            {protectedMembers.length === 1 ? "is" : "are"} protected this
            cycle.
          </p>
        )}

        {protectedMembers.length > 0 && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {protectedMembers.length === 1 ? "This person has" : "They\u2019ve"}{" "}
            carried the highest meeting burden on your team —{" "}
            {protectedMembers.map((b, i) => (
              <span key={b.memberId}>
                {i > 0 && (i === protectedMembers.length - 1 ? " and " : ", ")}
                <span className="font-medium text-foreground/70">
                  {b.burdenPercent}%
                </span>
              </span>
            ))}{" "}
            — consistently over the past 12 weeks. This rotation gives them
            relief from inconvenient slots.
          </p>
        )}

        {assignedMembers.length > 0 && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {assignedMembers.map((b, i) => {
              const count = assignmentCounts[b.memberId] || 0
              return (
                <span key={b.memberId}>
                  {i > 0 && (i === assignedMembers.length - 1 ? " and " : ", ")}
                  <span className="text-foreground/80 font-medium">
                    {memberMap[b.memberId]?.name}
                  </span>{" "}
                  <span className="text-muted-foreground/60">
                    ({count} {count === 1 ? "slot" : "slots"})
                  </span>
                </span>
              )
            })}{" "}
            will share the{" "}
            <span className="italic text-stretch-foreground">stretch</span>{" "}
            slots this cycle. The distribution among them is even.
          </p>
        )}

        <div className="pt-3">
          <p className="text-[13px] text-muted-foreground/50 leading-relaxed">
            This is not optimization. It&apos;s a decision about who has given
            enough, and whose turn it is to give.
          </p>
        </div>
      </div>
    </section>
  )
}
