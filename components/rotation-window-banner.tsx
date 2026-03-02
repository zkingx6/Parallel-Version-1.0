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
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
      {/* Left section */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Rotation Window
        </p>
        <p className="mt-0.5 text-base font-medium text-neutral-800">
          {isOpen
            ? "Availability updates are OPEN"
            : "Rotation inputs are LOCKED"}
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">
          Deadline: {mockState.deadlineText}
        </p>
      </div>

      {/* Center section */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-400 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500">
          {mockState.updatesSubmitted} of {mockState.totalMembers} members
          updated availability
        </p>
      </div>

      {/* Right section */}
      <div className="shrink-0">
        {isOpen ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
            Locking in {mockState.hoursRemaining} hours
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600">
            Locked for next rotation
          </span>
        )}
      </div>
    </div>
  )
}
