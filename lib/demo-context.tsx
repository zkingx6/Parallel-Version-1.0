"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import type { DbMeeting, DbMemberSubmission } from "./database.types"
import type { RotationWeekData } from "./types"
import {
  DEMO_MEETINGS,
  DEMO_MEMBERS_BY_MEETING,
  getInitialDemoSchedules,
  getDemoMembersDisplay,
  type DemoSchedule,
} from "./demo-data"

export type DemoView =
  | "teams"
  | "team"
  | "rotation"
  | "schedule"
  | "schedule-detail"
  | "schedule-analysis"

export type DemoContextValue = {
  demoMode: true
  role: "owner" | "member"
  setRole: (r: "owner" | "member") => void
  view: DemoView
  selectedMeetingId: string | null
  selectedScheduleId: string | null
  meetings: DbMeeting[]
  membersByMeeting: Record<string, DbMemberSubmission[]>
  schedules: DemoSchedule[]
  setMeetings: (meetings: DbMeeting[]) => void
  setSchedules: (schedules: DemoSchedule[]) => void
  onNavigate: (view: DemoView, meetingId?: string, scheduleId?: string) => void
  getMembersDisplay: (meetingId: string) => Map<string, { name: string; avatarUrl: string }>
  addMeeting: (meeting: DbMeeting, members: DbMemberSubmission[]) => void
  removeMeeting: (id: string) => void
  addSchedule: (schedule: DemoSchedule) => void
  removeSchedule: (id: string) => void
  updateMeeting: (id: string, patch: Partial<DbMeeting>) => void
  updateMembers: (meetingId: string, members: DbMemberSubmission[]) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"owner" | "member">("owner")
  const [view, setView] = useState<DemoView>("teams")
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<DbMeeting[]>(DEMO_MEETINGS)
  const [membersByMeeting, setMembersByMeeting] = useState<
    Record<string, DbMemberSubmission[]>
  >({ ...DEMO_MEMBERS_BY_MEETING })
  const [schedules, setSchedules] = useState<DemoSchedule[]>(
    getInitialDemoSchedules()
  )

  const onNavigate = useCallback(
    (v: DemoView, meetingId?: string, scheduleId?: string) => {
      setView(v)
      setSelectedMeetingId(meetingId ?? null)
      setSelectedScheduleId(scheduleId ?? null)
    },
    []
  )

  const getMembersDisplay = useCallback(
    (meetingId: string) => {
      const members = membersByMeeting[meetingId] ?? []
      return getDemoMembersDisplay(members)
    },
    [membersByMeeting]
  )

  const addMeeting = useCallback(
    (meeting: DbMeeting, members: DbMemberSubmission[]) => {
      setMeetings((prev) => [...prev, meeting])
      setMembersByMeeting((prev) => ({
        ...prev,
        [meeting.id]: members,
      }))
    },
    []
  )

  const removeMeeting = useCallback((id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id))
    setMembersByMeeting((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSchedules((prev) => prev.filter((s) => s.team_id !== id))
  }, [])

  const addSchedule = useCallback((schedule: DemoSchedule) => {
    setSchedules((prev) => [...prev, schedule])
  }, [])

  const removeSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const updateMeeting = useCallback((id: string, patch: Partial<DbMeeting>) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    )
  }, [])

  const updateMembers = useCallback(
    (meetingId: string, members: DbMemberSubmission[]) => {
      setMembersByMeeting((prev) => ({ ...prev, [meetingId]: members }))
    },
    []
  )

  const value: DemoContextValue = {
    demoMode: true,
    role,
    setRole,
    view,
    selectedMeetingId,
    selectedScheduleId,
    meetings,
    membersByMeeting,
    schedules,
    setMeetings,
    setSchedules,
    onNavigate,
    getMembersDisplay,
    addMeeting,
    removeMeeting,
    addSchedule,
    removeSchedule,
    updateMeeting,
    updateMembers,
  }

  return (
    <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  return ctx
}
