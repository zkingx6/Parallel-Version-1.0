"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getMemberTeamSummary, getMemberDashboardData } from "@/lib/actions"
import { getStoredMemberTeams, addStoredMemberTeam } from "@/lib/member-teams-storage"
import { MemberTopNav } from "@/components/parallel/member-top-nav"

type TeamSummary = {
  token: string
  memberId: string
  meeting: { id: string; title: string; day_of_week: number; duration_minutes: number }
  memberCount: number
  cadence: string
}

function MissingParamsMessage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-[17px] font-semibold tracking-tight text-primary">
          Parallel
        </h1>
        <p className="text-sm text-muted-foreground">Missing token or member ID.</p>
        <p className="text-xs text-muted-foreground/70">
          Use your invite link to join and access your dashboard.
        </p>
      </div>
    </main>
  )
}

export default function MemberDashboardPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const memberId = searchParams.get("memberId")
  const tab = searchParams.get("tab") || "team"

  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [navMember, setNavMember] = useState<{ name: string; avatar_url?: string | null; updated_at?: string } | null>(null)
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
    ).then((results) => {
      const summaries: TeamSummary[] = []
      let firstMember: { name: string; avatar_url?: string | null; updated_at?: string } | null = null
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        if (r.error) continue
        if (r.data) {
          summaries.push(r.data)
          if (i === 0 || !firstMember) {
            getMemberDashboardData(allTeams[i].token, allTeams[i].memberId).then(
              (d) => {
                if (d.data?.member) {
                  setNavMember(d.data.member)
                }
              }
            )
          }
        }
      }
      setTeams(summaries)
      if (!firstMember && summaries.length > 0) {
        getMemberDashboardData(allTeams[0].token, allTeams[0].memberId).then(
          (d) => {
            if (d.data?.member) setNavMember(d.data.member)
          }
        )
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
      <main className="min-h-screen flex items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  if (!loading && teams.length === 0 && !token && !memberId) {
    return <MissingParamsMessage />
  }

  if (tab === "schedule") {
    return (
      <ScheduleTab
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        navMember={navMember}
        meetingTitle={firstTeam?.meeting.title ?? ""}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MemberTopNav
        memberName={navMember?.name ?? ""}
        memberAvatarUrl={
          navMember?.avatar_url
            ? `${navMember.avatar_url}?v=${navMember.updated_at ?? ""}`
            : ""
        }
        meetingTitle={firstTeam?.meeting.title ?? "Teams"}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="team"
      />

      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <section className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Teams
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Teams you&apos;ve joined. Click a team to view details.
          </p>
        </section>

        {teams.length === 0 ? (
          <section className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No teams yet. Use an invite link to join a team.
            </p>
          </section>
        ) : (
          <div className="space-y-2">
            {teams.map((t) => (
              <Link
                key={`${t.token}-${t.memberId}`}
                href={`/member-dashboard/team?token=${encodeURIComponent(t.token)}&memberId=${encodeURIComponent(t.memberId)}`}
                className="block rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:border-primary/20 transition-colors"
              >
                <p className="font-medium">{t.meeting.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t.cadence}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Members: {t.memberCount}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ScheduleTab({
  teamUrl,
  scheduleUrl,
  accountUrl,
  navMember,
  meetingTitle,
}: {
  teamUrl: string
  scheduleUrl: string
  accountUrl: string
  navMember: { name: string; avatar_url?: string | null; updated_at?: string } | null
  meetingTitle: string
}) {
  return (
    <div className="min-h-screen bg-background">
      <MemberTopNav
        memberName={navMember?.name ?? ""}
        memberAvatarUrl={
          navMember?.avatar_url
            ? `${navMember.avatar_url}?v=${navMember.updated_at ?? ""}`
            : ""
        }
        meetingTitle={meetingTitle || "Schedule"}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="schedule"
      />

      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <section className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Schedule
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Your schedule
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Assigned meeting times and rotation entries across your teams.
          </p>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-8 mb-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">
            No schedule has been published yet.
          </p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Team owners have not finalized rotations. Once schedules are
            generated, your assigned meeting times will appear here.
          </p>
        </section>
      </main>
    </div>
  )
}
