"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSetup } from "@/lib/setup-context"
import { MemberAvatar } from "@/components/ui/avatar"

type TopNavProps = {
  userEmail: string
  userName: string
  userAvatar: string
}

export function TopNav({ userEmail, userName, userAvatar }: TopNavProps) {
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

  // Team/Rotation enabled when: isSetupComplete (meetings.length > 0 from /teams) OR valid meetingId in URL.
  const teamRotationEnabled =
    isSetupComplete || (meetingIdFromUrl && meetingIdFromUrl !== "rotation-settings")

  // Explicit route-to-tab mapping.
  const activeTab = (() => {
    if (pathname === "/teams") return "meetings"
    if (pathname?.startsWith("/team/rotation-settings")) return "meetings"
    if (pathname?.startsWith("/team/")) return "meetings"
    if (pathname?.startsWith("/rotation/")) return "rotation"
    if (pathname?.startsWith("/schedule")) return "schedule"
    return null
  })()
  const isMeetings = activeTab === "meetings"
  const isRotation = activeTab === "rotation"
  const isSchedule = activeTab === "schedule"
  const isAccount = pathname?.startsWith("/settings")

  const tabBase =
    "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-transparent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const tabInactive =
    "text-muted-foreground hover:bg-accent/50 hover:border-border hover:text-foreground"
  const tabActive =
    "bg-accent/60 border-border text-foreground"
  const tabDisabled =
    "cursor-not-allowed pointer-events-none text-muted-foreground/60 border-transparent"

  const getTabClass = (isActive: boolean) =>
    cn(tabBase, isActive ? tabActive : tabInactive)

  return (
    <header className="relative z-10 w-full shrink-0 border-b border-border/40 bg-navbar backdrop-blur-sm">
      {/* z-10 + bg-navbar: navbar has subtle secondary tint for visual separation from content.
          Without this, page content (e.g. on /team/rotation-settings) can create stacking
          contexts that overlay the center nav (Team/Rotation) and block pointer events. */}
      <div className="relative flex items-center justify-between h-16 pl-8 pr-8">
        {/* Left: Logo */}
        <div className="shrink-0">
          <Link
            href="/teams"
            className="text-lg font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            Parallel
          </Link>
        </div>

        {/* Center: Tabs (Teams | Rotation | Schedule) */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm">
          <Link
            href="/teams"
            className={getTabClass(isMeetings)}
          >
            Teams
          </Link>
          {teamRotationEnabled && targetMeetingId ? (
            <Link
              href={`/rotation/${targetMeetingId}`}
              className={getTabClass(isRotation)}
            >
              Rotation
            </Link>
          ) : (
            <span className={cn(tabBase, tabDisabled)}>Rotation</span>
          )}
          <Link href="/schedule" className={getTabClass(isSchedule)}>
            Schedule
          </Link>
        </nav>

        {/* Right: Account avatar */}
        <div className="shrink-0">
          <Link
            href="/settings"
            className={cn(
              "flex items-center justify-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isAccount && "ring-2 ring-ring ring-offset-2 ring-offset-background"
            )}
            aria-label="Account"
          >
            <MemberAvatar
              avatarUrl={userAvatar || undefined}
              name={userName || userEmail?.split("@")[0] || "?"}
              size="default"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}
