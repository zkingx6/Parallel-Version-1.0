"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createMeeting, deleteMeeting } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { useSetup } from "@/lib/setup-context"
import type { DbMeeting } from "@/lib/database.types"

// Owner-only Rotation Status Panel (mock data, UI-only)
const rotationStatus = {
  phase: "open" as "open" | "locked",
  deadlineText: "Sunday 6:00 PM (Team Time)",
  updatesSubmitted: 2,
  totalMembers: 5,
  hoursRemaining: 18,
  riskLevel: "low" as "low" | "medium" | "high",
}

export function DashboardContent({ meetings }: { meetings: DbMeeting[] }) {
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const { setSetupFromMeetings } = useSetup()

  useEffect(() => {
    setSetupFromMeetings(meetings)
  }, [meetings, setSetupFromMeetings])

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    const result = await createMeeting(title.trim())
    if (result.data) {
      router.push(`/team/${result.data.id}`)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    await deleteMeeting(id)
    router.refresh()
  }

  const isOpen = rotationStatus.phase === "open"

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      {/* Owner-only Rotation Status Panel */}
      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-5">
        {/* Top row */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Rotation Status
            </p>
            <p className="mt-0.5 font-semibold text-neutral-800">
              {isOpen
                ? "Availability updates are OPEN"
                : "Rotation inputs are LOCKED"}
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">
              Deadline: {rotationStatus.deadlineText}
            </p>
          </div>
          <div className="mt-2 shrink-0 sm:mt-0">
            {isOpen ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                Locking in {rotationStatus.hoursRemaining} hours
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600">
                Locked for next rotation
              </span>
            )}
          </div>
        </div>

        {/* Second row: status summary */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-neutral-500">
            {rotationStatus.updatesSubmitted} of {rotationStatus.totalMembers}{" "}
            members updated availability
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-neutral-400 transition-all"
              style={{
                width: `${(rotationStatus.updatesSubmitted / rotationStatus.totalMembers) * 100}%`,
              }}
            />
          </div>
          {rotationStatus.riskLevel === "medium" && (
            <p className="text-sm text-neutral-500">
              ⚠ Overlap may be reduced next week
            </p>
          )}
          {rotationStatus.riskLevel === "high" && (
            <p className="text-sm text-neutral-500">
              ⚠ High risk of no shared overlap
            </p>
          )}
        </div>

        {/* Third row: owner action */}
        <div className="flex justify-end">
          <Link
            href="/team/rotation-settings"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Review Rotation Settings
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Your meetings
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a meeting, invite your team, and plan a fair rotation.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2">Add meeting</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Meeting title…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
          />
          <Button
            size="sm"
            disabled={!title.trim() || creating}
            onClick={handleCreate}
            className="rounded-lg text-xs h-8 px-4"
          >
            {creating ? "Adding…" : "Add meeting"}
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 text-center py-12">
          No meetings yet. Add one above.
        </p>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-border/50 bg-card shadow-sm p-4 flex items-center justify-between hover:border-primary/20 transition-colors cursor-pointer"
              onClick={() => router.push(`/team/${m.id}`)}
            >
              <div>
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(m.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(m.id)
                }}
                className="text-muted-foreground/30 hover:text-destructive transition-colors text-lg px-1 cursor-pointer"
                aria-label="Delete meeting"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
