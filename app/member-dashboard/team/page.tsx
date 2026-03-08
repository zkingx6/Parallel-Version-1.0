"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getMemberDashboardData } from "@/lib/actions"
import { setCachedMember } from "@/lib/member-avatar-cache"
import { formatHourLabel } from "@/lib/types"
import { getTimezoneDisplayLabelNow } from "@/lib/timezone"
import { isComplementOfOverlapPattern } from "@/lib/hard-no-ranges"
import type { HardNoRange } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MemberTopNav } from "@/components/parallel/member-top-nav"

const DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

type MemberSubmission = {
  id: string
  name: string
  role: string | null
  is_owner_participant?: boolean
}

type DashboardData = {
  meeting: {
    id: string
    title: string
    day_of_week: number
    duration_minutes: number
  }
  member: {
    id: string
    name: string
    timezone: string
    work_start_hour: number
    work_end_hour: number
    hard_no_ranges: HardNoRange[]
    role: string | null
    avatar_url?: string | null
    updated_at?: string
  }
  memberCount: number
  members: MemberSubmission[]
}

export default function MemberTeamDetailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const memberId = searchParams.get("memberId")

  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !memberId) return
    getMemberDashboardData(token, memberId).then((result) => {
      if (result.error) setError(result.error)
      else if (result.data) {
        const d = result.data as DashboardData
        setData(d)
        setCachedMember(token, memberId, {
          name: d.member.name,
          avatar_url: d.member.avatar_url,
          updated_at: d.member.updated_at,
        })
      }
    })
  }, [token, memberId])

  if (!token || !memberId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[17px] font-semibold tracking-tight text-primary">
            Parallel
          </h1>
          <p className="text-sm text-muted-foreground">Missing token or member ID.</p>
          <Link
            href="/member-dashboard"
            className="text-sm text-primary hover:underline"
          >
            Back to teams
          </Link>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[17px] font-semibold tracking-tight text-primary">
            Parallel
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            href={`/member-dashboard?token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`}
            className="text-sm text-primary hover:underline"
          >
            Back to teams
          </Link>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  const { meeting, member, memberCount, members } = data
  const rawRanges: HardNoRange[] = Array.isArray(member.hard_no_ranges)
    ? (member.hard_no_ranges as HardNoRange[])
    : []
  const hardNoRanges = isComplementOfOverlapPattern(rawRanges) ? [] : rawRanges
  const editUrl = `/join/${token}?memberId=${member.id}`
  const baseParams = `token=${encodeURIComponent(token ?? "")}&memberId=${encodeURIComponent(member.id)}`
  const teamsListUrl = `/member-dashboard?${baseParams}`
  const scheduleUrl = `/member-dashboard?${baseParams}&tab=schedule`
  const accountUrl = `/member-dashboard/account?${baseParams}`

  const dayName = DAY_NAMES[meeting.day_of_week] ?? ""
  const meetingCadence = dayName
    ? `${meeting.duration_minutes} min, ${dayName}s`
    : `${meeting.duration_minutes} min, weekly`

  return (
    <div className="min-h-screen bg-background">
      <MemberTopNav
        memberName={member.name}
        memberAvatarUrl={
          member.avatar_url
            ? `${member.avatar_url}?v=${member.updated_at ?? ""}`
            : ""
        }
        meetingTitle={meeting.title}
        teamUrl={teamsListUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="team"
      />

      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <Link
          href={teamsListUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <span aria-hidden>←</span>
          Back to teams
        </Link>

        <section className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Team
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You&apos;re included in this team&apos;s rotation planning.
          </p>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6">
          <h2 className="text-sm font-semibold mb-2">Status</h2>
          <p className="text-sm font-medium text-foreground">
            You&apos;ve joined this team.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your availability has been saved and will be used in planning.
          </p>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Your info</h2>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Team:</span>{" "}
              <span className="font-medium">{meeting.title}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{member.name}</span>
            </p>
            {member.role && (
              <p>
                <span className="text-muted-foreground">Role:</span>{" "}
                <span className="font-medium">{member.role}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Timezone:</span>{" "}
              {getTimezoneDisplayLabelNow(member.timezone)}
            </p>
            <p>
              <span className="text-muted-foreground">Working hours:</span>{" "}
              {formatHourLabel(member.work_start_hour)} –{" "}
              {formatHourLabel(member.work_end_hour)}
            </p>
            <p>
              <span className="text-muted-foreground">Hard boundaries:</span>{" "}
              {hardNoRanges.length === 0
                ? "None"
                : `${hardNoRanges.length} ${hardNoRanges.length === 1 ? "range" : "ranges"}`}
            </p>
          </div>
          <div className="mt-4">
            <Link href={editUrl}>
              <Button variant="outline" size="sm">
                Edit my availability
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Team snapshot</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Team:</span>{" "}
              <span className="font-medium">{meeting.title}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Members submitted:</span>{" "}
              <span className="font-medium">{memberCount}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Cadence:</span>{" "}
              <span className="font-medium">{meetingCadence}</span>
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Team members</h2>
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="font-medium">{m.name}</span>
                {m.is_owner_participant && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Owner
                  </span>
                )}
                {m.role && (
                  <span className="text-muted-foreground">— {m.role}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border/50 bg-muted/30 p-5 mb-6">
          <p className="text-sm text-muted-foreground">
            The team owner manages rotation settings. You can update your
            availability before the deadline.
          </p>
        </section>
      </main>
    </div>
  )
}
