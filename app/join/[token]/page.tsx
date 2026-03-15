"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { getJoinData, getExistingMemberForJoin, submitMember } from "@/lib/actions"
import { addStoredMemberTeam } from "@/lib/member-teams-storage"
import { ParticipantForm } from "@/components/parallel/participant-form"
import { MemberTopNav } from "@/components/parallel/member-top-nav"
import { PageBackLink } from "@/components/ui/page-back-link"
import { ParallelWordmark } from "@/components/ui/parallel-wordmark"
import { isComplementOfOverlapPattern } from "@/lib/hard-no-ranges"
import type { HardNoRange } from "@/lib/types"

const DAYS_LABEL: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
}

type MeetingInfo = {
  id: string
  title: string
  day_of_week: number
  duration_minutes: number
  anchor_offset: number
}

export default function JoinPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = (params?.token as string) ?? ""
  const memberIdFromUrl = searchParams?.get("memberId") ?? null

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const storageKey = meeting ? `parallel_sub_${meeting.id}` : null
  const [existingId, setExistingId] = useState<string | null>(null)
  const [existingMember, setExistingMember] = useState<{
    name: string
    timezone: string
    work_start_hour: number
    work_end_hour: number
    hard_no_ranges: unknown[]
    role: string | null
    user_id?: string | null
    avatar_url?: string | null
    updated_at?: string
    memberDisplay?: { name: string; avatarUrl: string }
  } | null>(null)

  useEffect(() => {
    getJoinData(token).then((result) => {
      if (result.error) {
        setLoadError(result.error)
      } else if (result.data) {
        setMeeting(result.data)
      }
    })
  }, [token])

  useEffect(() => {
    if (memberIdFromUrl) {
      setExistingId(memberIdFromUrl)
    } else if (storageKey) {
      const id = localStorage.getItem(storageKey)
      if (id) setExistingId(id)
    }
  }, [storageKey, memberIdFromUrl])

  useEffect(() => {
    if (token && existingId) {
      getExistingMemberForJoin(token, existingId).then((result) => {
        if (result.data) {
          const data = result.data
          if (data.user_id) {
            router.replace(`/member-dashboard/account?token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(existingId)}`)
            return
          }
          setExistingMember(data)
        }
      })
    } else {
      setExistingMember(null)
    }
  }, [token, existingId, router])

  const handleSubmit = async (payload: Parameters<typeof submitMember>[1]) => {
    setSaving(true)
    try {
      const result = await submitMember(token, payload, existingId || undefined)
      if (result.error) throw new Error(result.error)
      if (result.data && storageKey) {
        localStorage.setItem(storageKey, result.data.id)
      }
      if (result.data?.id) {
        addStoredMemberTeam(token, result.data.id)
        router.push(`/member-dashboard?token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(result.data.id)}`)
        return
      }
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
            <ParallelWordmark />
          </h1>
          <p className="text-[0.88rem] text-[#9ca3af]">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <p className="text-[0.88rem] text-[#9ca3af]">Loading…</p>
      </div>
    )
  }

  const editUrl = `/join/${token}${existingId ? `?memberId=${existingId}` : ""}`
  const baseParams = existingId
    ? `token=${encodeURIComponent(token)}&memberId=${encodeURIComponent(existingId)}`
    : ""
  const teamUrl = existingId
    ? `/member-dashboard?${baseParams}`
    : editUrl
  const teamDetailUrl = existingId
    ? `/member-dashboard/team?${baseParams}`
    : editUrl
  const scheduleUrl = existingId
    ? `/member-dashboard?${baseParams}&tab=schedule`
    : editUrl
  const accountUrl = existingId
    ? `/member-dashboard/account?${baseParams}`
    : editUrl

  const pageTitle = existingId ? "Edit availability" : `Join ${meeting.title}`
  const pageDescription = existingId
    ? "Update your timezone, working hours, and times you are never available."
    : `Set your timezone, working hours, and times you are never available.${DAYS_LABEL[meeting.day_of_week] ? ` This is a weekly ${DAYS_LABEL[meeting.day_of_week]} meeting (${meeting.duration_minutes} min).` : ""}`

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <MemberTopNav
        memberName={existingMember?.memberDisplay?.name ?? existingMember?.name ?? ""}
        memberAvatarUrl={
          existingMember?.memberDisplay?.avatarUrl ?? existingMember?.avatar_url ?? undefined
        }
        meetingTitle={meeting.title}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        hideNavTabs={!existingId}
        avatarLinksToAccount={!!existingId}
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {existingId && (
            <PageBackLink href={teamDetailUrl} className="mb-6">
              Back to team
            </PageBackLink>
          )}
          <div className="mb-8">
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
              {pageTitle}
            </h1>
            <p className="text-[#9ca3af] text-[0.88rem] mt-1">
              {pageDescription}
            </p>
          </div>

          <ParticipantForm
          defaultName={existingMember?.memberDisplay?.name ?? existingMember?.name ?? ""}
          defaultTimezone={existingMember?.timezone ?? "America/New_York"}
          defaultWorkStart={existingMember?.work_start_hour ?? 9}
          defaultWorkEnd={existingMember?.work_end_hour ?? 18}
          defaultHardNoRanges={
            existingMember?.hard_no_ranges && Array.isArray(existingMember.hard_no_ranges)
              ? isComplementOfOverlapPattern(existingMember.hard_no_ranges as HardNoRange[])
                ? []
                : (existingMember.hard_no_ranges as HardNoRange[])
              : []
          }
          defaultRole={existingMember?.role ?? ""}
          onSubmit={handleSubmit}
          submitLabel={
            existingId ? "Update my availability" : "Save my availability"
          }
          saving={saving}
        />
        </div>
      </main>
    </div>
  )
}
