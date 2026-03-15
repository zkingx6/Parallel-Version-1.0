/**
 * Informational callout for member-facing pages.
 * Explains that availability is locked after joining.
 * Use on member dashboard, team, account, and schedule pages.
 * @param compact When true, use tighter padding/margin (e.g. inside a card).
 */
export function AvailabilityLockedNotice({ compact }: { compact?: boolean } = {}) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-[#0d9488]/20 bg-[#f0fdfa]/80 px-3 py-2 mt-3"
          : "rounded-lg border border-[#0d9488]/20 bg-[#f0fdfa]/80 px-3 py-2 mb-4"
      }
    >
      <p className="text-[0.82rem] text-[#1a1a2e] leading-snug">
        Your availability is locked after joining because it affects the team&apos;s rotation planning.
      </p>
      <p className="text-[0.82rem] text-[#6b7280] leading-snug mt-1">
        If your availability changes, contact the team owner or join another team that fits your schedule.
      </p>
    </div>
  )
}
