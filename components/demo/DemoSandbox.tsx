"use client"

import { useState, useCallback, useEffect } from "react"
import { SetupProvider } from "@/lib/setup-context"
import { DemoProvider, useDemo, type DemoView } from "@/lib/demo-context"
import { DashboardContent } from "@/app/(app)/dashboard/content"
import { TeamSection } from "@/components/parallel/team-section"
import { RotationSection } from "@/components/parallel/rotation-section"
import { ScheduleListContent } from "@/components/parallel/schedule-list-content"
import { ScheduleDetailContent } from "@/components/parallel/schedule-detail-content"
import { ScheduleAnalysisContent } from "@/components/parallel/schedule-analysis-content"
import { cn } from "@/lib/utils"
import type { DbMeeting, DbMemberSubmission } from "@/lib/database.types"
import type { DemoSchedule } from "@/lib/demo-data"
import { DateTime } from "luxon"

function getModeLabel(modeUsed: string | undefined): string {
  if (!modeUsed) return "Auto Fair"
  switch (modeUsed) {
    case "FAIRNESS_GUARANTEE":
      return "Auto Fair"
    case "FIXED_ANCHOR":
      return "Fixed Time"
    case "STRICT":
      return "Fair rotation"
    case "RELAXED":
      return "Best possible"
    case "FALLBACK":
      return "Best possible"
    default:
      return "Auto Fair"
  }
}

function DemoTopNav({
  activeTab,
  onTabChange,
  isOwner,
  targetMeetingId,
}: {
  activeTab: "meetings" | "rotation" | "schedule"
  onTabChange: (tab: "meetings" | "rotation" | "schedule") => void
  isOwner: boolean
  targetMeetingId: string | null
}) {
  const tabBase =
    "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border border-transparent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const tabInactive =
    "text-muted-foreground hover:bg-accent/50 hover:border-border hover:text-foreground"
  const tabActive = "bg-accent/60 border-border text-foreground"
  const tabDisabled =
    "cursor-not-allowed pointer-events-none text-muted-foreground/60 border-transparent"

  const getTabClass = (isActive: boolean) =>
    cn(tabBase, isActive ? tabActive : tabInactive)

  return (
    <header className="relative z-10 w-full shrink-0 border-b border-border/40 bg-navbar backdrop-blur-sm">
      <div className="relative flex items-center justify-between h-16 pl-8 pr-8">
        <div className="shrink-0">
          <span className="text-lg font-semibold text-foreground">Parallel</span>
        </div>

        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => onTabChange("meetings")}
            className={getTabClass(activeTab === "meetings")}
          >
            Teams
          </button>
          {isOwner && (targetMeetingId || activeTab === "rotation") && (
            <button
              type="button"
              onClick={() => targetMeetingId && onTabChange("rotation")}
              className={getTabClass(activeTab === "rotation")}
            >
              Rotation
            </button>
          )}
          <button
            type="button"
            onClick={() => onTabChange("schedule")}
            className={getTabClass(activeTab === "schedule")}
          >
            Schedule
          </button>
        </nav>

        <div className="shrink-0 text-xs text-muted-foreground">Demo</div>
      </div>
    </header>
  )
}

function DemoSandboxInner() {
  const demo = useDemo()!
  const { role } = demo
  const [activeTab, setActiveTab] = useState<
    "meetings" | "rotation" | "schedule"
  >("meetings")

  const {
    view,
    selectedMeetingId,
    selectedScheduleId,
    meetings,
    membersByMeeting,
    schedules,
    onNavigate,
    getMembersDisplay,
    addMeeting,
    removeMeeting,
    addSchedule,
    removeSchedule,
    updateMeeting,
    updateMembers,
  } = demo

  const isOwner = role === "owner"
  const targetMeetingId =
    selectedMeetingId ?? (meetings.length > 0 ? meetings[0].id : null)

  useEffect(() => {
    if (view === "teams" || view === "team") setActiveTab("meetings")
    else if (view === "rotation") setActiveTab("rotation")
    else if (
      view === "schedule" ||
      view === "schedule-detail" ||
      view === "schedule-analysis"
    )
      setActiveTab("schedule")
  }, [view])

  useEffect(() => {
    if (!isOwner && view === "rotation") {
      onNavigate("schedule")
    }
  }, [isOwner, view, onNavigate])

  const handleTabChange = useCallback(
    (tab: "meetings" | "rotation" | "schedule") => {
      setActiveTab(tab)
      if (tab === "meetings") onNavigate("teams")
      else if (tab === "rotation" && targetMeetingId)
        onNavigate("rotation", targetMeetingId)
      else if (tab === "schedule") onNavigate("schedule")
    },
    [onNavigate, targetMeetingId]
  )

  const handleNavigate = useCallback(
    (path: string) => {
      const teamMatch = path.match(/^\/team\/([^/]+)/)
      const rotationMatch = path.match(/^\/rotation\/([^/]+)/)
      const scheduleMatch = path.match(/^\/schedule\/([^/]+)(?:\/analysis)?$/)
      if (teamMatch) onNavigate("team", teamMatch[1])
      else if (rotationMatch) onNavigate("rotation", rotationMatch[1])
      else if (scheduleMatch) {
        const scheduleId = scheduleMatch[1]
        if (path.includes("/analysis")) onNavigate("schedule-analysis", undefined, scheduleId)
        else onNavigate("schedule-detail", undefined, scheduleId)
      } else onNavigate("teams")
    },
    [onNavigate]
  )

  const handleCreateMeeting = useCallback(
    async (title: string) => {
      const id = `demo-meeting-${Date.now()}`
      const now = new Date().toISOString()
      const anchorOffset = Math.round(
        DateTime.now().setZone("America/New_York").offset / 60
      )
      const meeting: DbMeeting = {
        id,
        manager_id: "demo-owner-id",
        title,
        day_of_week: 3,
        duration_minutes: 45,
        rotation_weeks: 8,
        anchor_offset: anchorOffset,
        display_timezone: "America/New_York",
        base_time_minutes: null,
        start_date: null,
        published_schedule: null,
        invite_token: `demo-invite-${Date.now()}`,
        created_at: now,
      }
      const members: DbMemberSubmission[] = []
      addMeeting(meeting, members)
      return { data: { id } }
    },
    [addMeeting]
  )

  const handleDeleteMeeting = useCallback(
    async (id: string) => {
      removeMeeting(id)
    },
    [removeMeeting]
  )

  const handlePublishSchedule = useCallback(
    (_params: {
      meetingId: string
      meetingTitle: string
      weeks: unknown[]
      modeUsed: string
      explain: unknown
    }) => {
      onNavigate("schedule")
    },
    [onNavigate]
  )

  const teamTitles = Object.fromEntries(meetings.map((m) => [m.id, m.title]))

  const scheduleItems = schedules.map((s) => ({
    id: s.id,
    name: s.name,
    weeks: s.weeks,
    created_at: s.created_at,
    team_id: s.team_id,
  }))

  const selectedSchedule = selectedScheduleId
    ? schedules.find((s) => s.id === selectedScheduleId)
    : null
  const selectedMeeting =
    selectedMeetingId
      ? meetings.find((m) => m.id === selectedMeetingId)
      : selectedSchedule
        ? meetings.find((m) => m.id === selectedSchedule.team_id) ?? null
        : null
  const selectedMembers = selectedMeeting
    ? membersByMeeting[selectedMeeting.id] ?? []
    : []

  if (view === "teams") {
    return (
      <>
        <DemoTopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
          targetMeetingId={targetMeetingId}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <DashboardContent
            meetings={meetings}
            memberCounts={Object.fromEntries(
              meetings.map((m) => [m.id, membersByMeeting[m.id]?.length ?? 0])
            )}
            demoMode
            hideOwnerActions={!isOwner}
            onNavigate={handleNavigate}
            onCreateMeeting={handleCreateMeeting}
            onDeleteMeeting={handleDeleteMeeting}
          />
        </main>
      </>
    )
  }

  if (view === "team" && selectedMeeting) {
    return (
      <>
        <DemoTopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
          targetMeetingId={targetMeetingId}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <TeamSection
            meeting={selectedMeeting}
            members={selectedMembers}
            hasOwnerParticipant={selectedMembers.some((m) => m.is_owner_participant)}
            userEmail="demo@parallel.app"
            membersDisplay={getMembersDisplay(selectedMeeting.id)}
            demoMode
            hideOwnerActions={!isOwner}
            onBack={() => onNavigate("teams")}
            onConfigureRotation={
              isOwner ? () => onNavigate("rotation", selectedMeeting.id) : undefined
            }
            onUpdateMeeting={(id, patch) => updateMeeting(id, patch)}
          />
        </main>
      </>
    )
  }

  if (view === "rotation" && selectedMeeting) {
    return (
      <>
        <DemoTopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
          targetMeetingId={targetMeetingId}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <RotationSection
            meeting={selectedMeeting}
            members={selectedMembers}
            membersDisplay={getMembersDisplay(selectedMeeting.id)}
            demoMode
            onBack={() => onNavigate("teams")}
            onUpdateMeeting={(id, patch) => updateMeeting(id, patch)}
            onPublishSchedule={handlePublishSchedule}
          />
        </main>
      </>
    )
  }

  if (view === "schedule") {
    return (
      <>
        <DemoTopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
          targetMeetingId={targetMeetingId}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
            <div className="mb-10">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Schedule
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Published schedules and rotation history.
              </p>
            </div>
            <ScheduleListContent
            schedules={scheduleItems}
            teamTitles={teamTitles}
            demoMode
            showDeleteButton={isOwner}
            onScheduleClick={(id) => onNavigate("schedule-detail", undefined, id)}
            onDeleteSchedule={async (id) => removeSchedule(id)}
            onEmptyStateClick={isOwner ? () => handleTabChange("meetings") : undefined}
            emptyStateMessage={
              !isOwner
                ? "No schedules shared with you yet. Switch to Owner view to create and publish schedules."
                : undefined
            }
          />
          </div>
        </main>
      </>
    )
  }

  if (
    view === "schedule-detail" &&
    selectedSchedule &&
    selectedMeeting &&
    selectedMembers.length > 0
  ) {
    const weeks = selectedSchedule.rotation_result?.weeks ?? []
    return (
      <>
        <DemoTopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
          targetMeetingId={targetMeetingId}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <ScheduleDetailContent
            scheduleId={selectedSchedule.id}
            scheduleName={selectedSchedule.name}
            meeting={selectedMeeting}
            members={selectedMembers}
            weeks={weeks}
            membersDisplay={getMembersDisplay(selectedMeeting.id)}
            demoMode
            onBack={() => onNavigate("schedule")}
            onAnalysisClick={() =>
              onNavigate("schedule-analysis", undefined, selectedSchedule.id)
            }
          />
        </main>
      </>
    )
  }

  if (
    view === "schedule-analysis" &&
    selectedSchedule &&
    selectedMeeting &&
    selectedMembers.length > 0
  ) {
    const weeks = selectedSchedule.rotation_result?.weeks ?? []
    const explain = selectedSchedule.rotation_result?.explain
    const modeUsed = selectedSchedule.rotation_result?.modeUsed
    return (
      <>
        <DemoTopNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={isOwner}
          targetMeetingId={targetMeetingId}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <ScheduleAnalysisContent
            scheduleId={selectedSchedule.id}
            scheduleName={selectedSchedule.name}
            teamName={selectedMeeting.title}
            weeksCount={weeks.length}
            modeLabel={getModeLabel(modeUsed)}
            explain={explain}
            members={selectedMembers}
            weeks={weeks}
            membersDisplay={getMembersDisplay(selectedMeeting.id)}
            displayTimezone={selectedMeeting.display_timezone ?? "America/New_York"}
            modeUsed={modeUsed}
            useFixedBaseTime={selectedMeeting.base_time_minutes != null}
            demoMode
            onBackToSchedule={() =>
              onNavigate("schedule-detail", undefined, selectedSchedule.id)
            }
          />
        </main>
      </>
    )
  }

  return null
}

function DemoRoleToggle() {
  const demo = useDemo()
  if (!demo) return null
  const { role, setRole } = demo
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">View as:</span>
      <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
        <button
          type="button"
          onClick={() => setRole("owner")}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
            role === "owner"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Owner
        </button>
        <button
          type="button"
          onClick={() => setRole("member")}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
            role === "member"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Member
        </button>
      </div>
    </div>
  )
}

export function DemoSandbox() {
  return (
    <DemoProvider>
      <div className="flex flex-col rounded-2xl border border-border/50 bg-background shadow-md overflow-hidden w-full max-w-5xl mx-auto h-[600px]">
        <div className="shrink-0 border-b border-border/40 bg-white flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex gap-2" aria-hidden="true">
            <span className="size-3 rounded-full bg-[#FF5F57]" />
            <span className="size-3 rounded-full bg-[#FFBD2E]" />
            <span className="size-3 rounded-full bg-[#28C840]" />
          </div>
          <DemoRoleToggle />
        </div>
        <SetupProvider>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
            <DemoSandboxInner />
          </div>
        </SetupProvider>
      </div>
    </DemoProvider>
  )
}
