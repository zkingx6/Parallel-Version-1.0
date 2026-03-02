 "use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getJoinData, submitMember } from "@/lib/actions"
import { ParticipantForm } from "@/components/parallel/participant-form"

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
  const token = params.token as string

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const storageKey = meeting ? `parallel_sub_${meeting.id}` : null
  const [existingId, setExistingId] = useState<string | null>(null)

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
    if (storageKey) {
      const id = localStorage.getItem(storageKey)
      if (id) setExistingId(id)
    }
  }, [storageKey])

  const handleSubmit = async (payload: Parameters<typeof submitMember>[1]) => {
    setSaving(true)
    try {
      const result = await submitMember(token, payload, existingId || undefined)
      if (result.error) throw new Error(result.error)
      if (result.data && storageKey) {
        localStorage.setItem(storageKey, result.data.id)
      }
      setSubmitted(true)
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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[17px] font-semibold tracking-tight text-primary">
            Parallel
          </h1>
          <p className="text-sm font-medium">Saved.</p>
          <p className="text-sm text-muted-foreground">
            Your availability has been recorded for{" "}
            <span className="font-medium text-foreground">{meeting.title}</span>
            . You can close this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/40">
        <div className="mx-auto max-w-lg px-5 sm:px-8">
          <div className="flex items-center justify-between py-5">
            <h1 className="text-[17px] font-semibold tracking-tight text-primary">
              Parallel
            </h1>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              team setup
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
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
