/**
 * Rotation Window / Lock Status banner (UI prototype only).
 * All data is hardcoded mock data. No logic, no hooks, no API calls.
 */

const mockState = {
  phase: "open" as "open" | "locked",
  deadlineText: "Sunday 6:00 PM (Team Time)",
  updatesSubmitted: 2,
  totalMembers: 5,
  hoursRemaining: 18,
}

/** Progress: hours remaining in a 24h window. 18h left = 75% bar. */
const progressPercent = Math.min(100, (mockState.hoursRemaining / 24) * 100)

export function RotationWindowBanner() {
  const isOpen = mockState.phase === "open"

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/30 px-6 py-4 md:flex-row md:items-center md:justify-between">
      {/* Left section */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Rotation Window
        </p>
        <p className="mt-0.5 text-base font-medium text-foreground">
          {isOpen
            ? "Availability updates are OPEN"
            : "Rotation inputs are LOCKED"}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Deadline: {mockState.deadlineText}
        </p>
      </div>

      {/* Center section */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary/60 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {mockState.updatesSubmitted} of {mockState.totalMembers} members
          updated availability
        </p>
      </div>

      {/* Right section */}
      <div className="shrink-0">
        {isOpen ? (
          <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
            Locking in {mockState.hoursRemaining} hours
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            Locked for next rotation
          </span>
        )}
      </div>
    </div>
  )
}
