"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createMeeting, deleteMeeting } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { useSetup } from "@/lib/setup-context"
import type { DbMeeting } from "@/lib/database.types"

type DashboardContentProps = {
  meetings: DbMeeting[]
  /** When true, use demo handlers instead of server actions. */
  demoMode?: boolean
  /** When true, hide create team and delete (e.g. member view in demo). */
  hideOwnerActions?: boolean
  onNavigate?: (path: string) => void
  onCreateMeeting?: (title: string) => Promise<{ data: { id: string } } | { error: string }>
  onDeleteMeeting?: (id: string) => Promise<void>
}

export function DashboardContent({
  meetings,
  demoMode,
  hideOwnerActions,
  onNavigate,
  onCreateMeeting,
  onDeleteMeeting,
}: DashboardContentProps) {
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [items, setItems] = useState(meetings)
  const router = useRouter()
  const { setSetupFromMeetings } = useSetup()

  useEffect(() => {
    setSetupFromMeetings(meetings)
  }, [meetings, setSetupFromMeetings])

  useEffect(() => {
    setItems(meetings)
  }, [meetings])

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    if (demoMode && onCreateMeeting) {
      const result = await onCreateMeeting(title.trim())
      if (result && "data" in result && result.data) {
        onNavigate?.(`/team/${result.data.id}`)
      }
    } else {
      const result = await createMeeting(title.trim())
      if (result.data) {
        router.push(`/team/${result.data.id}`)
      }
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (demoMode && onDeleteMeeting) {
      await onDeleteMeeting(id)
      setItems((prev) => prev.filter((m) => m.id !== id))
      setConfirmRemoveId(null)
      setSetupFromMeetings(items.filter((m) => m.id !== id))
    } else {
      await deleteMeeting(id)
      setItems((prev) => prev.filter((m) => m.id !== id))
      setConfirmRemoveId(null)
      setSetupFromMeetings(items.filter((m) => m.id !== id))
      router.refresh()
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <div className="mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Your teams
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a team, invite members, and plan fair rotation schedules.
        </p>
      </div>

      {!hideOwnerActions && (
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">Create team</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Team name…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
            />
            <Button
              size="sm"
              disabled={!title.trim() || creating}
              onClick={handleCreate}
              className="rounded-lg text-xs h-8 px-4"
            >
              {creating ? "Creating…" : "Create team"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 text-center py-12">
          No teams yet. Create one above.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => {
            const isConfirming = confirmRemoveId === m.id
            return (
              <div
                key={m.id}
                className="rounded-xl border border-border/50 bg-card shadow-sm p-4 flex items-center justify-between hover:border-primary/20 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  if (isConfirming) {
                    setConfirmRemoveId(null)
                  } else if (demoMode && onNavigate) {
                    onNavigate(`/team/${m.id}`)
                  } else {
                    router.push(`/team/${m.id}`)
                  }
                }}
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
                {!hideOwnerActions && (
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isConfirming ? (
                      <>
                        <span className="text-[11px] text-muted-foreground">
                          Remove team?
                        </span>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-6 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleDelete(m.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(m.id)}
                        className="text-muted-foreground/30 hover:text-destructive transition-colors text-lg px-1 cursor-pointer"
                        aria-label="Delete team"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
