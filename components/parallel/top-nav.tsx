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

  const targetMeetingId =
    meetingIdFromUrl && meetingIdFromUrl !== "rotation-settings"
      ? meetingIdFromUrl
      : firstMeetingId

  const teamRotationEnabled =
    isSetupComplete || (meetingIdFromUrl && meetingIdFromUrl !== "rotation-settings")

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

  const navItems = [
    { label: "Teams", path: "/teams", isActive: isMeetings },
    {
      label: "Rotation",
      path: teamRotationEnabled && targetMeetingId ? `/rotation/${targetMeetingId}` : null,
      isActive: isRotation,
      disabled: !teamRotationEnabled || !targetMeetingId,
    },
    { label: "Schedule", path: "/schedule", isActive: isSchedule },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#edeef0]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/teams"
          className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0"
        >
          <span className="text-[#1a1a2e] text-[0.95rem] tracking-[-0.02em] font-semibold">
            Parallel
          </span>
        </Link>

        {/* Nav tabs — stable layout: same font-weight for all, absolute underline, no layout animation */}
        <nav className="flex items-center gap-1 shrink-0">
          {navItems.map((item) => {
            const tabBase =
              "relative inline-flex items-center justify-center min-w-[4.5rem] px-4 py-1.5 rounded-lg text-[0.84rem] font-medium border-0 shrink-0"
            if (item.disabled) {
              return (
                <span
                  key={item.label}
                  className={cn(tabBase, "cursor-not-allowed pointer-events-none text-[#9ca3af]/60")}
                >
                  {item.label}
                </span>
              )
            }
            return (
              <Link
                key={item.label}
                href={item.path!}
                className={cn(
                  tabBase,
                  "cursor-pointer transition-colors duration-200 bg-transparent",
                  item.isActive ? "text-[#1a1a2e]" : "text-[#9ca3af] hover:text-[#6b7280]"
                )}
              >
                {item.label}
                {/* Underline: absolutely positioned, does not affect flow; no layoutId to avoid animation-induced shift */}
                <span
                  className={cn(
                    "absolute bottom-[-9px] left-2 right-2 h-[2px] bg-[#0d9488] rounded-full pointer-events-none transition-opacity duration-150",
                    item.isActive ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
              </Link>
            )
          })}
        </nav>

        {/* Avatar */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center justify-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/30 focus-visible:ring-offset-2 cursor-pointer",
            isAccount && "ring-2 ring-[#0d9488]/50 ring-offset-2"
          )}
          aria-label="Account"
        >
          <MemberAvatar
              avatarUrl={userAvatar || undefined}
              name={userName || "?"}
              size="default"
            />
        </Link>
      </div>
    </header>
  )
}
