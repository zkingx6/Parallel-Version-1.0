"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMemberDashboardData } from "@/lib/actions"
import { getStoredMemberTeams } from "@/lib/member-teams-storage"
import { getCachedMember } from "@/lib/member-avatar-cache"
import { MemberTopNav } from "@/components/parallel/member-top-nav"

export function MemberLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const memberId = searchParams.get("memberId")

  const [navContext, setNavContext] = useState<{
    teamUrl: string
    scheduleUrl: string
    accountUrl: string
    meetingTitle: string
    memberName: string
    memberAvatarUrl: string
  } | null>(null)

  useEffect(() => {
    const params = token && memberId ? { token, memberId } : getStoredMemberTeams()[0]
    if (!params) {
      router.replace("/member-dashboard")
      return
    }
    const baseParams = `token=${encodeURIComponent(params.token)}&memberId=${encodeURIComponent(params.memberId)}`
    const teamUrl = `/member-dashboard?${baseParams}`
    const scheduleUrl = `/member-dashboard?${baseParams}&tab=schedule`
    const accountUrl = `/member-dashboard/account?${baseParams}`

    getMemberDashboardData(params.token, params.memberId).then((r) => {
      if (r.data?.memberDisplay) {
        setNavContext({
          teamUrl,
          scheduleUrl,
          accountUrl,
          meetingTitle: r.data.meeting?.title ?? "Teams",
          memberName: r.data.memberDisplay.name,
          memberAvatarUrl: r.data.memberDisplay.avatarUrl,
        })
      } else {
        const cached = getCachedMember(params.token, params.memberId)
        setNavContext({
          teamUrl,
          scheduleUrl,
          accountUrl,
          meetingTitle: "Teams",
          memberName: cached?.name ?? "",
          memberAvatarUrl: cached?.avatar_url ?? "",
        })
      }
    })
  }, [token, memberId, router])

  if (!navContext) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MemberTopNav
        memberName={navContext.memberName}
        memberAvatarUrl={navContext.memberAvatarUrl || undefined}
        meetingTitle={navContext.meetingTitle}
        teamUrl={navContext.teamUrl}
        scheduleUrl={navContext.scheduleUrl}
        accountUrl={navContext.accountUrl}
        activeTab="schedule"
      />
      {children}
    </div>
  )
}
