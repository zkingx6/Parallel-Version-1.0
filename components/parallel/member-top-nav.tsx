"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"
import { MemberAvatar } from "@/components/ui/avatar"

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
    "relative inline-flex items-center justify-center min-w-[4.5rem] px-4 py-1.5 rounded-lg text-[0.84rem] font-medium border-0 shrink-0 cursor-pointer transition-colors duration-200 bg-transparent"

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#edeef0]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <Link
          href={teamUrl}
          className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 shrink-0"
        >
          <span className="text-[#1a1a2e] text-[0.95rem] tracking-[-0.02em] font-semibold">
            <ParallelWordmark />
          </span>
        </Link>

        {/* Center: Tabs (Team | Schedule) */}
        {!hideNavTabs && (
          <nav className="flex items-center gap-1 shrink-0">
            <Link
              href={teamUrl}
              className={cn(
                tabBase,
                activeTab === "team" ? "text-[#1a1a2e]" : "text-[#9ca3af] hover:text-[#6b7280]"
              )}
            >
              Team
              <span
                className={cn(
                  "absolute bottom-[-9px] left-2 right-2 h-[2px] bg-[#0d9488] rounded-full pointer-events-none transition-opacity duration-150",
                  activeTab === "team" ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
            </Link>
            <Link
              href={scheduleUrl}
              className={cn(
                tabBase,
                activeTab === "schedule" ? "text-[#1a1a2e]" : "text-[#9ca3af] hover:text-[#6b7280]"
              )}
            >
              Schedule
              <span
                className={cn(
                  "absolute bottom-[-9px] left-2 right-2 h-[2px] bg-[#0d9488] rounded-full pointer-events-none transition-opacity duration-150",
                  activeTab === "schedule" ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
            </Link>
          </nav>
        )}

        {/* Right: Member avatar (links to account when available) */}
        <div className="shrink-0 flex items-center gap-3">
          {avatarLinksToAccount ? (
            <Link
              href={accountUrl}
              className={cn(
                "flex items-center justify-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/30 focus-visible:ring-offset-2 cursor-pointer",
                isAccount && "ring-2 ring-[#0d9488]/50 ring-offset-2"
              )}
              aria-label="Account"
            >
              <MemberAvatar
                avatarUrl={memberAvatarUrl ?? undefined}
                name={memberName || "?"}
                size="default"
              />
            </Link>
          ) : (
            <div
              className="flex items-center justify-center rounded-full"
              aria-label={`${memberName} (member)`}
            >
              <MemberAvatar
                avatarUrl={memberAvatarUrl ?? undefined}
                name={memberName || "?"}
                size="default"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
