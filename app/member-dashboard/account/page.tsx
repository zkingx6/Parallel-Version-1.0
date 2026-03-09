"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getMemberDashboardData, updateMemberProfile } from "@/lib/actions"
import { setCachedMember } from "@/lib/member-avatar-cache"
import { MemberTopNav } from "@/components/parallel/member-top-nav"
import { PageBackLink } from "@/components/ui/page-back-link"
import { SignOutButton } from "@/components/ui/sign-out-button"
import { ChangePasswordModal } from "@/components/account/change-password-modal"
import { SignOutConfirmModal } from "@/components/account/sign-out-confirm-modal"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type MemberData = {
  meeting: { id: string; title: string }
  member: { id: string; name: string; avatar_url?: string | null; updated_at?: string }
  memberDisplay: { name: string; avatarUrl: string }
  memberEmail?: string | null
}

export default function MemberAccountPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const memberId = searchParams.get("memberId")

  const [data, setData] = useState<MemberData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)

  useEffect(() => {
    if (!token || !memberId) return
    getMemberDashboardData(token, memberId).then((result) => {
      if (result.error) setError(result.error)
      else if (result.data) {
        const d = result.data as MemberData
        setData(d)
        setCachedMember(token, memberId, {
          name: d.memberDisplay.name,
          avatar_url: d.memberDisplay.avatarUrl,
          updated_at: undefined,
        })
      }
    })
  }, [token, memberId])

  if (!token || !memberId) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
            Parallel
          </h1>
          <p className="text-[0.88rem] text-[#9ca3af]">Missing token or member ID.</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
            Parallel
          </h1>
          <p className="text-[0.88rem] text-[#9ca3af]">{error}</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <p className="text-[0.88rem] text-[#9ca3af]">Loading…</p>
      </main>
    )
  }

  const { meeting, member, memberDisplay } = data
  const baseParams = `token=${encodeURIComponent(token ?? "")}&memberId=${encodeURIComponent(member.id)}`
  const teamUrl = `/member-dashboard?${baseParams}`
  const scheduleUrl = `/member-dashboard?${baseParams}&tab=schedule`
  const accountUrl = `/member-dashboard/account?${baseParams}`

  const initials = memberDisplay.name
    ? memberDisplay.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData(e.currentTarget)
      if (avatarRemoved) fd.set("removeAvatar", "1")
      const res = await updateMemberProfile(token!, memberId!, fd)
      if (res.error) throw new Error(res.error)
      setEditOpen(false)
      setAvatarPreview(null)
      setAvatarRemoved(false)
      setSuccessMessage("Profile updated.")
      getMemberDashboardData(token!, memberId!).then((r) => {
        if (r.data) {
          const d = r.data as MemberData
          setData(d)
          setCachedMember(token!, memberId!, {
            name: d.memberDisplay.name,
            avatar_url: d.memberDisplay.avatarUrl,
            updated_at: undefined,
          })
        }
      })
      router.refresh()
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <MemberTopNav
        memberName={memberDisplay.name}
        memberAvatarUrl={memberDisplay.avatarUrl || undefined}
        meetingTitle={meeting.title}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="team"
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <PageBackLink onClick={() => router.back()} className="mb-6">Back</PageBackLink>

          <h2 className="text-[1.6rem] text-[#1a1a2e] tracking-[-0.03em] font-semibold">
            Account
          </h2>
          <p className="text-[#9ca3af] text-[0.88rem] mt-1 mb-10">
            Manage your profile and identity.
          </p>

          <section className="rounded-xl border border-[#edeef0] bg-white p-5 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <h3 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Profile</h3>
          {successMessage && (
            <p className="text-[0.88rem] text-[#0d9488] mb-4">
              {successMessage}
            </p>
          )}
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              {(avatarPreview || memberDisplay.avatarUrl?.trim()) ? (
                <AvatarImage
                  src={avatarPreview || memberDisplay.avatarUrl || ""}
                  alt=""
                />
              ) : null}
              <AvatarFallback className="text-base" delayMs={(avatarPreview || memberDisplay.avatarUrl?.trim()) ? 600 : 0}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[0.88rem] font-medium text-[#1a1a2e] truncate">{memberDisplay.name || "—"}</p>
              <p className="text-[0.88rem] text-[#9ca3af] truncate">
                {data.memberEmail ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null)
                setAvatarPreview(null)
                setAvatarRemoved(false)
                setEditOpen(true)
              }}
              className="text-[0.84rem] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors shrink-0 cursor-pointer"
            >
              Edit profile
            </button>
          </div>
        </section>

        <p className="text-[0.82rem] text-[#9ca3af] mb-6">
          Role: Member
        </p>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
            </DialogHeader>
            <form
              id="member-edit-profile-form"
              encType="multipart/form-data"
              onSubmit={handleSave}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="member-display-name"
                  className="block text-sm font-medium mb-1.5"
                >
                  Display name
                </label>
                <Input
                  id="member-display-name"
                  name="displayName"
                  defaultValue={memberDisplay.name}
                  placeholder="Your name"
                  required
                  disabled={saving}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Avatar</label>
                <div className="flex items-center gap-4 mt-2">
                  <Avatar className="size-14 shrink-0">
                    {(avatarPreview || (memberDisplay.avatarUrl?.trim() && !avatarRemoved)) ? (
                      <AvatarImage
                        src={avatarPreview || memberDisplay.avatarUrl || ""}
                        alt=""
                      />
                    ) : null}
                    <AvatarFallback className="text-base" delayMs={(avatarPreview || (memberDisplay.avatarUrl?.trim() && !avatarRemoved)) ? 600 : 0}>
                      {memberDisplay.name ? memberDisplay.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    name="avatar"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={saving}
                    className="w-full"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setAvatarPreview(URL.createObjectURL(f))
                        setAvatarRemoved(false)
                      } else {
                        setAvatarPreview(null)
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, GIF, or WebP. Optional.
                </p>
                {(memberDisplay.avatarUrl?.trim() || avatarPreview) && !avatarRemoved ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setAvatarPreview(null)
                      setAvatarRemoved(true)
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-2"
                  >
                    Remove avatar
                  </button>
                ) : avatarRemoved ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setAvatarRemoved(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
                  >
                    Undo
                  </button>
                ) : null}
              </div>
              <DialogFooter showCloseButton={false}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <section className="rounded-xl border border-[#edeef0] bg-white p-5 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <h3 className="text-[0.92rem] text-[#1a1a2e] font-semibold mb-4">Security</h3>
          <div className="space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="text-[0.88rem] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors cursor-pointer"
              >
                Change password
              </button>
            </div>
            <div>
              <SignOutButton onClick={() => setSignOutConfirmOpen(true)} />
            </div>
          </div>
        </section>

        <ChangePasswordModal
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
          userEmail={data.memberEmail ?? ""}
          hasSession={false}
        />
        <SignOutConfirmModal
          open={signOutConfirmOpen}
          onOpenChange={setSignOutConfirmOpen}
          onConfirm={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/"
            }
          }}
        />
        </div>
      </main>
    </div>
  )
}
