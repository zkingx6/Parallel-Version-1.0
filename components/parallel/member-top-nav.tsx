"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type MemberTopNavProps = {
  memberName: string
  memberAvatarUrl?: string | null
  meetingTitle: string
  teamUrl: string
  scheduleUrl: string
  accountUrl: string
  /** Which tab is active: team | schedule. Avatar links to account. */
  activeTab?: "team" | "schedule"
  /** When true, hide center nav tabs (e.g. first-time join before dashboard exists) */
  hideNavTabs?: boolean
  /** When false, avatar is not a link (e.g. first-time join before account exists) */
  avatarLinksToAccount?: boolean
}

export function MemberTopNav({
  memberName,
  memberAvatarUrl,
  meetingTitle,
  teamUrl,
  scheduleUrl,
  accountUrl,
  activeTab = "team",
  hideNavTabs = false,
  avatarLinksToAccount = true,
}: MemberTopNavProps) {
  const pathname = usePathname()
  const isAccount = pathname?.includes("/member-dashboard/account")

  const tabBase =
    "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-transparent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const tabInactive =
    "text-neutral-600 hover:bg-neutral-100 hover:border-neutral-200 hover:text-neutral-900"
  const tabActive = "bg-neutral-100 border-neutral-200 text-neutral-900"

  const nameForInitials = (memberName || "").trim()
  const isRoleLabel = /^(member|owner)$/i.test(nameForInitials)
  const rawInitials =
    !isRoleLabel && nameForInitials
      ? nameForInitials
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : ""
  const initials = rawInitials || "?"

  return (
    <header className="relative z-10 w-full shrink-0 border-b border-border/40 bg-background">
      <div className="relative flex items-center justify-between h-16 pl-8 pr-8">
        {/* Left: Logo */}
        <div className="shrink-0">
          <Link
            href={teamUrl}
            className="text-lg font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            Parallel
          </Link>
        </div>

        {/* Center: Tabs (Team | Schedule) */}
        {!hideNavTabs && (
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm">
            <Link
              href={teamUrl}
              className={cn(tabBase, activeTab === "team" ? tabActive : tabInactive)}
            >
              Team
            </Link>
            <Link
              href={scheduleUrl}
              className={cn(tabBase, activeTab === "schedule" ? tabActive : tabInactive)}
            >
              Schedule
            </Link>
          </nav>
        )}

        {/* Right: Member avatar (links to account when available) */}
        <div className="shrink-0 flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
            {meetingTitle}
          </span>
          {avatarLinksToAccount ? (
            <Link
              href={accountUrl}
              className={cn(
                "flex items-center justify-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isAccount && "ring-2 ring-neutral-300 ring-offset-2 ring-offset-background"
              )}
              aria-label="Account"
            >
              <Avatar className="size-8">
                {memberAvatarUrl ? (
                  <AvatarImage src={memberAvatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="text-xs" delayMs={0}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <div
              className="flex items-center justify-center rounded-full"
              aria-label={`${memberName} (member)`}
            >
              <Avatar className="size-8">
                {memberAvatarUrl ? (
                  <AvatarImage src={memberAvatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="text-xs" delayMs={0}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
