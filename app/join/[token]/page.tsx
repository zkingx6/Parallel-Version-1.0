"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { getJoinData, getExistingMemberForJoin, submitMember } from "@/lib/actions"
import { addStoredMemberTeam } from "@/lib/member-teams-storage"
import { ParticipantForm } from "@/components/parallel/participant-form"
import { MemberTopNav } from "@/components/parallel/member-top-nav"
import { isComplementOfOverlapPattern } from "@/lib/hard-no-ranges"

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
  const token = params.token as string
  const memberIdFromUrl = searchParams.get("memberId")

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
        if (result.data) setExistingMember(result.data)
      })
    } else {
      setExistingMember(null)
    }
  }, [token, existingId])

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
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[17px] font-semibold tracking-tight text-primary">
            Parallel
          </h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">Loading…</p>
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
  const scheduleUrl = existingId
    ? `/member-dashboard?${baseParams}&tab=schedule`
    : editUrl
  const accountUrl = existingId
    ? `/member-dashboard/account?${baseParams}`
    : editUrl

  return (
    <div className="min-h-screen bg-background">
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

      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Join {meeting.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set your timezone, working hours, and times you are never available.
            {DAYS_LABEL[meeting.day_of_week] &&
              ` This is a weekly ${DAYS_LABEL[meeting.day_of_week]} meeting (${meeting.duration_minutes} min).`}
          </p>
        </div>

        <ParticipantForm
          defaultName={existingMember?.memberDisplay?.name ?? existingMember?.name ?? ""}
          defaultTimezone={existingMember?.timezone ?? "America/New_York"}
          defaultWorkStart={existingMember?.work_start_hour ?? 9}
          defaultWorkEnd={existingMember?.work_end_hour ?? 18}
          defaultHardNoRanges={
            existingMember?.hard_no_ranges && Array.isArray(existingMember.hard_no_ranges)
              ? isComplementOfOverlapPattern(existingMember.hard_no_ranges)
                ? []
                : (existingMember.hard_no_ranges as { start: number; end: number }[])
              : []
          }
          defaultRole={existingMember?.role ?? ""}
          onSubmit={handleSubmit}
          submitLabel={
            existingId ? "Update my availability" : "Save my availability"
          }
          saving={saving}
        />
      </main>
    </div>
  )
}
