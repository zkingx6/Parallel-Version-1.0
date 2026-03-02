"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function TopNav() {
  const pathname = usePathname()

  const meetingId = (() => {
    const teamMatch = pathname?.match(/^\/team\/([^/]+)/)
    const rotationMatch = pathname?.match(/^\/rotation\/([^/]+)/)
    return teamMatch?.[1] ?? rotationMatch?.[1] ?? null
  })()

  const isMeetings = pathname === "/meetings"
  const isTeam = pathname?.startsWith("/team")
  const isRotation = pathname?.startsWith("/rotation")
  const isAccount = pathname?.startsWith("/settings")

  const navLinkBase = "text-sm font-medium transition-colors"
  const navLinkInactive = "text-muted-foreground hover:text-foreground"
  const navLinkActive = "text-foreground"

  return (
    <header className="w-full border-b border-border/40 shrink-0">
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
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 text-sm">
          <Link
            href="/meetings"
            className={cn(navLinkBase, isMeetings ? navLinkActive : navLinkInactive)}
          >
            Meetings
          </Link>
          {meetingId ? (
            <>
              <Link
                href={`/team/${meetingId}`}
                className={cn(navLinkBase, isTeam ? navLinkActive : navLinkInactive)}
              >
                Team
              </Link>
              <Link
                href={`/rotation/${meetingId}`}
                className={cn(navLinkBase, isRotation ? navLinkActive : navLinkInactive)}
              >
                Rotation
              </Link>
            </>
          ) : (
            <>
              <span className={cn(navLinkBase, "text-muted-foreground/50 cursor-default")}>
                Team
              </span>
              <span className={cn(navLinkBase, "text-muted-foreground/50 cursor-default")}>
                Rotation
              </span>
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
