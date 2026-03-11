"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import {
  updateMeetingConfig,
  deleteMember as deleteMemberAction,
  upsertOwnerParticipant,
} from "@/lib/actions"
import {
  DbMeeting,
  DbMemberSubmission,
  dbMemberToTeamMember,
} from "@/lib/database.types"
import { isComplementOfOverlapPattern } from "@/lib/hard-no-ranges"
import { formatHourLabel } from "@/lib/types"
import { getTimezoneDisplayLabelNow } from "@/lib/timezone"
import { ParticipantForm } from "./participant-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PencilIcon, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageBackLink } from "@/components/ui/page-back-link"
import { MemberAvatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Plan } from "@/lib/plans"
import { getPlanLimits } from "@/lib/plans"

export function TeamSection({
  meeting: initialMeeting,
  members: initialMembers,
  userEmail,
  membersDisplay,
  plan = "starter",
  demoMode,
  hideOwnerActions,
  onBack,
  onConfigureRotation,
  onUpdateMeeting,
  onDeleteMember,
  onAddOwner,
}: {
  meeting: DbMeeting
  members: DbMemberSubmission[]
  hasOwnerParticipant: boolean
  userEmail: string
  /** Resolved display data from profiles/auth (canonical). memberId -> ResolvedIdentityDisplay */
  membersDisplay: Map<string, { name: string; avatarUrl: string; initials?: string }>
  /** User plan for feature gating. Default starter. */
  plan?: Plan
  /** When true, use demo handlers instead of server actions. */
  demoMode?: boolean
  /** When true, hide configure rotation and other owner-only actions. */
  hideOwnerActions?: boolean
  onBack?: () => void
  onConfigureRotation?: () => void
  onUpdateMeeting?: (id: string, patch: Partial<DbMeeting>) => void
  onDeleteMember?: (memberId: string) => void
  onAddOwner?: (payload: Parameters<typeof upsertOwnerParticipant>[1]) => Promise<void>
}) {
  const [meeting, setMeeting] = useState(initialMeeting)
  const [members, setMembers] = useState(initialMembers)
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [ownerSaving, setOwnerSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)

  const supabase = createClient()
  const inviteUrl = mounted
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${meeting.invite_token}`
    : ""
  const hasOwnerParticipant = members.some((m) => m.is_owner_participant === true)
  const limits = getPlanLimits(plan)
  const inviteLimitReached =
    plan === "starter" && members.length >= limits.maxMembers

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(id)
  }, [])

  const handleRenameOpen = () => {
    setRenameValue(meeting.title)
    setRenameModalOpen(true)
  }

  const handleRenameSave = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setRenameSaving(true)
    try {
      if (demoMode && onUpdateMeeting) {
        onUpdateMeeting(meeting.id, { title: trimmed })
        setMeeting((prev) => ({ ...prev, title: trimmed }))
        setRenameModalOpen(false)
      } else {
        await updateMeetingConfig(meeting.id, { title: trimmed })
        setMeeting((prev) => ({ ...prev, title: trimmed }))
        setRenameModalOpen(false)
      }
    } finally {
      setRenameSaving(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleOwnerSubmit = async (
    payload: Parameters<typeof upsertOwnerParticipant>[1]
  ) => {
    if (demoMode) {
      if (onAddOwner) await onAddOwner(payload)
      setOwnerModalOpen(false)
      return
    }
    setOwnerSaving(true)
    try {
      const result = await upsertOwnerParticipant(meeting.id, payload)
      if (result.error) throw new Error(result.error)
      if (result.data) {
        setMembers((prev) => {
          const filtered = prev.filter((m) => !m.is_owner_participant)
          return [result.data!, ...filtered]
        })
        setOwnerModalOpen(false)
      }
    } finally {
      setOwnerSaving(false)
    }
  }

  const handleRefresh = async () => {
    if (demoMode) return
    setRefreshing(true)
    const { data } = await supabase
      .from("member_submissions")
      .select("*")
      .eq("meeting_id", meeting.id)
      .order("is_owner_participant", { ascending: false })
      .order("created_at")
    if (data) setMembers(data)
    setRefreshing(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (demoMode && onDeleteMember) {
      onDeleteMember(memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setConfirmRemoveId(null)
      return
    }
    await deleteMemberAction(memberId, meeting.id)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    setConfirmRemoveId(null)
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <PageBackLink
          href={demoMode ? undefined : "/teams"}
          onClick={demoMode ? onBack : undefined}
          className="mb-6"
        >
          Back to Teams
        </PageBackLink>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
              {meeting.title}
            </h1>
            {!hideOwnerActions && (
              <button
                type="button"
                onClick={handleRenameOpen}
                className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer text-[#c4c7cc] hover:text-[#6b7280] hover:bg-[#f0f0f2] transition-all"
                aria-label="Rename team"
              >
                <PencilIcon className="size-4" />
              </button>
            )}
          </div>
          <p className="text-[#9ca3af] text-[0.88rem]">
            Invite your team, then plan a fair rotation.
          </p>
        </div>

      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label htmlFor="rename-team-input" className="text-sm font-medium">
              Team name
            </label>
            <Input
              id="rename-team-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Team name"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameModalOpen(false)}
              disabled={renameSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSave}
              disabled={renameSaving || !renameValue.trim()}
            >
              {renameSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-10 sm:space-y-12">
        {!hasOwnerParticipant && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <p className="text-sm text-foreground/90">
              Add your availability to include yourself in the rotation.
            </p>
            <Button
              onClick={() => setOwnerModalOpen(true)}
              className="mt-3 h-9 rounded-lg text-sm font-medium"
            >
              Add my availability
            </Button>
          </div>
        )}

        <Dialog open={ownerModalOpen} onOpenChange={setOwnerModalOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>
                {members.some((m) => m.is_owner_participant)
                  ? "Update your availability"
                  : "Add your availability"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set your timezone, working hours, and hard boundaries so you can
                be included in the fair rotation.
              </p>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
            <ParticipantForm
              defaultName={
                (() => {
                  const owner = members.find((m) => m.is_owner_participant)
                  if (owner) {
                    const resolved = membersDisplay.get(owner.id)
                    return resolved?.name ?? owner.name ?? userEmail?.split("@")[0] ?? ""
                  }
                  return userEmail?.split("@")[0] ?? ""
                })()
              }
              defaultTimezone={
                members.find((m) => m.is_owner_participant)?.timezone ??
                "America/New_York"
              }
              defaultWorkStart={
                members.find((m) => m.is_owner_participant)?.work_start_hour ?? 9
              }
              defaultWorkEnd={
                members.find((m) => m.is_owner_participant)?.work_end_hour ?? 18
              }
              defaultHardNoRanges={
                (() => {
                  const o = members.find((m) => m.is_owner_participant)
                  const raw =
                    o && Array.isArray(o.hard_no_ranges) ? o.hard_no_ranges : []
                  return isComplementOfOverlapPattern(raw) ? [] : raw
                })()
              }
              defaultRole={
                members.find((m) => m.is_owner_participant)?.role ?? ""
              }
              onSubmit={handleOwnerSubmit}
              submitLabel={
                members.some((m) => m.is_owner_participant)
                  ? "Update my availability"
                  : "Save my availability"
              }
              saving={ownerSaving}
            />
            </div>
          </DialogContent>
        </Dialog>

        {!hideOwnerActions && (
          <section className="mb-10">
            <h3 className="text-[#1a1a2e] text-[0.95rem] mb-1 font-semibold">
              Invite link
            </h3>
            <p className="text-[#9ca3af] text-[0.82rem] mb-3">
              Share this link with your team. They set their own timezone and boundaries.
            </p>
            {inviteLimitReached && (
              <p className="mb-3 text-[0.88rem] text-[#dc2626] bg-[#fef2f2] rounded-lg px-4 py-3 border border-[#fecaca]">
                This team has reached the Starter plan limit of 5 members. Manage your plan in Account.
              </p>
            )}
            <div className="bg-white rounded-xl border border-[#edeef0] px-4 py-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <code className="flex-1 text-[0.8rem] text-[#6b7280] truncate font-mono">
                {inviteUrl || "Loading…"}
              </code>
              <button
                onClick={handleCopyLink}
                disabled={inviteLimitReached}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[0.8rem] cursor-pointer hover:border-[#d1d5db] hover:bg-[#f9fafb] transition-all font-medium",
                  copied && "text-[#0d9488] border-[#0d9488]/30",
                  inviteLimitReached && "opacity-50 cursor-not-allowed hover:bg-white hover:border-[#e5e7eb]"
                )}
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#1a1a2e] text-[0.95rem] font-semibold">
                Team ({members.length})
              </h3>
              <p className="text-[#9ca3af] text-[0.82rem] mt-0.5">
                Members who have submitted their availability.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[0.8rem] text-[#0d9488] hover:text-[#0f766e] bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-50 font-medium"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e2e6] p-8 text-center bg-white/50">
              <p className="text-[0.88rem] text-[#9ca3af]/50">
                No members yet. Share the invite link above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...members]
                .sort(
                  (a, b) =>
                    (b.is_owner_participant ? 1 : 0) -
                    (a.is_owner_participant ? 1 : 0)
                )
                .map((m) => {
                  const isExpanded = expandedMemberId === m.id
                  const rawRanges = Array.isArray(m.hard_no_ranges)
                    ? m.hard_no_ranges
                    : []
                  const ranges = isComplementOfOverlapPattern(rawRanges)
                    ? []
                    : rawRanges
                  const hasRanges = ranges.length > 0
                  const isOwner = m.is_owner_participant === true
                  const resolved = membersDisplay.get(m.id)
                  const displayName = resolved?.name ?? (isOwner ? userEmail : "?")
                  const displayAvatarUrl = resolved?.avatarUrl ?? ""

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (confirmRemoveId === m.id) {
                          setConfirmRemoveId(null)
                        } else {
                          setExpandedMemberId(isExpanded ? null : m.id)
                        }
                      }}
                      className="group bg-white rounded-xl border border-[#edeef0] px-5 py-4 hover:border-[#d1d5db] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MemberAvatar
                              avatarUrl={displayAvatarUrl || undefined}
                              name={displayName}
                              size="sm"
                              className="size-7 shrink-0"
                            />
                            <span className="text-sm font-medium truncate">
                              {displayName || "—"}
                            </span>
                            {m.is_owner_participant && (
                              <span className="text-[0.68rem] text-[#0d9488] bg-[#f0fdfa] px-2 py-0.5 rounded-full border border-[#0d9488]/15 font-medium">
                                Owner
                              </span>
                            )}
                            {m.role && !m.is_owner_participant && (
                              <span className="text-[0.68rem] text-[#9ca3af] bg-[#f4f5f7] px-2 py-0.5 rounded-full">
                                {m.role}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground pl-9">
                            <span>{getTimezoneDisplayLabelNow(dbMemberToTeamMember(m).timezone)}</span>
                            <span>
                              {formatHourLabel(m.work_start_hour)} –{" "}
                              {formatHourLabel(m.work_end_hour)}
                            </span>
                            {hasRanges && (
                              <span className="text-muted-foreground/40">
                                {ranges.length} hard{" "}
                                {ranges.length === 1 ? "boundary" : "boundaries"}
                                {isExpanded ? "" : " · View"}
                              </span>
                            )}
                          </div>
                        </div>
                        {!hideOwnerActions && (
                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {confirmRemoveId === m.id ? (
                              <>
                                <span className="text-[11px] text-muted-foreground">
                                  Remove member?
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
                                  onClick={() => handleDeleteMember(m.id)}
                                >
                                  Remove
                                </Button>
                              </>
                            ) : (
                              <>
                                {m.is_owner_participant && (
                                  <button
                                    onClick={() => setOwnerModalOpen(true)}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                )}
                                {!m.is_owner_participant && (
                                  <button
                                    onClick={() => setConfirmRemoveId(m.id)}
                                    className="text-muted-foreground/30 hover:text-destructive transition-colors text-lg px-0.5 cursor-pointer"
                                    aria-label="Remove member"
                                  >
                                    ×
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <>
                          <hr className="border-border/40 mt-3 mb-3" />
                          <div className="pl-9">
                            <h4 className="text-[11px] font-medium text-muted-foreground mb-2">
                              Hard boundaries
                            </h4>
                            {ranges.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground/60">
                                No hard boundaries added.
                              </p>
                            ) : (
                              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                                {ranges.map((r, i) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-2 py-0.5 border-b border-border/20 last:border-0"
                                  >
                                    <span className="inline-block w-1.5 h-1.5 rounded-sm bg-foreground/15 shrink-0" />
                                    {formatHourLabel(r.start)} –{" "}
                                    {formatHourLabel(r.end)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </section>

        {!hideOwnerActions && (
          <div className="mt-8 flex justify-center">
            {demoMode && onConfigureRotation ? (
              <button
                onClick={onConfigureRotation}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0d9488] text-white text-[0.88rem] border-0 cursor-pointer font-medium hover:bg-[#0f766e] hover:shadow-[0_4px_16px_rgba(13,148,136,0.25)] transition-all"
              >
                <span aria-hidden>→</span>
                Configure rotation & plan schedule
              </button>
            ) : (
              <Link
                href={`/rotation/${meeting.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0d9488] text-white text-[0.88rem] border-0 font-medium hover:bg-[#0f766e] hover:shadow-[0_4px_16px_rgba(13,148,136,0.25)] transition-all"
              >
                <span aria-hidden>→</span>
                Configure rotation & plan schedule
              </Link>
            )}
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
