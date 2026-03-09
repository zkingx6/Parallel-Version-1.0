"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { createMeeting, deleteMeeting } from "@/lib/actions"
import { Plus, Users, ChevronRight, X } from "lucide-react"
import { useSetup } from "@/lib/setup-context"
import type { DbMeeting } from "@/lib/database.types"

type DashboardContentProps = {
  meetings: DbMeeting[]
  memberCounts?: Record<string, number>
  demoMode?: boolean
  hideOwnerActions?: boolean
  onNavigate?: (path: string) => void
  onCreateMeeting?: (title: string) => Promise<{ data: { id: string } } | { error: string }>
  onDeleteMeeting?: (id: string) => Promise<void>
}

export function DashboardContent({
  meetings,
  memberCounts = {},
  demoMode,
  hideOwnerActions,
  onNavigate,
  onCreateMeeting,
  onDeleteMeeting,
}: DashboardContentProps) {
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
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
    setTitle("")
    setShowCreate(false)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirmRemoveId === id) return
    setConfirmRemoveId(id)
  }

  const handleConfirmDelete = async (id: string) => {
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
    <main className="max-w-5xl mx-auto px-6 py-8 bg-[#f7f8fa]">
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] mb-1 font-semibold">
            Your teams
          </h1>
          <p className="text-[#9ca3af] text-[0.88rem]">
            Create a team, invite members, and plan fair rotation schedules.
          </p>
        </motion.div>

        {!hideOwnerActions && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <AnimatePresence mode="wait">
              {!showCreate ? (
                <motion.button
                  key="trigger"
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-dashed border-[#e0e2e6] bg-white/50 hover:border-[#0d9488]/40 hover:bg-[#f0fdfa]/50 transition-all duration-200 cursor-pointer text-[0.88rem] text-[#9ca3af] hover:text-[#0d9488] group"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#f0f0f2] group-hover:bg-[#ccfbf1] flex items-center justify-center transition-colors duration-200">
                    <Plus size={16} className="text-[#9ca3af] group-hover:text-[#0d9488] transition-colors" />
                  </div>
                  Create a new team
                </motion.button>
              ) : (
                <motion.div
                  key="form"
                  className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="Team name..."
                      className="flex-1 px-4 py-2.5 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-[0.88rem] text-[#1a1a2e] placeholder:text-[#c4c7cc] focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 transition-all"
                      autoFocus
                    />
                    <button
                      onClick={handleCreate}
                      disabled={!title.trim() || creating}
                      className="px-5 py-2.5 rounded-lg bg-[#0d9488] text-white text-[0.84rem] border-0 cursor-pointer hover:bg-[#0f766e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                    >
                      {creating ? "Creating…" : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreate(false)
                        setTitle("")
                      }}
                      className="p-2 rounded-lg bg-transparent border-0 cursor-pointer text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f0f0f2] transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-[#9ca3af]/50 text-center py-12">
            No teams yet. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((m, i) => {
              const isConfirming = confirmRemoveId === m.id
              const createdAt = new Date(m.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              return (
                <motion.div
                  key={m.id}
                  onClick={() => {
                    if (isConfirming) {
                      setConfirmRemoveId(null)
                    } else if (demoMode && onNavigate) {
                      onNavigate(`/team/${m.id}`)
                    } else {
                      router.push(`/team/${m.id}`)
                    }
                  }}
                  className="group bg-white rounded-xl border border-[#edeef0] px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.06 + i * 0.03 }}
                  whileHover={{ x: 2 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center shrink-0 group-hover:bg-[#ccfbf1] transition-colors duration-200">
                    <Users size={17} className="text-[#0d9488]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a1a2e] text-[0.9rem] truncate font-medium">
                        {m.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[#b0b4bc] text-[0.78rem]">
                        {memberCounts[m.id] ?? 0} members
                      </span>
                      <span className="text-[#d1d5db]">·</span>
                      <span className="text-[#b0b4bc] text-[0.78rem]">{createdAt}</span>
                    </div>
                  </div>
                  {!hideOwnerActions && (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#9ca3af]">Remove team?</span>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-[11px] text-[#9ca3af] hover:text-[#1a1a2e] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(m.id)}
                            className="px-2 py-1 rounded text-[11px] text-white bg-[#ef4444] hover:bg-[#dc2626] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleDelete(e, m.id)}
                            className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer text-[#d1d5db] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={14} />
                          </button>
                          <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] transition-colors" />
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
