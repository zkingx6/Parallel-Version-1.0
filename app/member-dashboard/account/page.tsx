"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { getMemberDashboardData, updateMemberProfile } from "@/lib/actions"
import { setCachedMember } from "@/lib/member-avatar-cache"
import { MemberTopNav } from "@/components/parallel/member-top-nav"
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

  useEffect(() => {
    if (!token || !memberId) return
    getMemberDashboardData(token, memberId).then((result) => {
      if (result.error) setError(result.error)
      else if (result.data) {
        const d = result.data as MemberData
        setData(d)
        setCachedMember(token, memberId, {
          name: d.member.name,
          avatar_url: d.member.avatar_url,
          updated_at: d.member.updated_at,
        })
      }
    })
  }, [token, memberId])

  if (!token || !memberId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[17px] font-semibold tracking-tight text-primary">
            Parallel
          </h1>
          <p className="text-sm text-muted-foreground">Missing token or member ID.</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-[17px] font-semibold tracking-tight text-primary">
            Parallel
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  const { meeting, member } = data
  const baseParams = `token=${encodeURIComponent(token ?? "")}&memberId=${encodeURIComponent(member.id)}`
  const teamUrl = `/member-dashboard?${baseParams}`
  const scheduleUrl = `/member-dashboard?${baseParams}&tab=schedule`
  const accountUrl = `/member-dashboard/account?${baseParams}`

  const initials = member.name
    ? member.name
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
      const res = await updateMemberProfile(token!, memberId!, fd)
      if (res.error) throw new Error(res.error)
      setEditOpen(false)
      setSuccessMessage("Profile updated.")
      getMemberDashboardData(token!, memberId!).then((r) => {
        if (r.data) {
          const d = r.data as MemberData
          setData(d)
          setCachedMember(token!, memberId!, {
            name: d.member.name,
            avatar_url: d.member.avatar_url,
            updated_at: d.member.updated_at,
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
    <div className="min-h-screen bg-background">
      <MemberTopNav
        memberName={member.name}
        memberAvatarUrl={
          member.avatar_url
            ? `${member.avatar_url}?v=${member.updated_at ?? ""}`
            : ""
        }
        meetingTitle={meeting.title}
        teamUrl={teamUrl}
        scheduleUrl={scheduleUrl}
        accountUrl={accountUrl}
        activeTab="team"
      />

      <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <span aria-hidden>←</span>
          Back
        </button>

        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Account
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground mb-10">
          Manage your profile and identity.
        </p>

        <section className="rounded-xl border border-border/50 bg-card p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Profile</h3>
          {successMessage && (
            <p className="text-sm text-green-600 dark:text-green-500 mb-4">
              {successMessage}
            </p>
          )}
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              {(avatarPreview || member.avatar_url) ? (
                <AvatarImage
                  src={
                    avatarPreview ||
                    (member.avatar_url
                      ? `${member.avatar_url}?v=${member.updated_at ?? ""}`
                      : "")
                  }
                  alt=""
                />
              ) : null}
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.name || "—"}</p>
              <p className="text-sm text-muted-foreground truncate">
                Member of {meeting.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null)
                setAvatarPreview(null)
                setEditOpen(true)
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              Edit profile
            </button>
          </div>
        </section>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
            </DialogHeader>
            <form
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
                  defaultValue={member.name}
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
                    {(avatarPreview || member.avatar_url) ? (
                      <AvatarImage
                        src={
                          avatarPreview ||
                          (member.avatar_url
                            ? `${member.avatar_url}?v=${member.updated_at ?? ""}`
                            : "")
                        }
                        alt=""
                      />
                    ) : null}
                    <AvatarFallback className="text-base">
                      {member.name ? member.name[0].toUpperCase() : "?"}
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
                      if (f) setAvatarPreview(URL.createObjectURL(f))
                      else setAvatarPreview(null)
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, GIF, or WebP. Optional.
                </p>
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
      </main>
    </div>
  )
}
