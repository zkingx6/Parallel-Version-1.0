"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, ChevronRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { getMemberTeamSummary, getMemberDashboardData, getSchedulesForCurrentUser } from "@/lib/actions"
import { getStoredMemberTeams, addStoredMemberTeam } from "@/lib/member-teams-storage"
import { getCachedMember, setCachedMember } from "@/lib/member-avatar-cache"
import { MemberTopNav } from "@/components/parallel/member-top-nav"
import { ScheduleListContent } from "@/components/parallel/schedule-list-content"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

type TeamSummary = {
  token: string
  memberId: string
  meeting: { id: string; title: string; day_of_week: number; duration_minutes: number }
  memberCount: number
  cadence: string
}

function MissingParamsMessage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
          <ParallelWordmark />
        </h1>
        <p className="text-[0.88rem] text-[#9ca3af]">Missing token or member ID.</p>
        <p className="text-[0.82rem] text-[#9ca3af]/80">
          Use your invite link to join and access your dashboard.
        </p>
      </div>
    </main>
  )
}

export default function MemberDashboardPage() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") ?? null
  const memberId = searchParams?.get("memberId") ?? null
  const tab = searchParams?.get("tab") || "team"

  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [navMemberDisplay, setNavMemberDisplay] = useState<{ name: string; avatarUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && memberId) {
      addStoredMemberTeam(token, memberId)
    }
    const allTeams = getStoredMemberTeams()

    if (allTeams.length === 0) {
      setLoading(false)
      return
    }

    Promise.all(
      allTeams.map((t) => getMemberTeamSummary(t.token, t.memberId))
    ).then(async (results) => {
      const summaries: TeamSummary[] = []
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (r.error) continue
        if (r.data) summaries.push(r.data)
      }
      setTeams(summaries)
      if (summaries.length > 0) {
        const teamForNav =
          token && memberId
            ? { token, memberId }
            : { token: allTeams[0].token, memberId: allTeams[0].memberId }
        const d = await getMemberDashboardData(teamForNav.token, teamForNav.memberId)
        if (d.data?.memberDisplay) {
          setNavMemberDisplay(d.data.memberDisplay)
          setCachedMember(teamForNav.token, teamForNav.memberId, {
            name: d.data.memberDisplay.name,
            avatar_url: d.data.memberDisplay.avatarUrl,
            updated_at: undefined,
          })
        }
      }
      setLoading(false)
    })
  }, [token, memberId])

  const firstTeam = teams[0]
  const baseParams = firstTeam
    ? `token=${encodeURIComponent(firstTeam.token)}&memberId=${encodeURIComponent(firstTeam.memberId)}`
    : token && memberId
      ? `token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`
      : ""
  const teamUrl = `/member-dashboard?${baseParams}`
  const scheduleUrl = `/member-dashboard?${baseParams}&tab=schedule`
  const accountUrl = `/member-dashboard/account?${baseParams}`

  if (loading && teams.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <p className="text-[0.88rem] text-[#9ca3af]">Loading…</p>
      </main>
    )
  }

  if (!loading && teams.length === 0 && !token && !memberId) {
    return <MissingParamsMessage />
  }

  const teamForDisplay =
    token && memberId
      ? { token, memberId }
      : firstTeam
        ? { token: firstTeam.token, memberId: firstTeam.memberId }
        : null
  const cached = teamForDisplay ? getCachedMember(teamForDisplay.token, teamForDisplay.memberId) : null
  const displayName = navMemberDisplay?.name ?? cached?.name ?? ""
  const displayAvatarUrl = navMemberDisplay?.avatarUrl ?? cached?.avatar_url ?? ""

  if (tab === "schedule") {
    return (
      <ScheduleTab
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        scheduleLinkParams={baseParams}
        navMemberDisplay={navMemberDisplay}
        cachedMember={cached}
        meetingTitle={firstTeam?.meeting.title ?? ""}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <MemberTopNav
        memberName={displayName}
        memberAvatarUrl={displayAvatarUrl || undefined}
        meetingTitle={firstTeam?.meeting.title ?? "Teams"}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="team"
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <section className="mb-8">
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1 font-semibold">
              Teams
            </h1>
            <p className="text-[#9ca3af] text-[0.88rem]">
              Teams you&apos;ve joined. Click a team to view details.
            </p>
          </section>

          {teams.length === 0 ? (
            <section className="rounded-xl border border-[#edeef0] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-center">
              <p className="text-[0.88rem] text-[#9ca3af]">
                No teams yet. Use an invite link to join a team.
              </p>
            </section>
          ) : (
            <div className="space-y-2">
              {teams.map((t) => (
                <Link
                  key={`${t.token}-${t.memberId}`}
                  href={`/member-dashboard/team?token=${encodeURIComponent(t.token)}&memberId=${encodeURIComponent(t.memberId)}`}
                  className="group block bg-white rounded-xl border border-[#edeef0] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center shrink-0 group-hover:bg-[#ccfbf1] transition-colors duration-200">
                      <Users size={17} className="text-[#0d9488]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1a1a2e] text-[0.9rem] font-medium truncate">{t.meeting.title}</p>
                      <p className="text-[#b0b4bc] text-[0.78rem] mt-0.5">
                        {t.cadence}
                      </p>
                      <p className="text-[#b0b4bc] text-[0.78rem] mt-0.5">
                        {t.memberCount} members
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ScheduleTab({
  teamUrl,
  scheduleUrl,
  accountUrl,
  scheduleLinkParams,
  navMemberDisplay,
  cachedMember,
  meetingTitle,
}: {
  teamUrl: string
  scheduleUrl: string
  accountUrl: string
  scheduleLinkParams: string
  navMemberDisplay: { name: string; avatarUrl: string } | null
  cachedMember: { name: string; avatar_url?: string | null; updated_at?: string } | null
  meetingTitle: string
}) {
  const displayName = navMemberDisplay?.name ?? cachedMember?.name ?? ""
  const displayAvatarUrl = navMemberDisplay?.avatarUrl ?? cachedMember?.avatar_url ?? ""
  const [schedules, setSchedules] = useState<{ id: string; name: string; weeks: number; created_at: string; team_id: string }[]>([])
  const [teamTitles, setTeamTitles] = useState<Record<string, string>>({})
  const [scheduleLoading, setScheduleLoading] = useState(true)

  useEffect(() => {
    getSchedulesForCurrentUser().then((r) => {
      setScheduleLoading(false)
      if (r.data) {
        setSchedules(r.data.schedules)
        setTeamTitles(r.data.teamTitles)
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <MemberTopNav
        memberName={displayName}
        memberAvatarUrl={displayAvatarUrl || undefined}
        meetingTitle={meetingTitle || "Schedule"}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="schedule"
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1 font-semibold">
              Schedule
            </h1>
            <p className="text-[#9ca3af] text-[0.88rem]">
              Assigned meeting times and rotation entries across your teams.
            </p>
          </div>

          {scheduleLoading ? (
            <section className="rounded-xl border border-[#edeef0] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-center">
              <p className="text-[0.88rem] text-[#9ca3af]">Loading schedules…</p>
            </section>
          ) : (
            <ScheduleListContent
              schedules={schedules}
              teamTitles={teamTitles}
              showDeleteButton={false}
              emptyStateHref={teamUrl}
              scheduleBasePath="/member/schedule"
              scheduleLinkParams={scheduleLinkParams}
            />
          )}
        </div>
      </main>
    </div>
  )
}
