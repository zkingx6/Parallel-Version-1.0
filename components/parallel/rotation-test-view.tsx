"use client"

import type { DbMeeting, DbMemberSubmission } from "@/lib/database.types"
import { PageBackLink } from "@/components/ui/page-back-link"

/**
 * TEST-ONLY: Per-member rotation view.
 * Minimal stub for /rotation/[id]/test route.
 */
export function RotationTestView({
  meeting,
  members,
}: {
  meeting: DbMeeting
  members: DbMemberSubmission[]
}) {
  return (
    <div className="space-y-6 p-6">
      <PageBackLink href={`/rotation/${meeting.id}`}>Back</PageBackLink>
      <h1 className="text-xl font-semibold">Test: {meeting.title}</h1>
      <p className="text-muted-foreground text-sm">
        {members.length} member{members.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}
