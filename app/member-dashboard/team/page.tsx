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
import { PageBackLink } from "@/components/ui/page-back-link"
import { MemberAvatar } from "@/components/ui/avatar"
import { MemberTopNav } from "@/components/parallel/member-top-nav"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"

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
  memberDisplay: { name: string; avatarUrl: string }
  memberCount: number
  members: MemberSubmission[]
  membersDisplay: Record<string, { name: string; avatarUrl: string }>
}

export default function MemberTeamDetailPage() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") ?? null
  const memberId = searchParams?.get("memberId") ?? null

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
          name: d.memberDisplay.name,
          avatar_url: d.memberDisplay.avatarUrl,
          updated_at: undefined,
        })
      }
    })
  }, [token, memberId])

  if (!token || !memberId) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
            <ParallelWordmark />
          </h1>
          <p className="text-[0.88rem] text-[#9ca3af]">Missing token or member ID.</p>
          <PageBackLink href="/member-dashboard">Back to teams</PageBackLink>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
            <ParallelWordmark />
          </h1>
          <p className="text-[0.88rem] text-[#9ca3af]">{error}</p>
          <PageBackLink
            href={`/member-dashboard?token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`}
          >
            Back to teams
          </PageBackLink>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <p className="text-[0.88rem] text-[#9ca3af]">Loading…</p>
      </main>
    )
  }

  const { meeting, member, memberDisplay, memberCount, members, membersDisplay } = data
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
    <div className="min-h-screen bg-[#f7f8fa]">
      <MemberTopNav
        memberName={memberDisplay.name}
        memberAvatarUrl={memberDisplay.avatarUrl || undefined}
        meetingTitle={meeting.title}
        teamUrl={teamsListUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="team"
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <PageBackLink href={teamsListUrl} className="mb-6">Back to teams</PageBackLink>

          <section className="mb-8">
            <p className="text-[#9ca3af] text-[0.82rem] mb-1">Team</p>
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
              {meeting.title}
            </h1>
            <p className="text-[#9ca3af] text-[0.88rem] mt-1">
              You&apos;re included in this team&apos;s rotation planning.
            </p>
          </section>

          <section className="rounded-xl border border-[#0d9488]/20 bg-[#f0fdfa] p-5 mb-6">
            <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-2">Status</h2>
            <p className="text-[0.88rem] font-medium text-[#1a1a2e]">
              You&apos;ve joined this team.
            </p>
            <p className="text-[0.88rem] text-[#9ca3af] mt-1">
              Your availability has been saved and will be used in planning.
            </p>
          </section>

          <section className="rounded-xl border border-[#edeef0] bg-white p-5 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Your info</h2>
          <div className="space-y-3 text-[0.88rem]">
            <p>
              <span className="text-[#9ca3af]">Team:</span>{" "}
              <span className="font-medium text-[#1a1a2e]">{meeting.title}</span>
            </p>
            <p>
              <span className="text-[#9ca3af]">Name:</span>{" "}
              <span className="font-medium text-[#1a1a2e]">{memberDisplay.name}</span>
            </p>
            {member.role && (
              <p>
                <span className="text-[#9ca3af]">Role:</span>{" "}
                <span className="font-medium text-[#1a1a2e]">{member.role}</span>
              </p>
            )}
            <p>
              <span className="text-[#9ca3af]">Timezone:</span>{" "}
              <span className="text-[#1a1a2e]">{getTimezoneDisplayLabelNow(member.timezone)}</span>
            </p>
            <p>
              <span className="text-[#9ca3af]">Working hours:</span>{" "}
              <span className="text-[#1a1a2e]">{formatHourLabel(member.work_start_hour)} – {formatHourLabel(member.work_end_hour)}</span>
            </p>
            <p>
              <span className="text-[#9ca3af]">Hard boundaries:</span>{" "}
              <span className="text-[#1a1a2e]">
                {hardNoRanges.length === 0
                  ? "None"
                  : `${hardNoRanges.length} ${hardNoRanges.length === 1 ? "range" : "ranges"}`}
              </span>
            </p>
          </div>
          <div className="mt-4">
            <Link href={editUrl}>
              <Button
                variant="outline"
                size="sm"
                className="border-[#e5e7eb] text-[0.84rem] hover:border-[#d1d5db] hover:bg-[#f9fafb]"
              >
                Edit my availability
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-[#edeef0] bg-white p-5 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Team snapshot</h2>
          <div className="space-y-2 text-[0.88rem]">
            <p>
              <span className="text-[#9ca3af]">Team:</span>{" "}
              <span className="font-medium text-[#1a1a2e]">{meeting.title}</span>
            </p>
            <p>
              <span className="text-[#9ca3af]">Members submitted:</span>{" "}
              <span className="font-medium text-[#1a1a2e]">{memberCount}</span>
            </p>
            <p>
              <span className="text-[#9ca3af]">Cadence:</span>{" "}
              <span className="font-medium text-[#1a1a2e]">{meetingCadence}</span>
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[#edeef0] bg-white p-5 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <h2 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Team members</h2>
          <ul className="space-y-2 text-[0.88rem]">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <MemberAvatar
                  avatarUrl={membersDisplay[m.id]?.avatarUrl || undefined}
                  name={membersDisplay[m.id]?.name ?? "?"}
                  size="sm"
                  className="size-6 shrink-0"
                />
                <span className="font-medium text-[#1a1a2e]">{membersDisplay[m.id]?.name ?? "?"}</span>
                {m.is_owner_participant && (
                  <span className="text-[0.7rem] text-[#9ca3af] bg-[#f0f0f2] px-2 py-0.5 rounded">
                    Owner
                  </span>
                )}
                {m.role && (
                  <span className="text-[#9ca3af]">— {m.role}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed border-[#e0e2e6] bg-white/50 p-5 mb-6">
          <p className="text-[0.88rem] text-[#9ca3af]">
            The team owner manages rotation settings. You can update your
            availability before the deadline.
          </p>
        </section>
        </div>
      </main>
    </div>
  )
}
