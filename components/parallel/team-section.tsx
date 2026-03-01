"use client"

import { useState } from "react"
import { TeamMember } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

function MemberEditDialog({
  member,
  onSave,
  trigger,
}: {
  member: TeamMember
  onSave: (updated: TeamMember) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(member)

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) setDraft(member)
  }

  const handleSave = () => {
    onSave(draft)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Role
            </label>
            <Input
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                City
              </label>
              <Input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Timezone
              </label>
              <Input
                value={draft.timezone}
                onChange={(e) =>
                  setDraft({ ...draft, timezone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Work starts
              </label>
              <Input
                value={draft.workingHoursStart}
                onChange={(e) =>
                  setDraft({ ...draft, workingHoursStart: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Work ends
              </label>
              <Input
                value={draft.workingHoursEnd}
                onChange={(e) =>
                  setDraft({ ...draft, workingHoursEnd: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemberRow({
  member,
  onEdit,
}: {
  member: TeamMember
  onEdit: (updated: TeamMember) => void
}) {
  return (
    <div className="group flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
          {member.initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{member.name}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {member.role}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          <span>{member.city}</span>
          <span className="mx-1.5 text-border">·</span>
          <span>{member.timezone}</span>
          <span className="mx-1.5 text-border hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            {member.workingHoursStart} – {member.workingHoursEnd}
          </span>
        </div>
      </div>

      <MemberEditDialog
        member={member}
        onSave={onEdit}
        trigger={
          <button className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 px-2 py-1 -mr-2">
            Edit
          </button>
        }
      />
    </div>
  )
}

export function TeamSection({
  team,
  onEditMember,
}: {
  team: TeamMember[]
  onEditMember: (updated: TeamMember) => void
}) {
  const uniqueTimezones = new Set(team.map((m) => m.utcOffset)).size

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Your Team
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {team.length} members across {uniqueTimezones} time zones
        </p>
      </div>

      <div className="divide-y divide-border/60">
        {team.map((member) => (
          <MemberRow key={member.id} member={member} onEdit={onEditMember} />
        ))}
      </div>
    </section>
  )
}
