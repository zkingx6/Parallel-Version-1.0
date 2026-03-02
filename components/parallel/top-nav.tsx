"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSetup } from "@/lib/setup-context"

export function TopNav() {
  const pathname = usePathname()
  const { isSetupComplete, firstMeetingId } = useSetup()

  const meetingIdFromUrl = (() => {
    const teamMatch = pathname?.match(/^\/team\/([^/]+)/)
    const rotationMatch = pathname?.match(/^\/rotation\/([^/]+)/)
    return teamMatch?.[1] ?? rotationMatch?.[1] ?? null
  })()

  // Use URL meeting ID if valid (not "rotation-settings"), else first meeting from context.
  const targetMeetingId =
    meetingIdFromUrl && meetingIdFromUrl !== "rotation-settings"
      ? meetingIdFromUrl
      : firstMeetingId

  // Team/Rotation enabled when: isSetupComplete (meetings.length > 0 from /meetings) OR valid meetingId in URL.
  const teamRotationEnabled =
    isSetupComplete || (meetingIdFromUrl && meetingIdFromUrl !== "rotation-settings")

  // Explicit route-to-tab mapping (not startsWith) so /team/rotation-settings highlights Meetings.
  const activeTab = (() => {
    if (pathname === "/meetings") return "meetings"
    if (pathname?.startsWith("/team/rotation-settings")) return "meetings"
    if (pathname?.startsWith("/team/")) return "team"
    if (pathname?.startsWith("/rotation/")) return "rotation"
    return null
  })()
  const isMeetings = activeTab === "meetings"
  const isTeam = activeTab === "team"
  const isRotation = activeTab === "rotation"
  const isAccount = pathname?.startsWith("/settings")

  const tabBase =
    "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-transparent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const tabInactive =
    "text-neutral-600 hover:bg-neutral-100 hover:border-neutral-200 hover:text-neutral-900"
  const tabActive =
    "bg-neutral-100 border-neutral-200 text-neutral-900"
  const tabDisabled =
    "cursor-not-allowed pointer-events-none text-neutral-400 border-transparent"

  const getTabClass = (isActive: boolean) =>
    cn(tabBase, isActive ? tabActive : tabInactive)

  return (
    <header className="relative z-10 w-full shrink-0 border-b border-border/40 bg-background">
      {/* z-10 + bg-background: ensures nav stays above page content and receives clicks.
          Without this, page content (e.g. on /team/rotation-settings) can create stacking
          contexts that overlay the center nav (Team/Rotation) and block pointer events. */}
      <div className="relative flex items-center justify-between h-16 pl-8 pr-8">
        {/* Left: Logo */}
        <div className="shrink-0">
          <Link
            href="/meetings"
            className="text-lg font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            Parallel
          </Link>
        </div>

        {/* Center: Tabs (Meetings | Team | Rotation) */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm">
          <Link
            href="/meetings"
            className={getTabClass(isMeetings)}
          >
            Meetings
          </Link>
          {teamRotationEnabled && targetMeetingId ? (
            <>
              <Link
                href={`/team/${targetMeetingId}`}
                className={getTabClass(isTeam)}
              >
                Team
              </Link>
              <Link
                href={`/rotation/${targetMeetingId}`}
                className={getTabClass(isRotation)}
              >
                Rotation
              </Link>
            </>
          ) : (
            <>
              <span className={cn(tabBase, tabDisabled)}>Team</span>
              <span className={cn(tabBase, tabDisabled)}>Rotation</span>
            </>
          )}
        </nav>

        {/* Right: Account */}
        <div className="shrink-0">
          <Link
            href="/settings"
            className={cn(
              "text-sm font-medium transition-colors",
              isAccount ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Account
          </Link>
        </div>
      </div>
    </header>
  )
}
