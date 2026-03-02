"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMeeting, deleteMeeting } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import type { DbMeeting } from "@/lib/database.types"

export function DashboardContent({ meetings }: { meetings: DbMeeting[] }) {
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const router = useRouter()

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

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <div className="mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Your meetings
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a meeting, invite your team, and plan a fair rotation.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New meeting title…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
          />
          <Button
            size="sm"
            disabled={!title.trim() || creating}
            onClick={handleCreate}
            className="rounded-lg text-xs h-8 px-4"
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 text-center py-12">
          No meetings yet. Create one above.
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
