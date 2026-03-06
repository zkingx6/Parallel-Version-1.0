import Link from "next/link"
import { createServerSupabase } from "@/lib/supabase-server"
import { ensureDefaultTemplate } from "@/lib/availability"
import { AvailabilityEditor } from "./editor"

export default async function AvailabilityDefaultPage() {
  const supabase = await createServerSupabase()
  const template = await ensureDefaultTemplate(supabase)

  return (
    <main className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-12 pb-8">
      <Link
        href="/availability"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <span aria-hidden>←</span>
        Back to Availability
      </Link>

      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Edit {template.name}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground mb-8">
        Set your working days and hours. These will be used as your default
        availability for meetings.
      </p>

      <AvailabilityEditor
        initialTimezone={template.timezone}
        initialWeeklyHours={template.weekly_hours}
        initialWeeklyHardNo={template.weekly_hard_no}
      />
    </main>
  )
}
